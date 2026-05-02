import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { getTemplateFields, validateTemplate } from '../../../../lib/templates';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CURRENT_MODEL = 'gpt-5.4';
const WEB_SEARCH_MODEL = process.env.OPENAI_WEB_SEARCH_MODEL || 'gpt-5';

const TRUSTED_MEDICAL_DOMAINS = [
  'kaypahoito.fi',
  'terveyskirjasto.fi',
  'thl.fi',
  'fimea.fi',
  'hus.fi',
  'duodecimlehti.fi',
  'laakarilehti.fi',
  'eular.org',
  'escardio.org',
  'ersnet.org',
  'uroweb.org',
  'easl.eu',
  'efort.org',
  'esska.org',
  'esmo.org',
  'ean.org',
];

const ALLOWED_MODES = [
  'create_from_sample',
  'transform_instruction',
  'improve_template',
  'validate_and_explain',
  'create_base_template_from_topic',
] as const;

type TemplateAiMode = typeof ALLOWED_MODES[number];
type UiLanguage = 'fi' | 'ru' | 'en';

type AllowedSource = {
  title: string;
  url?: string;
  sourceType?: string;
  excerpt?: string;
  usedFor?: string;
};

type TemplateAiRequest = {
  mode?: TemplateAiMode;
  uiLanguage?: UiLanguage;
  currentTemplate?: string;
  selectedText?: string;
  userInstruction?: string;
  sampleText?: string;
  topic?: string;
  clinicalContext?: 'terveysasema' | 'paivystys' | 'vuodeosasto' | 'general';
  allowedSources?: AllowedSource[];
  allowGeneralTechnicalSkeleton?: boolean;
};

type TemplateAiResponse = {
  ok: boolean;
  status: 'ok' | 'needs_sources' | 'invalid_request' | 'ai_error';
  mode: TemplateAiMode;
  summary: string;
  templateTitle?: string;
  templateCategory?: string;
  templateText: string;
  fields: unknown[];
  usedSources: AllowedSource[];
  limitations: string[];
  warnings: string[];
  validation: {
    ok: boolean;
    errors: string[];
    warnings: string[];
  };
};

function isMode(value: unknown): value is TemplateAiMode {
  return typeof value === 'string' && ALLOWED_MODES.includes(value as TemplateAiMode);
}

function normalizeLanguage(value: unknown): UiLanguage {
  if (value === 'ru' || value === 'en' || value === 'fi') return value;
  return 'fi';
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function safeJsonParse(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/```json\s*([\s\S]*?)```/i) || raw.match(/```\s*([\s\S]*?)```/i);
    if (match?.[1]) {
      return JSON.parse(match[1]);
    }
    throw new Error('AI response was not valid JSON.');
  }
}

