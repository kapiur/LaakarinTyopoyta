import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "../../../../lib/admin-auth";
import { runRoutedAiCompletion } from "../../../../lib/ai/runRoutedAiCompletion";
import { buildUserAiProfileInstruction } from "../../../../lib/ai/userAiProfile";
import { getUserAiProfile } from "../../../../lib/ai/userAiProfileStore";
import { buildWorkspaceContextInstruction, getUserAiWorkspaceContext } from "../../../../lib/ai/workspaceContext";
import { getLausuntoWorkspaceAccess } from "../../../../lib/lausunto/access";
import { preparePrivacyPayload } from "../../../../lib/privacy/gateway";

const LAUSUNTO_MODES = new Set(["sairausloma", "bc_lausunto", "b_lausunto", "c_lausunto"]);
const LAUSUNTO_BLOCKING_RESIDUAL_TYPES = new Set(["hetu", "email", "phone", "address"]);

type StructuredLausuntoField = {
  key: string;
  label: string;
  content: string;
  required: boolean;
  omitted: boolean;
  hint?: string;
};

const B_LAUSUNTO_FIELDS: Array<Omit<StructuredLausuntoField, "content" | "omitted">> = [
  {
    key: "potilaan_terveydentilan_tunteminen",
    label: "Potilaan terveydentilan tunteminen",
    required: false,
    hint: "Lyhyesti miten lausunnon antaja tuntee potilaan tilanteen, jos tieto ilmenee aineistosta.",
  },
  {
    key: "lausunnon_tarkoitus",
    label: "Lausunnon tarkoitus",
    required: true,
    hint: "Mihin etuuteen, arvioon tai päätökseen lausuntoa käytetään.",
  },
  {
    key: "diagnoosit",
    label: "Diagnoosit",
    required: true,
    hint: "ICD-10-koodi ja diagnoosin nimi, tarvittaessa ensisijainen diagnoosi ensin.",
  },
  {
    key: "esitiedot",
    label: "Esitiedot",
    required: true,
    hint: "Sairauden alkuvaihe, kehitys, oireisto, diagnoosin perusteet, aiempi hoito ja kuntoutus.",
  },
  {
    key: "nykytila",
    label: "Nykytila",
    required: true,
    hint: "Ajankohtaiset oireet, tutkimuslöydökset, mittaukset ja vastaanotolla todettu tilanne.",
  },
  {
    key: "toimintakyky",
    label: "Toimintakyky",
    required: true,
    hint: "Arjen, työn, opiskelun ja liikkumisen kannalta olennaiset toimintakyvyn rajoitteet.",
  },
  {
    key: "toimintakyvyn_ennuste",
    label: "Arvio toimintakyvyn ennusteesta hoidon ja kuntoutuksen jälkeen",
    required: false,
    hint: "Ennuste vain aineistossa kuvattujen tietojen perusteella.",
  },
  {
    key: "tutkimus_ja_hoitosuunnitelma",
    label: "Tutkimus- ja hoitosuunnitelma",
    required: true,
    hint: "Suunnitelman sisältö, tavoitteet, aikataulu ja hoidosta vastaava taho.",
  },
  {
    key: "tyokyky_ja_kuntoutus",
    label: "Työkyky ja kuntoutus",
    required: false,
    hint: "Työn vaatimukset, työkyky, kuntoutustarve ja mahdolliset työjärjestelyt.",
  },
  {
    key: "arvio_tyokyvysta",
    label: "Arvio työkyvystä",
    required: false,
    hint: "Työkyvyn arvio ja mahdollinen työkyvyttömyysjakso, jos lausunnon tarkoitus sitä edellyttää.",
  },
  {
    key: "johtopaatokset",
    label: "Työkykyä koskevat johtopäätökset / etuuden kannalta olennainen perustelu",
    required: true,
    hint: "Tiivis päätelmä Kelan kannalta olennaisesta perustelusta.",
  },
  {
    key: "taydennettava",
    label: "Täydennettävä",
    required: false,
    hint: "Vain konkreettiset puuttuvat tiedot, joita ei voi päätellä aineistosta.",
  },
];

const PRIVACY_PLACEHOLDER_SYSTEM_PROMPT = `
Privacy placeholders:
- The input may contain placeholders such as [NAME], [HETU], [PHONE], [EMAIL], [ADDRESS], [PATIENT_ID], [DATE_OF_BIRTH] or [PROFESSIONAL_NAME].
- Treat them only as protected placeholders. Do not explain, expand, translate, remove or draw attention to them.
- If a placeholder is not needed for the final Finnish document draft, omit it naturally.
`;

type DiagnosisPayload = {
  code?: unknown;
  label?: unknown;
};

