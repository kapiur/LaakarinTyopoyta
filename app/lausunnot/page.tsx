"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, FileBadge2, Search, Sparkles } from "lucide-react";
import { searchIcd10Catalog, type Icd10Entry } from "../../lib/lausunto/icd10Catalog";

type LausuntoMode = "sairausloma" | "bc_lausunto" | "b_lausunto" | "c_lausunto";

type AccessPayload = {
  enabled: boolean;
  practiceCountry: string;
  policyEnabled: boolean;
};

type GeneratedLausuntoField = {
  key: string;
  label: string;
  content: string;
  required: boolean;
  omitted: boolean;
  hint?: string;
};

const MODE_OPTIONS: LausuntoMode[] = ["sairausloma", "bc_lausunto", "b_lausunto", "c_lausunto"];

type PurposeOption = {
  value: string;
  label: string;
  description: string;
  guide: string[];
};

const MODE_LABELS: Record<LausuntoMode, string> = {
  sairausloma: "Sairauslomatodistus",
  bc_lausunto: "B/C-lausunto",
  b_lausunto: "B-lausunto",
  c_lausunto: "C-lausunto",
};

const MODE_NOTES: Record<LausuntoMode, string> = {
  sairausloma: "Sairauslomatodistus sopii lyhyen työkyvyttömyyden ja poissaolon todentamiseen.",
  bc_lausunto: "Uusi B/C-lausunto kokoaa B- ja C-lausunnon käyttötarkoituksia samaan rakenteeseen. Samaan lausuntoon voi sisältyä useita etuuksia, mutta tekstiin kirjataan vain asian kannalta olennaiset tiedot.",
  b_lausunto: "B-lausuntoa käytetään edelleen siirtymäkaudella sairauspäivärahan, kuntoutuksen, työkyvyttömyyden ja lääkekorvausoikeuden arviointiin.",
  c_lausunto: "C-lausuntoa käytetään vammaisetuuksiin: alle 16-vuotiaan vammaistuki, 16 vuotta täyttäneen vammaistuki ja eläkettä saavan hoitotuki.",
};

