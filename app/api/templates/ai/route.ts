import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';
import { getTemplateFields, validateTemplate } from '../../../../lib/templates';
import { mergeAnonymizationResults } from '../../../../lib/privacy/anonymizePatientText';
import { preparePrivacyPayload } from '../../../../lib/privacy/gateway';
import { hasCriticalPrivacyFindingTypes } from '../../../../lib/privacy/gateway/decision';
import { sanitizeJsonValue } from '../../../../lib/privacy/structured/sanitizeJsonValue';
import {
  buildUserAiProfileInstruction,
  withUserAiProfileInstruction,
  type UserAiProfileRecord,
} from '../../../../lib/ai/userAiProfile';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
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
  privacy?: {
    anonymized: boolean;
    findingTypes: string[];
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

function buildPrivacyBlockReply() {
  return 'Tekstissä havaittiin tai siihen jäi automaattisen anonymisoinnin jälkeen tunnistetietoja, joita ei voida lähettää AI-käsittelyyn turvallisesti. Poista nimi-, yhteys-, tunniste- ja osoitetiedot ja yritä uudelleen.';
}

function buildPrivacyOutputBlockReply() {
  return 'AI-vastaus sisälsi henkilötietoihin viittaavia tietoja, joten sitä ei näytetä turvallisuussyistä. Muokkaa pyyntöä yleisemmäksi ilman tunnistetietoja ja yritä uudelleen.';
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
    if (match?.[1]) return JSON.parse(match[1]);
    throw new Error(`AI response was not valid JSON: ${truncateForError(raw)}`);
  }
}

