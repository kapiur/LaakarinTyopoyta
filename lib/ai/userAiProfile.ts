export type UserAiProfileRecord = {
  id?: string;
  userId?: number;
  role?: string | null;
  specialty?: string | null;
  workplace?: string | null;
  experienceLevel?: string | null;
  defaultClinicalContext?: string | null;
  preferredStructure?: string | null;
  detailLevel?: string | null;
  writingStyle?: string | null;
  permanentInstructions?: string | null;
  avoidInstructions?: string | null;
  styleSummary?: string | null;
  useProfileByDefault?: boolean | null;
};

export type AiProfileMode = 'none' | 'styleOnly' | 'workContextOnly' | 'full';
export type UserAiProfileLocaleContext = {
  clinicalCountry?: string | null;
  clinicalOutputLanguage?: string | null;
};

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function line(label: string, value: unknown) {
  const text = clean(value);
  return text ? `- ${label}: ${text}` : '';
}

export function normalizeAiProfileMode(value: unknown): AiProfileMode {
  if (value === 'none' || value === 'styleOnly' || value === 'workContextOnly' || value === 'full') {
    return value;
  }

  return 'full';
}

export function defaultProfileModeForTool(mode?: string | null): AiProfileMode {
  if (!mode) return 'full';
  if (mode === 'labrat') return 'none';
  if (mode === 'translate') return 'styleOnly';
  if (mode === 'fix') return 'styleOnly';
  if (mode === 'summarize') return 'full';
  return 'full';
}

export function buildUserAiProfileInstruction(
  profile?: UserAiProfileRecord | null,
  mode: AiProfileMode = 'full',
  localeContext?: UserAiProfileLocaleContext,
) {
  if (!profile || profile.useProfileByDefault === false || mode === 'none') return '';

  const workContextRows = [
    line('Ammattirooli', profile.role),
    line('Erikoisala / työalue', profile.specialty),
    line('Työympäristö', profile.workplace),
    line('Kokemustaso', profile.experienceLevel),
    line('Oletuskliininen konteksti', profile.defaultClinicalContext),
  ];

  const styleRows = [
    line('Toivottu rakenne', profile.preferredStructure),
    line('Yksityiskohtaisuuden taso', profile.detailLevel),
    line('Kirjoitustyyli', profile.writingStyle),
    line('Pysyvät käyttäjäohjeet', profile.permanentInstructions),
    line('Vältettävät asiat', profile.avoidInstructions),
    line('Tyyliyhteenveto', profile.styleSummary),
  ];

  const rows = [
    ...(mode === 'full' || mode === 'workContextOnly' ? workContextRows : []),
    ...(mode === 'full' || mode === 'styleOnly' ? styleRows : []),
  ].filter(Boolean);

  if (rows.length === 0) return '';

  const modeInstruction = mode === 'styleOnly'
    ? 'Käytä profiilista vain kirjoitustyyliä, rakennetta, tiiviyttä ja pysyviä muotoiluohjeita. Älä anna työroolin muuttaa kliinistä sisältöä.'
    : mode === 'workContextOnly'
      ? 'Käytä profiilista vain työroolia ja kliinistä toimintaympäristöä. Älä jäljittele henkilökohtaista kirjoitustyyliä.'
      : 'Käytä profiilia sekä työskentelykontekstin että kirjoitustyylin mukauttamiseen.';

  const clinicalLanguage = clean(localeContext?.clinicalOutputLanguage);
  const clinicalCountry = clean(localeContext?.clinicalCountry);

  return `
Käyttäjän henkilökohtainen AI-profiili:
${rows.join('\n')}

${modeInstruction}
Noudata käyttäjän profiilia silloin, kun se auttaa tekstin muotoilussa, tiiviydessä, rakenteessa tai kliinisessä työskentelykontekstissa.
Älä lisää kliinisiä tietoja, joita käyttäjä ei ole antanut.
Kliininen lopputeksti, potilaskertomusteksti, lähetteet ja mallit kirjoitetaan työtilan kieli- ja maavalintojen${clinicalLanguage ? ` (${clinicalLanguage})` : ''}${clinicalCountry ? ` sekä valitun kliinisen maan (${clinicalCountry})` : ''}, tehtäväkohtaisen ohjauksen ja käyttäjän nimenomaisen kielipyynnön mukaan.
`;
}

export function withUserAiProfileInstruction(systemPrompt: string, profileInstruction: string) {
  return profileInstruction ? `${profileInstruction}\n\n${systemPrompt}` : systemPrompt;
}
