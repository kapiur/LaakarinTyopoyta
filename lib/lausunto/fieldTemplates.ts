export type LausuntoMode = "sairausloma" | "bc_lausunto" | "b_lausunto" | "c_lausunto" | "oma_lomake";

export type LausuntoFieldResponseType = "text" | "yes_no" | "yes_no_with_explanation";

export type LausuntoFieldTemplate = {
  key: string;
  label: string;
  enabled: boolean;
  required: boolean;
  responseType: LausuntoFieldResponseType;
  order: number;
};

export type LausuntoFieldTemplateConfig = {
  formName: string;
  fields: LausuntoFieldTemplate[];
  aiInstruction: string;
  formDescription: string;
};

export type GeneratedLausuntoField = {
  key: string;
  label: string;
  content: string;
  required: boolean;
  omitted: boolean;
  responseType?: LausuntoFieldResponseType;
};

const RESPONSE_TYPES = new Set<LausuntoFieldResponseType>(["text", "yes_no", "yes_no_with_explanation"]);

const DEFAULT_FIELDS: Record<LausuntoMode, LausuntoFieldTemplate[]> = {
  sairausloma: [
    field("diagnoosi_oireperuste", "Diagnoosi tai oireperuste", true, "text"),
    field("tyokyvyttomyysaika", "Työkyvyttömyyden alku ja arvioitu loppu", true, "text"),
    field("status_perustelu", "Lyhyt status/perustelu", true, "text"),
    field("hoito_ja_seuranta", "Hoito- ja seurantasuunnitelma", false, "text"),
  ],
  bc_lausunto: [
    field("lausunnon_tarkoitus", "Lausunnon tarkoitus", true, "text"),
    field("diagnoosit", "Diagnoosit", true, "text"),
    field("esitiedot", "Esitiedot", true, "text"),
    field("nykytila", "Nykytila", true, "text"),
    field("toimintakyky", "Toimintakyky", true, "text"),
    field("tyokyky_ja_kuntoutus", "Työkyky ja kuntoutus", false, "text"),
    field("etuuden_perustelu", "Etuuden kannalta olennainen perustelu", true, "text"),
    field("suunnitelma", "Tutkimus-, hoito- ja kuntoutussuunnitelma", true, "text"),
    field("taydennettava", "Täydennettävä", false, "text"),
  ],
  b_lausunto: [
    field("potilaan_terveydentilan_tunteminen", "Potilaan terveydentilan tunteminen", false, "text"),
    field("lausunnon_tarkoitus", "Lausunnon tarkoitus", true, "text"),
    field("diagnoosit", "Diagnoosit", true, "text"),
    field("esitiedot", "Esitiedot", true, "text"),
    field("nykytila", "Nykytila", true, "text"),
    field("toimintakyky", "Toimintakyky", true, "text"),
    field("toimintakyvyn_ennuste", "Arvio toimintakyvyn ennusteesta hoidon ja kuntoutuksen jälkeen", false, "text"),
    field("tutkimus_ja_hoitosuunnitelma", "Tutkimus- ja hoitosuunnitelma", true, "text"),
    field("tyokyky_ja_kuntoutus", "Työkyky ja kuntoutus", false, "text"),
    field("arvio_tyokyvysta", "Arvio työkyvystä", false, "text"),
    field("johtopaatokset", "Työkykyä koskevat johtopäätökset / etuuden kannalta olennainen perustelu", true, "text"),
    field("taydennettava", "Täydennettävä", false, "text"),
  ],
  c_lausunto: [
    field("diagnoosit", "Diagnoosit", true, "text"),
    field("sairauden_kulku_ja_nykytila", "Sairauden kulku ja nykytila", true, "text"),
    field("toimintakyky_arjessa", "Toimintakyky arjessa", true, "text"),
    field("avun_ohjauksen_valvonnan_tarve", "Avun, ohjauksen ja valvonnan tarve", true, "text"),
    field("hoito_kuntoutus_palvelut", "Hoito, kuntoutus ja palvelut", true, "text"),
    field("etuuden_perustelu", "Etuuden kannalta olennainen perustelu", true, "text"),
    field("taydennettava", "Täydennettävä", false, "text"),
  ],
  oma_lomake: [
    field("tausta_ja_tarkoitus", "Tausta ja tarkoitus", true, "text"),
    field("olennaiset_tiedot", "Olennaiset tiedot", true, "text"),
    field("arvio", "Arvio", true, "text"),
    field("suunnitelma_tai_paatos", "Suunnitelma tai päätös", false, "text"),
    field("taydennettava", "Täydennettävä", false, "text"),
  ],
};

