import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { DEFAULT_AI_TOOL_PROMPTS } from '../../../../lib/ai/defaultTools';
import { authOptions } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';
import { anonymizePatientText, mergeAnonymizationResults } from '../../../../lib/privacy/anonymizePatientText';
import {
  buildUserAiProfileInstruction,
  defaultProfileModeForTool,
  normalizeAiProfileMode,
  withUserAiProfileInstruction,
  type AiProfileMode,
  type UserAiProfileRecord,
} from '../../../../lib/ai/userAiProfile';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CURRENT_MODEL = 'gpt-5.4';

const PRIVACY_PLACEHOLDER_SYSTEM_PROMPT = `
Privacy placeholders such as [NAME], [HETU], [DATE_OF_BIRTH], [DATE], [PHONE], [EMAIL], [ADDRESS], [PATIENT_ID], [PROFESSIONAL_NAME] and similar bracketed markers are internal server-side privacy markers.
Do not mention, explain, analyze, repeat or give advice about these placeholders or about anonymization.
Do not tell the user that the text was anonymized or sanitized.
Use the already sanitized text normally and complete the user's actual task.
If a placeholder appears inside source text, treat it as a generic person/detail and produce a natural clinical or administrative formulation when possible.
`;

const REFINE_RESULT_SYSTEM_PROMPT = `
Olet kliinisen tekstin viimeistelyavustaja.

Tehtäväsi on muokata jo valmista AI-työkalun tuottamaa tulosta käyttäjän lyhyen tarkennusohjeen perusteella.

Säännöt:
- Älä aloita tekstiä alusta, ellei käyttäjä nimenomaisesti pyydä sitä.
- Muokkaa vain aiempaa tulosta käyttäjän tarkennuksen mukaan.
- Säilytä lääketieteellinen merkitys.
- Säilytä diagnoosit, lääkkeiden nimet, annokset, päivämäärät, mittayksiköt, tutkimustulokset ja kontrollisuunnitelmat, ellei käyttäjä nimenomaisesti pyydä muuttamaan niitä.
- Älä lisää kliinisiä tietoja, joita ei ole alkuperäisessä tekstissä, aiemmassa tuloksessa tai käyttäjän tarkennusohjeessa.
- Älä kommentoi muutoksia erikseen.
- Älä lisää otsikkoa, selityksiä tai markdown-kommentteja, ellei aiemmassa tuloksessa ollut sellaista rakennetta ja se on tarpeen säilyttää.
- Lopullinen kliininen teksti kirjoitetaan suomeksi.
- Palauta vain päivitetty valmis teksti.
`;

function withPrivacyInstruction(systemPrompt: string) {
  return `${PRIVACY_PLACEHOLDER_SYSTEM_PROMPT}\n\n${systemPrompt}`;
}

function applyProfile(systemPrompt: string, profile: UserAiProfileRecord | null, profileMode: AiProfileMode) {
  const profileInstruction = buildUserAiProfileInstruction(profile, profileMode);
  return withUserAiProfileInstruction(systemPrompt, profileInstruction);
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
    console.error('AI profile loading failed for refine:', error);
    return null;
  }
}

async function getToolPromptAndProfileMode(mode: string, userId: number) {
  if (DEFAULT_AI_TOOL_PROMPTS[mode as keyof typeof DEFAULT_AI_TOOL_PROMPTS]) {
    return {
      prompt: DEFAULT_AI_TOOL_PROMPTS[mode as keyof typeof DEFAULT_AI_TOOL_PROMPTS],
      profileMode: defaultProfileModeForTool(mode),
    };
  }

  const rows = await prisma.$queryRaw<Array<{
    prompt: string;
    useUserAiProfile: boolean | null;
    profileMode: string | null;
  }>>`
    SELECT
      "prompt",
      COALESCE("useUserAiProfile", true) AS "useUserAiProfile",
      COALESCE("profileMode", 'full') AS "profileMode"
    FROM "AiTool"
    WHERE "key" = ${mode} AND "userId" = ${userId} AND "scope" = 'USER' AND "isActive" = true
    LIMIT 1
  `;

  const tool = rows[0];
  if (!tool) return null;

  return {
    prompt: tool.prompt,
    profileMode: tool.useUserAiProfile === false ? 'none' as AiProfileMode : normalizeAiProfileMode(tool.profileMode),
  };
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = Number((session?.user as any)?.id);

    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const mode = typeof body?.mode === 'string' ? body.mode : '';
    const originalText = typeof body?.originalText === 'string' ? body.originalText : '';
    const previousResult = typeof body?.previousResult === 'string' ? body.previousResult : '';
    const instruction = typeof body?.instruction === 'string' ? body.instruction : '';

    if (!mode || !originalText.trim() || !previousResult.trim() || !instruction.trim()) {
      return NextResponse.json({ error: 'Puuttuvat tiedot' }, { status: 400 });
    }

    const tool = await getToolPromptAndProfileMode(mode, userId);
    if (!tool) {
      return NextResponse.json({ error: 'AI-työkalua ei löytynyt' }, { status: 404 });
    }

    const userAiProfile = await getUserAiProfile(userId);

    const anonymizedOriginalText = anonymizePatientText(originalText, { mode: 'chat' });
    const anonymizedPreviousResult = anonymizePatientText(previousResult, { mode: 'chat' });
    const anonymizedInstruction = anonymizePatientText(instruction, { mode: 'chat' });
    const anonymizedToolPrompt = anonymizePatientText(tool.prompt, { mode: 'storage' });

    const systemPrompt = withPrivacyInstruction(applyProfile(
      `${REFINE_RESULT_SYSTEM_PROMPT}\n\nAlkuperäisen AI-työkalun system prompt kontekstina. Älä suorita tätä työkalua alusta asti, vaan käytä sitä vain ymmärtääksesi aiemman tuloksen tarkoituksen:\n${anonymizedToolPrompt.sanitizedText}`,
      userAiProfile,
      tool.profileMode,
    ));

    const userContent = `
Alkuperäinen käyttäjän teksti:
${anonymizedOriginalText.sanitizedText}

Aiempi AI-tulos, jota tulee hioa:
${anonymizedPreviousResult.sanitizedText}

Käyttäjän tarkennusohje:
${anonymizedInstruction.sanitizedText}
`;

    const response = await openai.chat.completions.create({
      model: CURRENT_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0,
    });

    const anonymization = mergeAnonymizationResults([
      anonymizedOriginalText,
      anonymizedPreviousResult,
      anonymizedInstruction,
      anonymizedToolPrompt,
    ]);

    return NextResponse.json({
      content: response.choices[0].message.content,
      privacy: {
        anonymized: anonymization.hasFindings,
        findingTypes: anonymization.findingTypes,
      },
    });
  } catch (error: any) {
    console.error('AI refine error:', error.message || error);
    return NextResponse.json({
      error: 'AI-palvelinvirhe',
      details: error.message,
    }, { status: 500 });
  }
}