const PURPOSE_OPTIONS: Record<LausuntoMode, PurposeOption[]> = {
  sairausloma: [
    {
      value: "sairauslomatodistus",
      label: "Sairauslomatodistus",
      description: "Lyhyt todistus työkyvyttömyydestä tai sairauspoissaolosta.",
      guide: ["Diagnoosi tai oireperuste", "Työkyvyttömyyden alku ja arvioitu loppu", "Lyhyt status/perustelu", "Hoito- ja seurantasuunnitelma"],
    },
    {
      value: "sairauspoissaolon_jatko",
      label: "Sairauspoissaolon jatko",
      description: "Jatkotodistus, jossa korostuu oireiden kulku ja työkyvyn uusi arvio.",
      guide: ["Miksi työkyvyttömyys jatkuu", "Mitä on muuttunut edellisestä arviosta", "Nykyinen toimintakyky", "Seuranta ja uusi arviointiajankohta"],
    },
    {
      value: "tyohon_paluun_arvio",
      label: "Työhön paluun arvio",
      description: "Arvio työkyvyn palautumisesta, rajoitteista ja mahdollisesta osittaisesta paluusta.",
      guide: ["Nykyinen toimintakyky", "Työn vaatimukset", "Mahdolliset rajoitteet", "Työhön paluun aikataulu ja seuranta"],
    },
  ],
  bc_lausunto: [
    {
      value: "sairauspaivaraha",
      label: "Sairauspäiväraha",
      description: "B/C-lausunnon sairauspäivärahaosio, kun työkyvyttömyys pitkittyy tai Kela tarvitsee laajemman arvion.",
      guide: ["Diagnoosi ja sairauden kulku", "Tutkimus- ja statuslöydökset", "Toimintakyky ja työkyky suhteessa omaan työhön", "Hoito-, kuntoutus- ja seurantasuunnitelma"],
    },
    {
      value: "osasairauspaivaraha",
      label: "Osasairauspäiväraha",
      description: "Arvio siitä, voiko potilas tehdä osa-aikatyötä terveyttään vaarantamatta.",
      guide: ["Nykytila ja toimintakyky", "Miksi osa-aikatyö on mahdollinen", "Tarvittavat työjärjestelyt", "Arvioitu kesto ja seuranta"],
    },
    {
      value: "ammatillinen_kuntoutus",
      label: "Ammatillinen kuntoutus",
      description: "Kun sairaus uhkaa työkykyä ja tarvitaan ammatillisen kuntoutuksen arvio.",
      guide: ["Ammatti ja työn vaatimukset", "Diagnoosi ja toimintakyky", "Miten sairaus vaikuttaa työhön", "Motivaatio, voimavarat ja kuntoutuksen tavoitteet"],
    },
    {
      value: "vaativa_laakinnallinen_kuntoutus",
      label: "Vaativa lääkinnällinen kuntoutus",
      description: "Kuntoutussuunnitelmaa tukeva lausunto vaativaa lääkinnällistä kuntoutusta varten.",
      guide: ["Toimintakyky arjessa, opiskelussa tai työssä", "Aiempi kuntoutus ja sen vaikutus", "Tavoitteet, toimenpiteet ja kesto", "Seuranta ja yhteistyötahot"],
    },
    {
      value: "kuntoutuspsykoterapia",
      label: "Kuntoutuspsykoterapia",
      description: "Lausunto psykoterapiakuntoutuksen tarpeesta ja ajankohdasta.",
      guide: ["Psykiatrinen diagnoosi ja oirekuva", "Vähintään 3 kuukauden hoito ja sen vaste", "Työ- tai opiskelukyky", "Soveltuvuus, ajoitus, päihdeanamneesi ja ennuste"],
    },
    {
      value: "nuoren_kuntoutusraha",
      label: "Nuoren kuntoutusraha",
      description: "Nuoren opiskelu- ja ammatillisen polun tukeminen sairauden tai toimintakyvyn rajoitteen vuoksi.",
      guide: ["Diagnoosi ja nykytila", "Opiskelu tai muu elämäntilanne", "Hoito ja kuntoutus", "Vaikutus koulutukseen, ammatinvalintaan ja erityisen tuen tarpeeseen"],
    },
    {
      value: "kuntoutustuki_tyokyvyttomyyselake",
      label: "Kuntoutustuki tai työkyvyttömyyseläke",
      description: "Laaja työkykyarvio määräaikaista tai pysyvää työkyvyttömyysetuutta varten.",
      guide: ["Sairaudet, löydökset ja hoitohistoria", "Työtehtävät ja niiden vaatimukset", "Jäljellä oleva työ- ja toimintakyky", "Hoito, kuntoutus, ennuste ja jatkosuunnitelma"],
    },
    {
      value: "laake_tai_ravintovalmiste_korvausoikeus",
      label: "Lääkkeen tai kliinisen ravintovalmisteen korvausoikeus",
      description: "Perustelu lääkkeen tai kliinisen ravintovalmisteen erityiskorvausoikeudelle.",
      guide: ["Valmisteen nimi ja käyttötarkoitus", "Diagnoosi ja Kelan korvauskriteereihin liittyvät tiedot", "Aloitettu tai suunniteltu hoito ja annos", "Hoitovaste, seuranta ja muut perustelut"],
    },
    {
      value: "alle_16_vammaistuki",
      label: "Alle 16-vuotiaan vammaistuki",
      description: "Lapsen pitkäaikainen sairaus tai vamma ja siitä aiheutuva hoidon, huolenpidon ja valvonnan tarve.",
      guide: ["Sairaudet, vammat ja diagnostiikka", "Hoito ja kuntoutus", "Hoidon, avun ja valvonnan tarve", "Miten tarve poikkeaa saman ikäisestä terveestä lapsesta"],
    },
    {
      value: "16_vuotta_tayttaneen_vammaistuki",
      label: "16 vuotta täyttäneen vammaistuki",
      description: "Pitkäaikainen toimintakyvyn heikentyminen ja avun, ohjauksen tai valvonnan tarve.",
      guide: ["Nykyinen toimintakyky", "Toimintakykyyn vaikuttavat sairaudet tai vammat", "Pitkäaikainen vaikutus arkeen", "Avun, ohjauksen ja valvonnan tarve"],
    },
    {
      value: "elaketta_saavan_hoitotuki",
      label: "Eläkettä saavan hoitotuki",
      description: "Eläkkeensaajan toimintakyky, hoidon tarve ja arjessa tarvittava apu.",
      guide: ["Nykyinen toimintakyky", "Sairaudet ja vammat, jotka rajoittavat toimintaa", "Päivittäinen avun ja ohjauksen tarve", "Hoidon, valvonnan ja palvelujen tarve"],
    },
  ],
  b_lausunto: [],
  c_lausunto: [],
};