const DEFAULT_PURPOSE_FIELDS: Record<string, LausuntoFieldTemplate[]> = {
  sairauspoissaolon_jatko: [
    field("diagnoosi_oireperuste", "Diagnoosi tai oireperuste", true, "text"),
    field("miksi_jatkuu", "Miksi työkyvyttömyys jatkuu", true, "text"),
    field("muutos_edelliseen", "Muutos edelliseen arvioon", false, "text"),
    field("nykyinen_toimintakyky", "Nykyinen toimintakyky", true, "text"),
    field("jatkojakso", "Jatkojakson alku ja arvioitu loppu", true, "text"),
    field("seuranta", "Seuranta ja uusi arvio", false, "text"),
  ],
  tyohon_paluun_arvio: [
    field("diagnoosi_tilanne", "Diagnoosi ja ajankohtainen tilanne", true, "text"),
    field("tyon_vaatimukset", "Työn vaatimukset", false, "text"),
    field("toimintakyky", "Toimintakyky ja rajoitteet", true, "text"),
    field("tyohon_paluu", "Työhön paluun aikataulu", true, "text"),
    field("tyojarjestelyt", "Mahdolliset työjärjestelyt", false, "text"),
    field("seuranta", "Seuranta", false, "text"),
  ],
  sairauspaivaraha: [
    field("diagnoosit", "Diagnoosit", true, "text"),
    field("sairauden_kulku", "Sairauden kulku", true, "text"),
    field("nykytila_ja_loydokset", "Nykytila ja tutkimuslöydökset", true, "text"),
    field("tyon_kuva", "Ammatti ja työn vaatimukset", false, "text"),
    field("tyokyky", "Työkyky suhteessa omaan työhön", true, "text"),
    field("tyokyvyttomyysaika", "Työkyvyttömyyden arvioitu kesto", true, "text"),
    field("hoito_kuntoutus_seuranta", "Hoito-, kuntoutus- ja seurantasuunnitelma", true, "text"),
    field("taydennettava", "Täydennettävä", false, "text"),
  ],
  osasairauspaivaraha: [
    field("diagnoosit", "Diagnoosit", true, "text"),
    field("nykytila", "Nykytila ja toimintakyky", true, "text"),
    field("osa_aikatyo_mahdollinen", "Voiko tehdä osa-aikatyötä terveyttä vaarantamatta?", true, "yes_no_with_explanation"),
    field("tyojarjestelyt", "Tarvittavat työjärjestelyt", false, "text"),
    field("jakso", "Arvioitu jakso", true, "text"),
    field("seuranta", "Seuranta", false, "text"),
  ],
  ammatillinen_kuntoutus: [
    field("diagnoosit", "Diagnoosit", true, "text"),
    field("ammatti_ja_tyon_vaatimukset", "Ammatti ja työn vaatimukset", true, "text"),
    field("sairauden_vaikutus_tyohon", "Sairauden vaikutus työhön", true, "text"),
    field("toimintakyky_ja_voimavarat", "Toimintakyky ja voimavarat", true, "text"),
    field("kuntoutuksen_tavoite", "Kuntoutuksen tavoite", true, "text"),
    field("suositeltu_kuntoutus", "Suositeltu kuntoutus tai jatkoselvittely", true, "text"),
    field("taydennettava", "Täydennettävä", false, "text"),
  ],
  vaativa_laakinnallinen_kuntoutus: [
    field("diagnoosit", "Diagnoosit", true, "text"),
    field("toimintakyky", "Toimintakyky arjessa, opiskelussa tai työssä", true, "text"),
    field("aiempi_kuntoutus", "Aiempi kuntoutus ja vaikutus", false, "text"),
    field("kuntoutuksen_tavoitteet", "Kuntoutuksen tavoitteet", true, "text"),
    field("suositellut_toimenpiteet", "Suositellut toimenpiteet ja kesto", true, "text"),
    field("seuranta_yhteistyotahot", "Seuranta ja yhteistyötahot", false, "text"),
    field("taydennettava", "Täydennettävä", false, "text"),
  ],
  kuntoutuspsykoterapia: [
    field("diagnoosi_ja_oirekuva", "Psykiatrinen diagnoosi ja oirekuva", true, "text"),
    field("hoito_ja_vaste", "Vähintään 3 kuukauden hoito ja vaste", true, "text"),
    field("tyo_tai_opiskelukyky", "Työ- tai opiskelukyky", true, "text"),
    field("psykoterapian_soveltuvuus", "Soveltuvuus psykoterapiaan", true, "yes_no_with_explanation"),
    field("ajoitus_ja_ennuste", "Ajoitus ja ennuste", false, "text"),
    field("paihdeanamneesi", "Päihdeanamneesi, jos olennainen", false, "text"),
    field("taydennettava", "Täydennettävä", false, "text"),
  ],
  nuoren_kuntoutusraha: [
    field("diagnoosit_ja_nykytila", "Diagnoosit ja nykytila", true, "text"),
    field("opiskelu_elamantilanne", "Opiskelu tai muu elämäntilanne", true, "text"),
    field("toimintakyvyn_rajoitteet", "Toimintakyvyn rajoitteet", true, "text"),
    field("hoito_ja_kuntoutus", "Hoito ja kuntoutus", true, "text"),
    field("vaikutus_koulutukseen", "Vaikutus koulutukseen tai ammatinvalintaan", true, "text"),
    field("erityisen_tuen_tarve", "Erityisen tuen tarve", false, "text"),
  ],
  kuntoutustuki_tyokyvyttomyyselake: [
    field("diagnoosit", "Diagnoosit", true, "text"),
    field("hoitohistoria_ja_loydokset", "Hoitohistoria ja löydökset", true, "text"),
    field("tyotehtavat", "Työtehtävät ja niiden vaatimukset", true, "text"),
    field("jaljella_oleva_tyokyky", "Jäljellä oleva työ- ja toimintakyky", true, "text"),
    field("kuntoutus_ja_hoito", "Hoito ja kuntoutus", true, "text"),
    field("ennuste", "Ennuste", true, "text"),
    field("johtopaatos", "Johtopäätös etuuden kannalta", true, "text"),
    field("taydennettava", "Täydennettävä", false, "text"),
  ],
  laake_tai_ravintovalmiste_korvausoikeus: [
    field("valmiste", "Lääke tai kliininen ravintovalmiste", true, "text"),
    field("diagnoosi", "Diagnoosi", true, "text"),
    field("korvauskriteerit", "Korvauskriteerien kannalta olennaiset tiedot", true, "text"),
    field("hoito_ja_annos", "Hoito, annos ja aloitus", true, "text"),
    field("hoitovaste", "Hoitovaste tai hoidon tarve", false, "text"),
    field("seuranta", "Seuranta", false, "text"),
    field("taydennettava", "Täydennettävä", false, "text"),
  ],
  alle_16_vammaistuki: [
    field("diagnoosit", "Diagnoosit", true, "text"),
    field("sairauden_vamman_kuvaus", "Sairauden tai vamman kuvaus", true, "text"),
    field("hoito_ja_kuntoutus", "Hoito ja kuntoutus", true, "text"),
    field("avun_hoidon_valvonnan_tarve", "Avun, hoidon ja valvonnan tarve", true, "text"),
    field("poikkeama_ikatason_tarpeesta", "Miten tarve poikkeaa saman ikäisestä terveestä lapsesta", true, "text"),
    field("kesto_ja_ennuste", "Kesto ja ennuste", false, "text"),
    field("taydennettava", "Täydennettävä", false, "text"),
  ],
  "16_vuotta_tayttaneen_vammaistuki": [
    field("diagnoosit", "Diagnoosit", true, "text"),
    field("nykyinen_toimintakyky", "Nykyinen toimintakyky", true, "text"),
    field("pitkaaikainen_vaikutus", "Pitkäaikainen vaikutus arkeen", true, "text"),
    field("avun_ohjauksen_valvonnan_tarve", "Avun, ohjauksen ja valvonnan tarve", true, "text"),
    field("hoito_kuntoutus_palvelut", "Hoito, kuntoutus ja palvelut", false, "text"),
    field("taydennettava", "Täydennettävä", false, "text"),
  ],
  elaketta_saavan_hoitotuki: [
    field("diagnoosit", "Diagnoosit", true, "text"),
    field("nykyinen_toimintakyky", "Nykyinen toimintakyky", true, "text"),
    field("paivittainen_avun_tarve", "Päivittäinen avun ja ohjauksen tarve", true, "text"),
    field("hoidon_valvonnan_palvelujen_tarve", "Hoidon, valvonnan ja palvelujen tarve", true, "text"),
    field("kesto_ja_ennuste", "Kesto ja ennuste", false, "text"),
    field("taydennettava", "Täydennettävä", false, "text"),
  ],
};

