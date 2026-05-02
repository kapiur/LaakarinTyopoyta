import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { getTemplateFields, validateTemplate } from '../../../../lib/templates';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CURRENT_MODEL = 'gpt-5.4';

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

function looksLikeHtml(raw: string) {
  return /^\s*<!doctype html/i.test(raw) || /^\s*<html/i.test(raw) || /^\s*</.test(raw);
}

function truncateForError(raw: string, maxLength = 240) {
  return raw.replace(/\s+/g, ' ').slice(0, maxLength);
}

function safeJsonParse(raw: string) {
  if (looksLikeHtml(raw)) {
    throw new Error(`AI service returned HTML instead of JSON: ${truncateForError(raw)}`);
  }

  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/```json\s*([\s\S]*?)```/i) || raw.match(/```\s*([\s\S]*?)```/i);
    if (match?.[1]) {
      return JSON.parse(match[1]);
    }
    throw new Error(`AI response was not valid JSON: ${truncateForError(raw)}`);
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
- This mode creates a base clinical documentation template from a topic.
- Work like the existing main medical AI chat: base the clinical content primarily on trusted Finnish and European medical recommendations.
- Prioritize: Käypä hoito, Terveyskirjasto / Duodecim, THL, Fimea, HUS / official Finnish wellbeing service county instructions, and European professional guidelines when applicable.
- Sources are NOT expected to contain ready-made templates.
- Use trusted recommendations as the clinical evidence/checklist basis for deciding what the physician should ask, examine, assess and document.
- Do not use non-medical, commercial, marketing, patient forum, blog or social media sources.
- Do not copy source text. Convert source-based clinical requirements into a practical Finnish primary-care template.
- Before writing templateText, internally derive a clinical checklist:
  1) relevant anamnesis and symptom characterization,
  2) duration, severity and functional impact,
  3) risk factors and medication/context factors,
  4) status/examination items that should be documented,
  5) red flags / hälytysmerkit that must not be missed,
  6) findings that should trigger conditional additional fields,
  7) indications for further investigations/referral/follow-up when supported by trusted sources,
  8) practical assessment and plan fields for Finnish primary care.
- Convert that checklist into an interactive Lääkärin Työpöytä template using radio/select/multiselect/checkbox/date/number/textarea and showIf rules.
- Include ordinary normal-findings options and abnormal findings options where clinically useful.
- Use conditional fields to avoid clutter: detailed textarea fields should appear only when a relevant symptom/finding/red flag is selected.
- The final templateText must be usable directly as a Finnish physician note template; it should not be merely a list of recommendations.
- The template should usually include sections or content for: Tulosyy, Esitiedot/anamneesi, Oireen kuvaus, Riskitekijät/context, Status, Hälytysmerkit, Arvio, Suunnitelma.
- If the topic is an examination-only template, emphasize status/examination fields but still include brief indication and relevant red flags.
- If you are unsure about exact source attribution, do not fabricate links. In usedSources, list only reliable source names/URLs you are confident about.
- Do not include links in templateText. Put sources only in usedSources.
- In summary, briefly explain which clinical dimensions were included and why, in the requested UI language if possible.`;
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
    expectedWorkflow: 'Derive a clinical checklist from trusted Finnish/European medical recommendations, then convert that checklist into an interactive Finnish template. Do not search for ready-made templates.',
  });
}

function isTrustedUrl(url: string | undefined) {
  if (!url) return true;
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return TRUSTED_MEDICAL_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

function uniqueSources(sources: AllowedSource[]) {
  const seen = new Set<string>();
  return sources.filter((source) => {
    const key = source.url || source.title;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
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
  const parsedUsedSources = Array.isArray(parsed?.usedSources) ? parsed.usedSources : [];
  const limitations = Array.isArray(parsed?.limitations) ? parsed.limitations.map(String) : [];
  const warnings = Array.isArray(parsed?.warnings) ? parsed.warnings.map(String) : [];

  const filteredSources = uniqueSources([...parsedUsedSources, ...fallbackSources].filter((source: AllowedSource) => {
    if (!source || typeof source.title !== 'string') return false;
    return isTrustedUrl(source.url);
  }));

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

async function runTemplateAiCompletion(body: TemplateAiRequest) {
  const response = await openai.chat.completions.create({
    model: CURRENT_MODEL,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: buildSystemPrompt(body.mode as TemplateAiMode) },
      { role: 'user', content: buildUserPayload(body) },
    ],
  });

  const raw = response.choices[0]?.message?.content || '{}';
  const parsed = safeJsonParse(raw);
  return normalizeAiResponse(parsed, body.mode as TemplateAiMode, []);
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

    const normalized = await runTemplateAiCompletion(body);
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