PURPOSE_OPTIONS.b_lausunto = PURPOSE_OPTIONS.bc_lausunto.filter(
  (item) => !["alle_16_vammaistuki", "16_vuotta_tayttaneen_vammaistuki", "elaketta_saavan_hoitotuki"].includes(item.value),
);
PURPOSE_OPTIONS.c_lausunto = PURPOSE_OPTIONS.bc_lausunto.filter((item) =>
  ["alle_16_vammaistuki", "16_vuotta_tayttaneen_vammaistuki", "elaketta_saavan_hoitotuki"].includes(item.value),
);

const SOURCE_EVALUATION_REMINDERS = [
  "Lääkärin arvio diagnoosista, sairauden kulusta, hoidosta ja ennusteesta",
  "Potilaan oma kuvaus oireista, arjesta, työstä tai opiskelusta",
  "Työterveyden, työnantajan tai oppilaitoksen tieto työn/opiskelun vaatimuksista, jos käytettävissä",
  "Fysioterapeutin, toimintaterapeutin, psykologin, hoitajan tai muun ammattilaisen toimintakykyarvio, jos sellainen on tehty",
  "Tutkimustulokset, lääkitys, kuntoutus, apuvälineet sekä aiemmat lausunnot tai päätökset",
];

function scoreDiagnosisFromSource(entry: Icd10Entry, text: string) {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return 0;

  let score = 0;
  const terms = [entry.code, entry.fi, entry.en, entry.ru, entry.de]
    .join("|")
    .toLowerCase()
    .split("|")
    .filter(Boolean);

  for (const term of terms) {
    if (!term || term.length < 3) continue;
    if (normalized.includes(term)) {
      score += term === entry.code.toLowerCase() ? 120 : Math.min(60, term.length * 4);
    }
  }

  return score;
}