function buildSystemPrompt(mode: TemplateAiMode) {
  const basePrompt = `You are an AI assistant for dr.kapustin.fi / Lääkärin Työpöytä.

Your task is to create and edit Finnish clinical documentation templates.

Critical rules:
- Return valid JSON only. No markdown.
- The clinical template content must always be in Finnish.
- UI explanation fields may follow the requested uiLanguage.
- Do not save anything. You only return a suggestion.
- Do not invent patient facts.
- Do not diagnose the patient.
- Do not include guideline citations inside templateText. Sources must be returned separately in usedSources.
- Technical field names must use lowercase Latin letters, numbers and underscore only: /^[a-z0-9_]+$/.
- Prefer concise Finnish clinical wording suitable for potilaskertomus.
- Use the project template syntax:
  {{field}}
  {{field:input}}
  {{field:textarea}}
  {{field:select:option1|option2|option3}}
  {{field:radio:option1|option2|option3}}
  {{field:multiselect:option1|option2|option3}}
  {{field:checkbox}}
  {{field:date}}
  {{field:number}}
  {{field:textarea:showIf:other_field=value}}
  {{field:textarea:showIfAny:other_field=value1|value2}}
  {{field:textarea:showIfIncludes:multiselect_field=value}}
  {{field:textarea:showIfNot:other_field=value}}
  {{field:textarea:showIfEmpty:other_field}}
  {{field:textarea:showIfNotEmpty:other_field}}
- Optional metadata is allowed:
  :label:Visible label
  :default:value
  :placeholder:value
  :required
- Use | as the preferred option separator.
- Use input for short values, textarea for free clinical text, radio/select for one choice, multiselect for multiple symptoms/findings, date for dates, number for numeric values.

Return this JSON shape:
{
  "ok": true,
  "status": "ok",
  "summary": "...",
  "templateTitle": "...",
  "templateCategory": "...",
  "templateText": "...",
  "usedSources": [],
  "limitations": [],
  "warnings": []
}`;

  if (mode !== 'create_base_template_from_topic') return basePrompt;

  return `${basePrompt}

Additional rules for mode create_base_template_from_topic:
- This mode creates a base clinical template from a topic.
- Search and use only Finnish or European professional/official medical sources from the configured trusted domain allow-list.
- Priority: Käypä hoito, THL, Fimea, HUS / official Finnish wellbeing service county instructions, Duodecim / Terveyskirjasto / Lääkärikirja Duodecim, then European professional guidelines.
- Do not rely on uncited memory for medical recommendations.
- If no relevant source is found, return ok=false, status="needs_sources", templateText="", and explain that trusted sources could not be found.
- If allowGeneralTechnicalSkeleton is true and no relevant source is found, create only a neutral technical documentation structure without medical recommendations, and clearly add this limitation.
- Never fabricate usedSources. usedSources must reflect searched source pages.
- Do not include links in templateText. Put sources only in usedSources.`;
}

function buildUserPayload(body: TemplateAiRequest) {
  return JSON.stringify({
    mode: body.mode,
    uiLanguage: normalizeLanguage(body.uiLanguage),
    currentTemplate: body.currentTemplate || '',
    selectedText: body.selectedText || '',
    userInstruction: body.userInstruction || '',
    sampleText: body.sampleText || '',
    topic: body.topic || '',
    clinicalContext: body.clinicalContext || 'terveysasema',
    allowedSources: Array.isArray(body.allowedSources) ? body.allowedSources : [],
    allowGeneralTechnicalSkeleton: Boolean(body.allowGeneralTechnicalSkeleton),
    trustedDomains: TRUSTED_MEDICAL_DOMAINS,
  });
}

function normalizeAiResponse(
  parsed: any,
  mode: TemplateAiMode,
  fallbackSources: AllowedSource[],
): TemplateAiResponse {
  const templateText = typeof parsed?.templateText === 'string' ? parsed.templateText : '';
  const validation = validateTemplate(templateText);
  const fields = templateText ? getTemplateFields(templateText) : [];
  const usedSources = Array.isArray(parsed?.usedSources) ? parsed.usedSources : [];
  const limitations = Array.isArray(parsed?.limitations) ? parsed.limitations.map(String) : [];
  const warnings = Array.isArray(parsed?.warnings) ? parsed.warnings.map(String) : [];

  const filteredSources = usedSources.filter((source: AllowedSource) => {
    if (!source || typeof source.title !== 'string') return false;
    if (!source.url) return true;
    try {
      const host = new URL(source.url).hostname.replace(/^www\./, '');
      return TRUSTED_MEDICAL_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
    } catch {
      return fallbackSources.some((fallback) => fallback.title === source.title);
    }
  });

  const parsedStatus = parsed?.status === 'needs_sources' ? 'needs_sources' : validation.ok ? 'ok' : 'invalid_request';

  return {
    ok: Boolean(parsed?.ok) && validation.ok,
    status: parsedStatus,
    mode,
    summary: typeof parsed?.summary === 'string' ? parsed.summary : '',
    templateTitle: typeof parsed?.templateTitle === 'string' ? parsed.templateTitle : undefined,
    templateCategory: typeof parsed?.templateCategory === 'string' ? parsed.templateCategory : undefined,
    templateText,
    fields,
    usedSources: filteredSources,
    limitations,
    warnings: [
      ...warnings,
      ...validation.warnings.map((issue) => issue.message),
    ],
    validation: {
      ok: validation.ok,
      errors: validation.errors.map((issue) => issue.message),
      warnings: validation.warnings.map((issue) => issue.message),
    },
  };
}