async function getUserAiProfile(userId: number) {
  try {
    const rows = await prisma.$queryRaw<UserAiProfileRecord[]>`
      SELECT
        "role", "specialty", "workplace", "experienceLevel", "defaultClinicalContext",
        "preferredStructure", "detailLevel", "writingStyle", "permanentInstructions",
        "avoidInstructions", "styleSummary", "useProfileByDefault"
      FROM "UserAiProfile"
      WHERE "userId" = ${userId}
      LIMIT 1
    `;
    return rows[0] ?? null;
  } catch (error) {
    console.error('Template AI profile loading failed:', error);
    return null;
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
- Do not mention anonymization, privacy placeholders or server-side sanitization in the response.
- If the input contains privacy placeholders such as [NAME], [HETU], [DATE], [PHONE], [EMAIL], treat them as generic anonymized details and do not explain them.
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

  if (mode === 'improve_template' || mode === 'transform_instruction') {
    return `${basePrompt}

Additional rules for editing an existing template:
- If currentTemplate is provided, preserve the existing template as much as possible.
- Do not rewrite the entire template unless the user explicitly asks for a full rewrite.
- Apply only the requested change or improvement.
- Preserve existing field names, options and showIf logic unless the user asks to change them or they are clearly invalid.
- Preserve the user's Finnish clinical writing style and structure when possible.
- If the user instruction is vague, make the smallest safe improvement and explain it briefly in summary.
- Return the full updated templateText, not a diff.`;
  }

  if (mode === 'create_from_sample') {
    return `${basePrompt}

Additional rules for creating a template from a sample:
- Convert the sample into a reusable interactive Finnish template.
- Replace case-specific facts with suitable fields.
- Do not preserve any patient-identifying details.
- Preserve clinically useful structure and writing style.
- Prefer practical fields that a physician can fill quickly.`;
  }

  if (mode !== 'create_base_template_from_topic') return basePrompt;

  return `${basePrompt}

Additional rules for mode create_base_template_from_topic:
- This mode creates a base clinical documentation template from a topic.
- Base the clinical content primarily on trusted Finnish and European medical recommendations.
- Prioritize: Käypä hoito, Terveyskirjasto / Duodecim, THL, Fimea, HUS / official Finnish wellbeing service county instructions, and European professional guidelines when applicable.
- Sources are NOT expected to contain ready-made templates.
- Use trusted recommendations as the clinical evidence/checklist basis for deciding what the physician should ask, examine, assess and document.
- Do not use non-medical, commercial, marketing, patient forum, blog or social media sources.
- Do not copy source text. Convert source-based clinical requirements into a practical Finnish primary-care template.
- Internally derive a clinical checklist: anamnesis, symptom characterization, duration, severity, functional impact, risk factors, medication/context factors, status, red flags, investigations/referral/follow-up and practical plan fields.
- Convert that checklist into an interactive Lääkärin Työpöytä template using radio/select/multiselect/checkbox/date/number/textarea and showIf rules.
- Include ordinary normal-findings options and abnormal findings options where clinically useful.
- Use conditional fields to avoid clutter.
- The final templateText must be usable directly as a Finnish physician note template.
- The template should usually include: Tulosyy, Esitiedot/anamneesi, Oireen kuvaus, Riskitekijät/context, Status, Hälytysmerkit, Arvio, Suunnitelma.
- Do not include links in templateText. Put sources only in usedSources.`;
}

function sanitizeRequest(body: TemplateAiRequest) {
  const textGateway = preparePrivacyPayload([
    { key: 'sampleText', value: body.sampleText || '', mode: 'persistentSample' },
    { key: 'selectedText', value: body.selectedText || '', mode: 'persistentSample' },
    { key: 'userInstruction', value: body.userInstruction || '', mode: 'generalText' },
    { key: 'currentTemplate', value: body.currentTemplate || '', mode: 'clinicalTransform' },
    { key: 'topic', value: body.topic || '', mode: 'generalText' },
  ]);
  const allowedSources = sanitizeJsonValue(Array.isArray(body.allowedSources) ? body.allowedSources : [], {
    defaultMode: 'chat',
    modeForPath(path) {
      const key = path[path.length - 1];
      if (key === 'url' || key === 'sourceType') return null;
      if (key === 'excerpt') return 'clinicalTransform';
      return 'chat';
    },
  });
  const allowedSourcesGateway = preparePrivacyPayload([
    {
      key: 'allowedSourcesPayload',
      value: JSON.stringify(allowedSources.value),
      mode: 'clinicalBuilder',
    },
  ]);
  const findingTypes = Array.from(new Set([
    ...textGateway.privacy.findingTypes,
    ...textGateway.privacy.residualFindingTypes,
    ...allowedSources.anonymization.findingTypes,
    ...allowedSourcesGateway.privacy.findingTypes,
    ...allowedSourcesGateway.privacy.residualFindingTypes,
  ]));
  const blocked = textGateway.privacy.blocked || allowedSourcesGateway.privacy.blocked;

  return {
    body: {
      ...body,
      currentTemplate: textGateway.sanitized.currentTemplate,
      sampleText: textGateway.sanitized.sampleText,
      selectedText: textGateway.sanitized.selectedText,
      userInstruction: textGateway.sanitized.userInstruction,
      topic: textGateway.sanitized.topic,
      allowedSources: allowedSources.value as AllowedSource[],
    },
    privacy: {
      anonymized: textGateway.privacy.anonymized || allowedSources.anonymization.hasFindings || allowedSourcesGateway.privacy.anonymized,
      findingTypes,
      blocked,
    },
  };
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
    expectedWorkflow: 'Create or improve an interactive Finnish clinical template. For existing templates, preserve current structure and only apply the requested changes unless a full rewrite is explicitly requested.',
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
  privacy?: { anonymized: boolean; findingTypes: string[] },
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
    warnings: [...warnings, ...validation.warnings.map((issue) => issue.message)],
    validation: {
      ok: validation.ok,
      errors: validation.errors.map((issue) => issue.message),
      warnings: validation.warnings.map((issue) => issue.message),
    },
    privacy,
  };
}

