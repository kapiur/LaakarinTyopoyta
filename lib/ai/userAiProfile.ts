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

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function line(label: string, value: unknown) {
  const text = clean(value);
  return text ? `- ${label}: ${text}` : '';
}

export function buildUserAiProfileInstruction(profile?: UserAiProfileRecord | null) {
  if (!profile || profile.useProfileByDefault === false) return '';

  const rows = [
    line('Ammattirooli', profile.role),
    line('Erikoisala / työalue', profile.specialty),
    line('Työympäristö', profile.workplace),
    line('Kokemustaso', profile.experienceLevel),
    line('Oletuskliininen konteksti', profile.defaultClinicalContext),
    line('Toivottu rakenne', profile.preferredStructure),
    line('Yksityiskohtaisuuden taso', profile.detailLevel),
    line('Kirjoitustyyli', profile.writingStyle),
    line('Pysyvät käyttäjäohjeet', profile.permanentInstructions),
    line('Vältettävät asiat', profile.avoidInstructions),
    line('Tyyliyhteenveto', profile.styleSummary),
  ].filter(Boolean);

  if (rows.length === 0) return '';

  return `
Käyttäjän henkilökohtainen AI-profiili:
${rows.join('\n')}

Noudata käyttäjän profiilia silloin, kun se auttaa tekstin muotoilussa, tiiviydessä, rakenteessa tai kliinisessä työskentelykontekstissa.
Älä lisää kliinisiä tietoja, joita käyttäjä ei ole antanut.
Kliininen lopputeksti, potilaskertomusteksti, lähetteet ja mallit kirjoitetaan edelleen suomeksi.
`;
}

export function withUserAiProfileInstruction(systemPrompt: string, profileInstruction: string) {
  return profileInstruction ? `${profileInstruction}\n\n${systemPrompt}` : systemPrompt;
}