function extractDiagnosisSuggestions(text: string, limit = 6): Icd10Entry[] {
  return searchIcd10Catalog(text, 24)
    .map((entry) => ({ entry, score: scoreDiagnosisFromSource(entry, text) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.code.localeCompare(b.entry.code, "fi"))
    .slice(0, limit)
    .map((item) => item.entry);
}

function extractMedicineName(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "";

  const medicineContext = /\b(lääk|laake|lääkitys|laakitys|valmiste|korvausoikeus|aloitetaan|aloitettu|käytössä|kaytossa|annos|insuliini|tabletti|kapseli|injektio|mg|mikrog|µg|iu|ky)\b/i;
  const stopWords = new Set([
    "Aiempi",
    "Aloitetaan",
    "Diagnoosi",
    "Hoidon",
    "Kela",
    "Kontrolli",
    "Lausunto",
    "Lisäksi",
    "Lisaksi",
    "Nykytila",
    "Potilas",
    "Potilaan",
    "Suunnitelma",
    "Tarkoitus",
  ]);

  const sentences = normalized
    .split(/(?<=[.!?])\s+|\n+/)
    .filter((sentence) => medicineContext.test(sentence));
  const source = sentences.length > 0 ? sentences.join(" ") : normalized;
  const candidates = Array.from(source.matchAll(/\b[A-ZÅÄÖ][A-Za-zÅÄÖåäö-]{2,}(?:\s+\d+(?:[,.]\d+)?\s*(?:mg|mikrog|µg|g|ml|IU|ky|yks))?/g))
    .map((match) => match[0].trim())
    .filter((candidate) => !stopWords.has(candidate.split(/\s+/)[0]));

  return candidates[0] ?? "";
}

export default function LausunnotPage() {
  const [access, setAccess] = useState<AccessPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedIcd, setSelectedIcd] = useState<Icd10Entry | null>(null);
  const [mode, setMode] = useState<LausuntoMode>("sairausloma");
  const [purpose, setPurpose] = useState("sairauslomatodistus");
  const [sourceText, setSourceText] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [medicineName, setMedicineName] = useState("");
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [occupation, setOccupation] = useState("");
  const [absenceFrom, setAbsenceFrom] = useState("");
  const [absenceTo, setAbsenceTo] = useState("");
  const [copied, setCopied] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState("");
  const [generatedFields, setGeneratedFields] = useState<GeneratedLausuntoField[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");

  const copy = useMemo(() => ({
    title: "Lausunto-työtila",
    subtitle: "Suomeen rajattu työtila B/C-lausunnon, B-lausunnon, C-lausunnon ja sairauslomatodistuksen luonnosteluun. Lääkäri liittää lähtöaineiston yhteen kenttään ja viimeistelee rakenteen ennen siirtoa työjärjestelmään.",
    noAccess: "Tämä työkalu on käytössä vain niille käyttäjille, joille se on erikseen sallittu ja joiden työskentelymaa on Suomi.",
    mode: "Asiakirjan tyyppi",
    purpose: "Mihin lausuntoa käytetään",
    sourceText: "Lähtöaineisto",
    sourceHint: "Liitä tähän kaikki potilastekstit, aiemmat lausunnot, tutkimustulokset ja muut poimitut tiedot yhtenä tekstinä. AI:n tehtävä on jäsentää aineisto, ei vaatia valmiiksi jaoteltuja kenttiä.",
    sourceReminderTitle: "Muistilista lähtöaineistoon",
    sourceReminderHint: "Näitä ei tarvitse täyttää erillisiin kenttiin. Jos tieto on olemassa, liitä se samaan lähtöaineistoon.",
    additionalNotes: "Lisäohjeet tai lääkärin täsmennykset",
    medicineName: "Lääke tai kliininen ravintovalmiste",
    periodFrom: "Jakso alkaa",
    periodTo: "Jakso päättyy / kontrolli",
    occupation: "Ammatti / työn kuva",
    absenceFrom: "Poissaolo alkaa",
    absenceTo: "Poissaolo päättyy",
    diagnosisTitle: "Diagnoosi ja ICD-10",
    diagnosisHint: "Ehdotukset poimitaan lähtöaineistosta. Valintaa voi muuttaa tai diagnoosin voi hakea käsin.",
    suggestedDiagnosis: "Ehdotettu lähtöaineistosta",
    manualDiagnosis: "Manuaalinen ICD-10-haku",
    noDiagnosisSuggestion: "Varmaa diagnoosiehdotusta ei löytynyt vielä. Voit hakea diagnoosin käsin.",
    icdPlaceholder: "Esim. I10, hypertensio, alaselän kipu",
    preview: generatedDraft ? "AI-luonnos" : "Rakenne-esikatselu",
    generate: generating ? "Laaditaan..." : "Laadi lausunto AI:lla",
    generateHint: "Lisää lähtöaineisto ennen AI-luonnoksen laatimista.",
    generateFailed: "Lausunnon laatiminen epäonnistui.",
    copy: copied ? "Kopioitu" : "Kopioi",
    copyAllFields: "Kopioi käytössä olevat kentät",
    generatedFields: "B-lausunnon kentät",
    generatedFieldsHint: "Muokkaa kenttiä ennen kopiointia. Valinnaisen kentän voi jättää pois, jos se ei ole tässä lausunnossa tarpeellinen.",
    omitField: "Ei tarvita / jätä tyhjäksi",
    restoreField: "Käytä kenttää",
    copyField: "Kopioi kenttä",
    loading: "Ladataan...",
  }), [copied, generatedDraft, generating]);

  const purposeOptions = PURPOSE_OPTIONS;

  const diagnosisSuggestions = useMemo(() => extractDiagnosisSuggestions(sourceText), [sourceText]);
  const manualSearchResults = useMemo(() => searchIcd10Catalog(query), [query]);
  const selectedPurpose = purposeOptions[mode].find((item) => item.value === purpose) ?? purposeOptions[mode][0];
  const isMedicineReimbursement = (mode === "b_lausunto" || mode === "bc_lausunto") && purpose === "laake_tai_ravintovalmiste_korvausoikeus";
  const medicineSuggestion = useMemo(() => extractMedicineName(sourceText), [sourceText]);

  useEffect(() => {
    async function loadAccess() {
      const response = await fetch("/api/lausunnot/access", { cache: "no-store" });
      const data = await response.json();
      setAccess(data);
      setLoading(false);
    }
    loadAccess();
  }, []);

  useEffect(() => {
    if (selectedIcd || diagnosisSuggestions.length === 0) return;
    setSelectedIcd(diagnosisSuggestions[0]);
  }, [diagnosisSuggestions, selectedIcd]);

  useEffect(() => {
    setPurpose(purposeOptions[mode][0]?.value ?? "");
  }, [mode, purposeOptions]);

  useEffect(() => {
    if (!isMedicineReimbursement || medicineName.trim() || !medicineSuggestion) return;
    setMedicineName(medicineSuggestion);
  }, [isMedicineReimbursement, medicineName, medicineSuggestion]);

  const draft = useMemo(() => {
    const lines: string[] = [];

    lines.push(MODE_LABELS[mode]);
    lines.push("");
    if (selectedPurpose?.label) lines.push(`Tarkoitus: ${selectedPurpose.label}`);
    if (isMedicineReimbursement && medicineName.trim()) lines.push(`Lääke tai kliininen ravintovalmiste: ${medicineName.trim()}`);
    if (selectedIcd) lines.push(`Diagnoosi: ${selectedIcd.code} ${selectedIcd.fi}`);
    if (periodFrom.trim() || periodTo.trim()) {
      lines.push(`Jakso / hoito / kontrolli: ${periodFrom.trim() || "___"} - ${periodTo.trim() || "___"}`);
    }
    if (occupation.trim()) lines.push(`Ammatti / työn kuva: ${occupation.trim()}`);
    if (mode === "sairausloma" && (absenceFrom || absenceTo)) {
      lines.push(`Työkyvyttömyys: ${absenceFrom || "___"} - ${absenceTo || "___"}`);
    }
    if (selectedPurpose?.guide?.length) {
      lines.push("");
      lines.push("Kelan kannalta tarkistettavat tiedot:");
      for (const item of selectedPurpose.guide) {
        lines.push(`- ${item}`);
      }
    }
    if (sourceText.trim()) {
      lines.push("");
      lines.push("Lähtöaineisto:");
      lines.push(sourceText.trim());
    }
    if (additionalNotes.trim()) {
      lines.push("");
      lines.push("Lisäohjeet:");
      lines.push(additionalNotes.trim());
    }

    return lines.join("\n");
  }, [absenceFrom, absenceTo, additionalNotes, isMedicineReimbursement, medicineName, mode, occupation, periodFrom, periodTo, selectedIcd, selectedPurpose, sourceText]);

  const structuredDraft = useMemo(() => {
    if (generatedFields.length === 0) return "";
    return generatedFields
      .filter((field) => !field.omitted && field.content.trim())
      .map((field) => `${field.label}\n${field.content.trim()}`)
      .join("\n\n");
  }, [generatedFields]);

  async function copyDraft() {
    await navigator.clipboard.writeText(structuredDraft || generatedDraft || draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function copyField(field: GeneratedLausuntoField) {
    await navigator.clipboard.writeText(field.content.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function updateGeneratedField(key: string, patch: Partial<GeneratedLausuntoField>) {
    setGeneratedFields((fields) => fields.map((field) => (
      field.key === key ? { ...field, ...patch } : field
    )));
  }

  async function generateLausunto() {
    if (!sourceText.trim() && !additionalNotes.trim()) {
      setGenerateError(copy.generateHint);
      return;
    }

    setGenerating(true);
    setGenerateError("");

    try {
      const response = await fetch("/api/lausunnot/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          modeLabel: MODE_LABELS[mode],
          purpose,
          purposeLabel: selectedPurpose?.label,
          purposeDescription: selectedPurpose?.description,
          purposeGuide: selectedPurpose?.guide,
          sourceText,
          additionalNotes,
          medicineName,
          periodFrom,
          periodTo,
          occupation,
          absenceFrom,
          absenceTo,
          diagnosis: selectedIcd ? { code: selectedIcd.code, label: selectedIcd.fi } : null,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || typeof data.content !== "string" || !data.content.trim()) {
        throw new Error(typeof data.error === "string" ? data.error : copy.generateFailed);
      }

      setGeneratedDraft(data.content.trim());
      setGeneratedFields(Array.isArray(data.fields) ? data.fields.filter((field: unknown): field is GeneratedLausuntoField => {
        if (!field || typeof field !== "object") return false;
        const item = field as Partial<GeneratedLausuntoField>;
        return typeof item.key === "string" && typeof item.label === "string" && typeof item.content === "string";
      }) : []);
    } catch (error) {
      setGenerateError(error instanceof Error ? error.message : copy.generateFailed);
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return <div className="max-w-6xl mx-auto text-sm text-slate-500">{copy.loading}</div>;
  }

  if (!access?.enabled) {
    return (
      <div className="max-w-6xl mx-auto">
        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">{copy.title}</h1>
          <p className="text-sm text-slate-500 mt-2">{copy.noAccess}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg">
            <FileBadge2 size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{copy.title}</h1>
            <p className="text-sm text-slate-500 mt-1">{copy.subtitle}</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
        <section className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm space-y-5">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{copy.mode}</label>
            <select value={mode} onChange={(event) => setMode(event.target.value as LausuntoMode)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">
              {MODE_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {MODE_LABELS[item]}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs leading-5 text-slate-500">{MODE_NOTES[mode]}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectField
              label={copy.purpose}
              value={purpose}
              onChange={setPurpose}
              options={purposeOptions[mode]}
            />
            <Field label={copy.occupation} value={occupation} onChange={setOccupation} />
            {mode === "sairausloma" ? <Field label={copy.absenceFrom} value={absenceFrom} onChange={setAbsenceFrom} /> : null}
            {mode === "sairausloma" ? <Field label={copy.absenceTo} value={absenceTo} onChange={setAbsenceTo} /> : null}
          </div>

          {selectedPurpose ? (
            <div className="rounded-[1.5rem] border border-blue-100 bg-blue-50/60 p-4">
              <div className="text-sm font-bold text-slate-900">{selectedPurpose.label}</div>
              <p className="mt-1 text-sm leading-6 text-slate-600">{selectedPurpose.description}</p>
              <div className="mt-3 text-xs font-bold uppercase tracking-wider text-blue-700">Kelan kannalta olennaista</div>
              <ul className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-700">
                {selectedPurpose.guide.map((item) => (
                  <li key={item} className="rounded-2xl border border-blue-100 bg-white px-3 py-2">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <TextArea label={copy.sourceText} value={sourceText} onChange={setSourceText} rows={7} />
          <p className="-mt-2 text-xs text-slate-500">{copy.sourceHint}</p>

          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">{copy.sourceReminderTitle}</div>
            <p className="mt-1 text-sm leading-6 text-slate-600">{copy.sourceReminderHint}</p>
            <ul className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-700">
              {SOURCE_EVALUATION_REMINDERS.map((item) => (
                <li key={item} className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {isMedicineReimbursement ? (
            <div className="grid grid-cols-1 gap-4">
              <Field label={copy.medicineName} value={medicineName} onChange={setMedicineName} />
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label={copy.periodFrom} value={periodFrom} onChange={setPeriodFrom} />
            <Field label={copy.periodTo} value={periodTo} onChange={setPeriodTo} />
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="flex items-center gap-2 text-slate-900">
              <Search size={16} />
              <h2 className="text-sm font-bold">{copy.diagnosisTitle}</h2>
            </div>
            <p className="text-xs text-slate-500">{copy.diagnosisHint}</p>

            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">{copy.suggestedDiagnosis}</div>
              {diagnosisSuggestions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {diagnosisSuggestions.map((item) => (
                    <button
                      key={`suggested-${item.code}`}
                      type="button"
                      onClick={() => setSelectedIcd(item)}
                      className={`text-left rounded-2xl border px-4 py-3 ${selectedIcd?.code === item.code ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                    >
                      <div className="text-sm font-bold text-slate-900">{item.code}</div>
                      <div className="text-xs text-slate-500 mt-1">{item.fi}</div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500">
                  {copy.noDiagnosisSuggestion}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">{copy.manualDiagnosis}</div>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={copy.icdPlaceholder}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {manualSearchResults.map((item) => (
                  <button
                    key={`manual-${item.code}`}
                    type="button"
                    onClick={() => setSelectedIcd(item)}
                    className={`text-left rounded-2xl border px-4 py-3 ${selectedIcd?.code === item.code ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                  >
                    <div className="text-sm font-bold text-slate-900">{item.code}</div>
                    <div className="text-xs text-slate-500 mt-1">{item.fi}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <TextArea label={copy.additionalNotes} value={additionalNotes} onChange={setAdditionalNotes} rows={4} />
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-slate-900">{copy.preview}</h2>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={generateLausunto}
                disabled={generating || (!sourceText.trim() && !additionalNotes.trim())}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Sparkles size={16} />
                {copy.generate}
              </button>
              <button onClick={copyDraft} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50">
                <Copy size={16} />
                {generatedFields.length > 0 ? copy.copyAllFields : copy.copy}
              </button>
            </div>
          </div>
          {generateError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {generateError}
            </div>
          ) : null}
          {generatedFields.length > 0 ? (
            <div className="space-y-3">
              <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3">
                <div className="text-sm font-bold text-slate-900">{copy.generatedFields}</div>
                <p className="mt-1 text-xs leading-5 text-slate-600">{copy.generatedFieldsHint}</p>
              </div>
              {generatedFields.map((field) => (
                <GeneratedFieldEditor
                  key={field.key}
                  field={field}
                  omitLabel={copy.omitField}
                  restoreLabel={copy.restoreField}
                  copyLabel={copy.copyField}
                  onChange={(content) => updateGeneratedField(field.key, { content })}
                  onOmit={(omitted) => updateGeneratedField(field.key, { omitted })}
                  onCopy={() => copyField(field)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 whitespace-pre-wrap text-sm leading-7 text-slate-800 min-h-[36rem]">
              {generatedDraft || draft}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function GeneratedFieldEditor({
  field,
  omitLabel,
  restoreLabel,
  copyLabel,
  onChange,
  onOmit,
  onCopy,
}: {
  field: GeneratedLausuntoField;
  omitLabel: string;
  restoreLabel: string;
  copyLabel: string;
  onChange: (value: string) => void;
  onOmit: (value: boolean) => void;
  onCopy: () => void;
}) {
  return (
    <div className={`rounded-[1.5rem] border p-4 ${field.omitted ? "border-slate-200 bg-slate-50 opacity-70" : "border-slate-200 bg-white"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">{field.label}</div>
          {field.hint ? <p className="mt-1 text-xs leading-5 text-slate-500">{field.hint}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!field.required ? (
            <button
              type="button"
              onClick={() => onOmit(!field.omitted)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              {field.omitted ? restoreLabel : omitLabel}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onCopy}
            disabled={field.omitted || !field.content.trim()}
            className="inline-flex items-center gap-2 rounded-xl border border-blue-200 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
          >
            <Copy size={14} />
            {copyLabel}
          </button>
        </div>
      </div>
      <textarea
        rows={Math.max(3, Math.min(9, field.content.split("\n").length + 2))}
        value={field.content}
        disabled={field.omitted}
        onChange={(event) => onChange(event.target.value)}
        className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-800 resize-y disabled:text-slate-400"
      />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: PurposeOption[];
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-800 resize-y"
      />
    </label>
  );
}