function validateRequest(body: TemplateAiRequest) {
  if (!isMode(body.mode)) return 'Invalid or missing mode.';

  if (body.mode === 'create_from_sample' && !body.sampleText?.trim()) {
    return 'sampleText is required for create_from_sample.';
  }

  if (body.mode === 'transform_instruction' && !body.userInstruction?.trim()) {
    return 'userInstruction is required for transform_instruction.';
  }

  if (body.mode === 'improve_template' && !body.currentTemplate?.trim()) {
    return 'currentTemplate is required for improve_template.';
  }

  if (body.mode === 'validate_and_explain' && !body.currentTemplate?.trim()) {
    return 'currentTemplate is required for validate_and_explain.';
  }

  if (body.mode === 'create_base_template_from_topic' && !body.topic?.trim()) {
    return 'topic is required for create_base_template_from_topic.';
  }

  return null;
}

function getResponseOutputText(response: any) {
  if (typeof response?.output_text === 'string') return response.output_text;

  const message = response?.output?.find((item: any) => item?.type === 'message');
  const textPart = message?.content?.find((item: any) => item?.type === 'output_text' || item?.type === 'text');
  return textPart?.text || '{}';
}

async function createBaseTemplateWithTrustedWebSearch(body: TemplateAiRequest) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: WEB_SEARCH_MODEL,
      reasoning: { effort: 'low' },
      tools: [
        {
          type: 'web_search',
          filters: {
            allowed_domains: TRUSTED_MEDICAL_DOMAINS,
          },
        },
      ],
      tool_choice: 'auto',
      include: ['web_search_call.action.sources'],
      text: { format: { type: 'json_object' } },
      input: [
        {
          role: 'system',
          content: buildSystemPrompt('create_base_template_from_topic'),
        },
        {
          role: 'user',
          content: buildUserPayload(body),
        },
      ],
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || 'OpenAI web search request failed.');
  }

  const raw = getResponseOutputText(data);
  const parsed = safeJsonParse(raw);
  return normalizeAiResponse(parsed, 'create_base_template_from_topic', []);
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return jsonError('Unauthorized', 401);
    }

    if (!process.env.OPENAI_API_KEY) {
      return jsonError('OPENAI_API_KEY is not configured.', 500);
    }

    const body = await req.json() as TemplateAiRequest;
    const requestError = validateRequest(body);
    if (requestError || !isMode(body.mode)) {
      return jsonError(requestError || 'Invalid mode.', 400);
    }

    const allowedSources = Array.isArray(body.allowedSources) ? body.allowedSources : [];

    if (body.mode === 'create_base_template_from_topic' && allowedSources.length === 0) {
      const normalized = await createBaseTemplateWithTrustedWebSearch(body);
      return NextResponse.json(normalized);
    }

    const response = await openai.chat.completions.create({
      model: CURRENT_MODEL,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildSystemPrompt(body.mode) },
        { role: 'user', content: buildUserPayload(body) },
      ],
    });

    const raw = response.choices[0]?.message?.content || '{}';
    const parsed = safeJsonParse(raw);
    const normalized = normalizeAiResponse(parsed, body.mode, allowedSources);

    return NextResponse.json(normalized);
  } catch (error: any) {
    console.error('Template AI Error:', error?.message || error);
    const mode = 'create_from_sample' as TemplateAiMode;
    const response: TemplateAiResponse = {
      ok: false,
      status: 'ai_error',
      mode,
      summary: 'AI assistant failed to process the request.',
      templateText: '',
      fields: [],
      usedSources: [],
      limitations: [],
      warnings: [],
      validation: { ok: false, errors: [error?.message || 'Unknown error'], warnings: [] },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