function field(
  key: string,
  label: string,
  required: boolean,
  responseType: LausuntoFieldResponseType,
): LausuntoFieldTemplate {
  return {
    key,
    label,
    enabled: true,
    required,
    responseType,
    order: 0,
  };
}

function withOrder(fields: LausuntoFieldTemplate[]) {
  return fields.map((item, index) => ({ ...item, order: index + 1 }));
}

function slugifyLabel(label: string, fallback: string) {
  const normalized = label
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/å/g, "a")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || fallback;
}

export function getDefaultLausuntoFieldTemplate(mode: string, purpose = ""): LausuntoFieldTemplate[] {
  const safeMode = isLausuntoMode(mode) ? mode : "b_lausunto";
  const purposeFields = purpose ? DEFAULT_PURPOSE_FIELDS[purpose] : null;
  return withOrder(purposeFields ?? DEFAULT_FIELDS[safeMode]);
}

export function getDefaultLausuntoFieldTemplateConfig(mode: string, purpose = ""): LausuntoFieldTemplateConfig {
  return {
    formName: "",
    fields: getDefaultLausuntoFieldTemplate(mode, purpose),
    aiInstruction: "",
    formDescription: "",
  };
}

export function normalizeLausuntoFieldTemplateConfig(value: unknown, mode: string, purpose = ""): LausuntoFieldTemplateConfig {
  const item = typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const rawFields = Array.isArray(value) ? value : item.fields;

  return {
    formName: safeText(item.formName, 160),
    fields: normalizeLausuntoFieldTemplate(rawFields, mode, purpose),
    aiInstruction: safeText(item.aiInstruction ?? item.instruction, 2000),
    formDescription: safeText(item.formDescription, 2000),
  };
}

