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

  const userPrompt = buildPrompt({
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
  });

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

  const outputPrivacy = preparePrivacyPayload([
    { key: "content", value: result.content, mode: "transientClinicalChat" },
  ]);

  if (hasBlockingLausuntoPrivacyRisk(outputPrivacy.privacy.residualFindingTypes)) {
    return NextResponse.json({
      error: "Luonnokseen jäi tunnistetietoja. Tarkista lähtöaineisto ja yritä uudelleen.",
      privacy: outputPrivacy.privacy,
    }, { status: 400 });
  }

  return NextResponse.json({
    content: outputPrivacy.sanitized.content ?? result.content,
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