type GenerateBody = {
  mode?: unknown;
  modeLabel?: unknown;
  purpose?: unknown;
  purposeLabel?: unknown;
  purposeDescription?: unknown;
  purposeGuide?: unknown;
  sourceText?: unknown;
  additionalNotes?: unknown;
  medicineName?: unknown;
  periodFrom?: unknown;
  periodTo?: unknown;
  occupation?: unknown;
  absenceFrom?: unknown;
  absenceTo?: unknown;
  diagnosis?: DiagnosisPayload | null;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function stringList(value: unknown) {
  return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
}

function hasBlockingLausuntoPrivacyRisk(findingTypes: string[]) {
  return findingTypes.some((type) => LAUSUNTO_BLOCKING_RESIDUAL_TYPES.has(type));
}

function buildPrompt(payload: {
  mode: string;
  modeLabel: string;
  purposeLabel: string;
  purposeDescription: string;
  purposeGuide: string[];
  sourceText: string;
  additionalNotes: string;
  medicineName: string;
  periodFrom: string;
  periodTo: string;
  occupation: string;
  absenceFrom: string;
  absenceTo: string;
  diagnosisCode: string;
  diagnosisLabel: string;
}) {
  const metaLines = [
    `Asiakirjan tyyppi: ${payload.modeLabel}`,
    `Käyttötarkoitus: ${payload.purposeLabel}`,
    payload.purposeDescription ? `Käyttötarkoituksen kuvaus: ${payload.purposeDescription}` : "",
    payload.diagnosisCode || payload.diagnosisLabel ? `Diagnoosi: ${[payload.diagnosisCode, payload.diagnosisLabel].filter(Boolean).join(" ")}` : "",
    payload.medicineName ? `Lääke tai kliininen ravintovalmiste: ${payload.medicineName}` : "",
    payload.periodFrom || payload.periodTo ? `Jakso / hoito / kontrolli: ${payload.periodFrom || "ei annettu"} - ${payload.periodTo || "ei annettu"}` : "",
    payload.occupation ? `Ammatti / työn kuva: ${payload.occupation}` : "",
    payload.absenceFrom || payload.absenceTo ? `Työkyvyttömyysaika: ${payload.absenceFrom || "ei annettu"} - ${payload.absenceTo || "ei annettu"}` : "",
  ].filter(Boolean);

  const guide = payload.purposeGuide.length
    ? payload.purposeGuide.map((item) => `- ${item}`).join("\n")
    : "- Diagnoosi ja sairauden kulku\n- Nykytila ja toimintakyky\n- Hoito, kuntoutus ja seuranta\n- Etuuden tai todistuksen kannalta olennainen perustelu";

  return `
Laadi lääkärin lausunto-/todistusluonnos Kelan käyttöä varten.

Tiedot:
${metaLines.join("\n")}

Kelan kannalta tarkistettavat asiat:
${guide}

Lähtöaineisto:
${payload.sourceText}

Lääkärin lisäohjeet:
${payload.additionalNotes || "Ei erillisiä lisäohjeita."}
`;
}

function buildStructuredBLausuntoPrompt(payload: Parameters<typeof buildPrompt>[0]) {
  const basePrompt = buildPrompt(payload);
  const fieldInstructions = B_LAUSUNTO_FIELDS.map((field) => (
    `- ${field.key}: ${field.label}. ${field.required ? "Pakollinen, jos aineistosta löytyy tieto." : "Valinnainen."} ${field.hint ?? ""}`
  )).join("\n");

  return `${basePrompt}

Tämän pyynnön tulos palautetaan B-lausunnon kenttärakenteena.
Palauta vain validi JSON ilman markdownia, ilman johdantoa ja ilman koodiaidan merkkejä.

JSON-rakenne:
{
  "fields": [
    {
      "key": "kentän_avain",
      "label": "Kentän otsikko",
      "content": "Valmis suomenkielinen kenttäteksti. Tyhjä merkkijono, jos aineistossa ei ole riittävää tietoa.",
      "required": true,
      "omitted": false,
      "hint": "Lyhyt ohje käyttäjälle"
    }
  ]
}

Käytä täsmälleen näitä kenttiä ja järjestystä:
${fieldInstructions}

Täyttöohje:
- Kirjoita kenttien content-arvot valmiiksi kopioitavaksi Kela B-lausunnon kenttiin.
- Älä yhdistä kaikkia kenttiä yhdeksi proosaksi.
- Älä täytä puuttuvaa tietoa keksimällä. Jos tieto puuttuu, jätä content tyhjäksi tai lisää se vain "taydennettava"-kenttään konkreettisena puutteena.
- Pidä teksti lakonisena mutta riittävänä. Jokaisessa kentässä vain sen kentän asia.
- Säilytä kliinisesti olennaiset päivämäärät, mittausarvot, lääkeannokset, tutkimukset ja seuranta-ajat.
`;
}

function buildSystemPrompt(workspaceInstruction: string, profileInstruction: string) {
  return `
${PRIVACY_PLACEHOLDER_SYSTEM_PROMPT}

${workspaceInstruction}

${profileInstruction}

Olet suomalaiseen terveydenhuoltoon ja Kelan lääkärinlausuntoihin erikoistunut avustaja.

Tärkeät rajaukset:
- Tämä työkalu koskee vain Suomessa käytettäviä B/C-lausuntoja, B-lausuntoja, C-lausuntoja ja sairauslomatodistuksia.
- Lopullinen luonnos kirjoitetaan aina suomeksi, vaikka käyttäjän käyttöliittymä, profiili tai kysely olisi muulla kielellä.
- Käytä käyttäjän henkilökohtaista profiilia vain rakenteen, tiiviyden, kirjoitustyylin ja kliinisen työn kontekstin sovittamiseen. Älä anna profiilin kielitoiveen vaihtaa lausunnon kieltä pois suomesta.
- Perustu vain käyttäjän antamaan lähtöaineistoon ja lisäkenttiin. Älä keksi tutkimuksia, diagnooseja, toimintakyvyn rajoitteita, päivämääriä, lääkityksiä tai päätöksiä.
- Säilytä kliinisesti olennaiset päivämäärät, ajanjaksot, annokset, tutkimusarvot ja seuranta-ajat, jos ne ovat lähtöaineistossa.
- Kirjoita lakonisesti, informatiivisesti ja valmiiksi kopioitavina osioina.
- Älä käytä markdown-lihavointeja, taulukoita, johdantoa, pahoitteluja tai meta-tekstiä AI:n toiminnasta.
- Jos olennainen tieto puuttuu, lisää loppuun lyhyt osio "Täydennettävä" ja listaa vain konkreettiset puuttuvat kohdat.

Rakenteen ohje:
- Sairauslomatodistus: Diagnoosi / Työkyvyttömyysaika / Perustelut / Hoito ja seuranta.
- B/C- ja B-lausunto: Diagnoosit / Sairauden kulku ja nykytila / Tutkimukset ja hoito / Toiminta- ja työkyky / Etuuden kannalta olennainen perustelu / Suunnitelma / Täydennettävä.
- C-lausunto: Diagnoosit / Sairauden kulku ja nykytila / Toimintakyky arjessa / Avun, ohjauksen ja valvonnan tarve / Hoito ja palvelut / Täydennettävä.
- Lääkekorvausoikeus: korosta valmistetta, diagnoosia, korvauskriteerien kannalta olennaisia tietoja, hoidon aloitusta, annosta, vastetta ja seurantaa.
`;
}

function normalizeStructuredField(value: unknown, fallback: Omit<StructuredLausuntoField, "content" | "omitted">): StructuredLausuntoField {
  const item = typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
  return {
    key: fallback.key,
    label: text(item.label) || fallback.label,
    content: text(item.content),
    required: typeof item.required === "boolean" ? item.required : fallback.required,
    omitted: typeof item.omitted === "boolean" ? item.omitted : false,
    hint: text(item.hint) || fallback.hint,
  };
}

function parseStructuredLausunto(content: string): StructuredLausuntoField[] | null {
  const trimmed = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    const parsed = JSON.parse(trimmed) as { fields?: unknown };
    if (!Array.isArray(parsed.fields)) return null;
    const parsedFields = parsed.fields;
    return B_LAUSUNTO_FIELDS.map((field) => {
      const match = parsedFields.find((item) => typeof item === "object" && item !== null && (item as Record<string, unknown>).key === field.key);
      return normalizeStructuredField(match, field);
    });
  } catch {
    return null;
  }
}