export function normalizeLausuntoFieldTemplate(value: unknown, mode: string, purpose = ""): LausuntoFieldTemplate[] {
  const source = Array.isArray(value) && value.length > 0 ? value : getDefaultLausuntoFieldTemplate(mode, purpose);
  const seen = new Set<string>();

  return source
    .map((item, index) => normalizeField(item, mode, index, seen))
    .filter((item): item is LausuntoFieldTemplate => Boolean(item))
    .sort((a, b) => a.order - b.order)
    .map((item, index) => ({ ...item, order: index + 1 }));
}

function normalizeField(value: unknown, mode: string, index: number, seen: Set<string>) {
  const item = typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
  const rawLabel = typeof item.label === "string" ? item.label.trim() : "";
  const label = rawLabel.slice(0, 120);
  if (!label) return null;

  const fallbackKey = `${mode}_${index + 1}`;
  const rawKey = typeof item.key === "string" ? item.key.trim() : "";
  let key = slugifyLabel(rawKey || label, fallbackKey).slice(0, 80);
  if (seen.has(key)) key = `${key}_${index + 1}`;
  seen.add(key);

  const rawType = typeof item.responseType === "string" ? item.responseType : "";
  const responseType = RESPONSE_TYPES.has(rawType as LausuntoFieldResponseType)
    ? rawType as LausuntoFieldResponseType
    : "text";

  return {
    key,
    label,
    enabled: item.enabled !== false,
    required: item.required === true,
    responseType,
    order: Number.isFinite(Number(item.order)) ? Number(item.order) : index + 1,
  };
}

export function enabledLausuntoFields(fields: LausuntoFieldTemplate[], mode: string) {
  return normalizeLausuntoFieldTemplate(fields, mode).filter((field) => field.enabled);
}

export function buildContentFromFields(fields: GeneratedLausuntoField[]) {
  return fields
    .filter((field) => !field.omitted && field.content.trim())
    .map((field) => `${field.label}\n${field.content.trim()}`)
    .join("\n\n");
}

export function responseTypeInstruction(responseType: LausuntoFieldResponseType) {
  if (responseType === "yes_no") {
    return "Vastaa vain Kyllä, Ei tai Ei arvioitavissa aineiston perusteella.";
  }
  if (responseType === "yes_no_with_explanation") {
    return "Aloita vastauksella Kyllä, Ei tai Ei arvioitavissa aineiston perusteella ja lisää lyhyt perustelu.";
  }
  return "Kirjoita valmis lakoninen kenttäteksti.";
}

function isLausuntoMode(value: string): value is LausuntoMode {
  return value === "sairausloma" || value === "bc_lausunto" || value === "b_lausunto" || value === "c_lausunto" || value === "oma_lomake";
}

function safeText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}