function validateRequest(body: TemplateAiRequest) {
  if (!isMode(body.mode)) return 'Invalid or missing mode.';
  if (body.mode === 'create_from_sample' && !body.sampleText?.trim()) return 'sampleText is required for create_from_sample.';
  if (body.mode === 'transform_instruction' && !body.userInstruction?.trim()) return 'userInstruction is required for transform_instruction.';
  if (body.mode === 'improve_template' && !body.currentTemplate?.trim()) return 'currentTemplate is required for improve_template.';
  if (body.mode === 'validate_and_explain' && !body.currentTemplate?.trim()) return 'currentTemplate is required for validate_and_explain.';
  if (body.mode === 'create_base_template_from_topic' && !body.topic?.trim()) return 'topic is required for create_base_template_from_topic.';
  return null;
}

async function runTemplateAiCompletion(body: TemplateAiRequest, profileInstruction: string, privacy?: { anonymized: boolean; findingTypes: string[] }) {
  const systemPrompt = withUserAiProfileInstruction(buildSystemPrompt(body.mode as TemplateAiMode), profileInstruction);
  const response = await openai.chat.completions.create({
    model: CURRENT_MODEL,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: buildUserPayload(body) },
    ],
  });

  const raw = response.choices[0]?.message?.content || '{}';
  const parsed = safeJsonParse(raw);
  return normalizeAiResponse(parsed, body.mode as TemplateAiMode, [], privacy);
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = Number((session?.user as any)?.id);
    if (!Number.isFinite(userId)) return jsonError('Unauthorized', 401);
    if (!process.env.OPENAI_API_KEY) return jsonError('OPENAI_API_KEY is not configured.', 500);

    const originalBody = await req.json() as TemplateAiRequest;
    const requestError = validateRequest(originalBody);
    if (requestError || !isMode(originalBody.mode)) return jsonError(requestError || 'Invalid mode.', 400);

    const { body, privacy } = sanitizeRequest(originalBody);
    if (privacy.blocked) {
      return NextResponse.json({
        error: buildPrivacyBlockReply(),
        privacy,
        route: {
          blockedByPrivacyGate: true,
        },
      }, { status: 400 });
    }
    const profile = await getUserAiProfile(userId);
    const profileInstruction = buildUserAiProfileInstruction(profile, 'styleOnly');
    const normalized = await runTemplateAiCompletion(body, profileInstruction, privacy);
    const sanitizedOutput = sanitizeJsonValue(normalized, {
      defaultMode: 'storage',
      modeForPath(path) {
        const key = path[path.length - 1];
        if (
          key === 'ok' ||
          key === 'status' ||
          key === 'mode' ||
          key === 'type' ||
          key === 'verified'
        ) {
          return null;
        }
        return 'storage';
      },
    });
    const outputPrivacy = preparePrivacyPayload([
      {
        key: 'templateResponse',
        value: JSON.stringify(sanitizedOutput.value),
        mode: 'persistentStorage',
      },
    ]);

    if (
      outputPrivacy.privacy.blocked &&
      hasCriticalPrivacyFindingTypes([
        ...outputPrivacy.privacy.findingTypes,
        ...outputPrivacy.privacy.residualFindingTypes,
      ])
    ) {
      return NextResponse.json({
        error: buildPrivacyOutputBlockReply(),
        privacy,
        route: {
          blockedByPrivacyGate: true,
          blockedByOutputPrivacyGate: true,
        },
      }, { status: 400 });
    }

    return NextResponse.json({
      ...(sanitizedOutput.value as TemplateAiResponse),
      route: {
        outputSanitized: sanitizedOutput.anonymization.hasFindings || outputPrivacy.privacy.anonymized,
      },
    });
  } catch (error: any) {
    console.error('Template AI Error:', error?.message || error);
    const response: TemplateAiResponse = {
      ok: false,
      status: 'ai_error',
      mode: 'create_from_sample',
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