function buildContentFromFields(fields: StructuredLausuntoField[]) {
  return fields
    .filter((field) => field.content.trim())
    .map((field) => `${field.label}\n${field.content.trim()}`)
    .join("\n\n");
}

function sanitizeStructuredFields(fields: StructuredLausuntoField[]) {
  const fieldPrivacy = preparePrivacyPayload(fields.map((field) => ({
    key: field.key,
    value: field.content,
    mode: "transientClinicalChat",
  })));

  return {
    fields: fields.map((field) => ({
      ...field,
      content: fieldPrivacy.sanitized[field.key] ?? field.content,
    })),
    privacy: fieldPrivacy.privacy,
  };
}

export async function POST(request: Request) {
  const { session, error } = await requireAuthenticatedUser();
  if (error || !session) return error;

  const userId = Number((session.user as any)?.id);
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: "Käyttäjää ei tunnistettu." }, { status: 401 });
  }

  const access = await getLausuntoWorkspaceAccess(userId);
  if (!access.enabled) {
    return NextResponse.json({ error: "Lausunto-työkalu ei ole käytössä tälle käyttäjälle." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as GenerateBody;
  const mode = text(body.mode);
  if (!LAUSUNTO_MODES.has(mode)) {
    return NextResponse.json({ error: "Tuntematon lausuntotyyppi." }, { status: 400 });
  }

  const sourceText = text(body.sourceText);
  const additionalNotes = text(body.additionalNotes);
  if (!sourceText && !additionalNotes) {
    return NextResponse.json({ error: "Lisää lähtöaineisto ennen lausunnon laatimista." }, { status: 400 });
  }

  const inputPrivacy = preparePrivacyPayload([
    { key: "sourceText", value: sourceText, mode: "transientClinicalChat" },
    { key: "additionalNotes", value: additionalNotes, mode: "transientClinicalChat" },
    { key: "medicineName", value: text(body.medicineName), mode: "transientClinicalChat" },
    { key: "occupation", value: text(body.occupation), mode: "transientClinicalChat" },
  ]);

  if (hasBlockingLausuntoPrivacyRisk(inputPrivacy.privacy.residualFindingTypes)) {
    return NextResponse.json({
      error: "Tekstissä on tunnistetietoja, joita ei voitu poistaa turvallisesti. Poista nimi, yhteystiedot, henkilötunnus tai osoitetiedot ja yritä uudelleen.",
      privacy: inputPrivacy.privacy,
    }, { status: 400 });
  }

  const diagnosis = body.diagnosis && typeof body.diagnosis === "object" ? body.diagnosis : null;
  const workspaceContext = await getUserAiWorkspaceContext(userId, {
    clinicalConfig: {
      practiceCountry: "FI",
      clinicalCountry: "FI",
      clinicalOutputLanguage: "fi",
      evidenceStrictness: "strict",
    },
  });
  const workspaceInstruction = buildWorkspaceContextInstruction(workspaceContext, {
    includeUiLanguage: false,
    mentionCountryAdaptation: false,
    contentLabel: "Kela lausunto draft",
  });
  const userProfile = await getUserAiProfile(userId);
  const profileInstruction = buildUserAiProfileInstruction(userProfile, "full", workspaceContext);

  const promptPayload = {
    mode,
    modeLabel: text(body.modeLabel) || mode,
    purposeLabel: text(body.purposeLabel) || text(body.purpose) || "Ei määritelty",
    purposeDescription: text(body.purposeDescription),
    purposeGuide: stringList(body.purposeGuide),
    sourceText: inputPrivacy.sanitized.sourceText ?? "",
    additionalNotes: inputPrivacy.sanitized.additionalNotes ?? "",
    medicineName: inputPrivacy.sanitized.medicineName ?? "",
    periodFrom: text(body.periodFrom),
    periodTo: text(body.periodTo),
    occupation: inputPrivacy.sanitized.occupation ?? "",
    absenceFrom: text(body.absenceFrom),
    absenceTo: text(body.absenceTo),
    diagnosisCode: text(diagnosis?.code),
    diagnosisLabel: text(diagnosis?.label),
  };
  const userPrompt = mode === "b_lausunto"
    ? buildStructuredBLausuntoPrompt(promptPayload)
    : buildPrompt(promptPayload);

  const result = await runRoutedAiCompletion({
    userId,
    taskType: "clinical_document",
    requestedProfileMode: "full",
    temperature: 0.1,
    messages: [
      { role: "system", content: buildSystemPrompt(workspaceInstruction, profileInstruction) },
      { role: "user", content: userPrompt },
    ],
  });

  const structuredFields = mode === "b_lausunto" ? parseStructuredLausunto(result.content) : null;
  const structuredPrivacy = structuredFields ? sanitizeStructuredFields(structuredFields) : null;
  const structuredContent = structuredPrivacy ? buildContentFromFields(structuredPrivacy.fields) : "";
  const outputPrivacy = preparePrivacyPayload([
    { key: "content", value: structuredContent || result.content, mode: "transientClinicalChat" },
  ]);

  const outputFindings = [
    ...outputPrivacy.privacy.residualFindingTypes,
    ...(structuredPrivacy?.privacy.residualFindingTypes ?? []),
  ];
  if (hasBlockingLausuntoPrivacyRisk(outputFindings)) {
    return NextResponse.json({
      error: "Luonnokseen jäi tunnistetietoja. Tarkista lähtöaineisto ja yritä uudelleen.",
      privacy: outputPrivacy.privacy,
    }, { status: 400 });
  }

  return NextResponse.json({
    content: outputPrivacy.sanitized.content ?? result.content,
    fields: structuredPrivacy?.fields,
    privacy: {
      input: inputPrivacy.privacy,
      output: outputPrivacy.privacy,
    },
    route: {
      provider: result.provider,
      model: result.model,
      taskType: result.route.taskType,
      outputSanitized: outputPrivacy.privacy.anonymized,
    },
  });
}
