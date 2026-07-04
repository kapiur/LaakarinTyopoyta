"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, FileBadge2, Search } from "lucide-react";
import { searchIcd10Catalog, type Icd10Entry } from "../../lib/lausunto/icd10Catalog";

type LausuntoMode = "sairausloma" | "bc_lausunto" | "b_lausunto" | "c_lausunto";

type AccessPayload = {
  enabled: boolean;
  practiceCountry: string;
  policyEnabled: boolean;
};

const MODE_OPTIONS: LausuntoMode[] = ["sairausloma", "bc_lausunto", "b_lausunto", "c_lausunto"];

type PurposeOption = {
  value: string;
  label: string;
};

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

  const copy = useMemo(() => {
    return {
      title: "Lausunto-työtila",
      subtitle: "Suomeen rajattu työkalu yhdistetyn B/C-lausunnon, erillisten B- ja C-lausuntojen sekä sairauslomatodistuksen luonnosteluun. Tulostus rakennetaan osioittain, jotta tekstin voi siirtää työsoftaan paloina.",
      noAccess: "Tämä työkalu on käytössä vain niille käyttäjille, joille se on erikseen sallittu ja joiden työskentelymaa on Suomi.",
      mode: "Asiakirjan tyyppi",
      purpose: "Mitä varten lausunto kirjoitetaan",
      sourceText: "Kaikki lähtötekstit yhteen kenttään",
      sourceHint: "Liitä tähän kaikki potilaan merkinnät, lausunnot ja poimitut tiedot. Työkalu rakentaa luonnoksen tämän aineiston pohjalta.",
      additionalNotes: "Lisähuomiot",
      medicineName: "Lääke tai kliininen ravintovalmiste",
      periodFrom: "Jakso / hoito alkaen",
      periodTo: "Jakso / kontrolli / asti",
      occupation: "Ammatti / työn kuva",
      absenceFrom: "Poissaolo alkaa",
      absenceTo: "Poissaolo päättyy",
      diagnosisTitle: "Diagnoosi ja ICD-10",
      diagnosisHint: "Työkalu ehdottaa ensin tekstistä löytyviä diagnooseja. Niitä voi sen jälkeen muokata tai hakea käsin.",
      suggestedDiagnosis: "Tekstistä ehdotettu",
      manualDiagnosis: "Manuaalinen ICD-10-haku",
      noDiagnosisSuggestion: "Varmaa diagnoosiehdotusta ei löytynyt vielä. Voit hakea diagnoosin käsin.",
      icdPlaceholder: "Esim. I10, hypertensio, alaselän kipu",
      preview: "Osioitu luonnos",
      copy: copied ? "Kopioitu" : "Kopioi",
      loading: "Ladataan...",
    };
  }, [copied]);

  const purposeOptions = useMemo<Record<LausuntoMode, PurposeOption[]>>(() => ({
    sairausloma: [
      { value: "sairauslomatodistus", label: "Sairauslomatodistus" },
      { value: "sairauspoissaolon_jatko", label: "Sairauspoissaolon jatko" },
      { value: "tyohon_paluun_arvio", label: "Työhön paluun arvio" },
    ],
    bc_lausunto: [
      { value: "sairauspaivaraha", label: "Sairauspäiväraha" },
      { value: "osasairauspaivaraha", label: "Osasairauspäiväraha" },
      { value: "kuntoutus", label: "Kuntoutus" },
      { value: "nuoren_kuntoutusraha", label: "Nuoren kuntoutusraha" },
      { value: "kuntoutustuki_tyokyvyttomyyselake", label: "Kuntoutustuki tai työkyvyttömyyseläke" },
      { value: "laake_tai_ravintovalmiste_korvausoikeus", label: "Lääkkeen tai kliinisen ravintovalmisteen korvausoikeus" },
      { value: "alle_16_vammaistuki", label: "Alle 16-vuotiaan vammaistuki" },
      { value: "16_vuotta_tayttaneen_vammaistuki", label: "16 vuotta täyttäneen vammaistuki" },
      { value: "elaketta_saavan_hoitotuki", label: "Eläkettä saavan hoitotuki" },
    ],
    b_lausunto: [
      { value: "sairauspaivaraha", label: "Sairauspäiväraha" },
      { value: "osasairauspaivaraha", label: "Osasairauspäiväraha" },
      { value: "kuntoutus", label: "Kuntoutus" },
      { value: "nuoren_kuntoutusraha", label: "Nuoren kuntoutusraha" },
      { value: "kuntoutustuki_tyokyvyttomyyselake", label: "Kuntoutustuki tai työkyvyttömyyseläke" },
      { value: "laake_tai_ravintovalmiste_korvausoikeus", label: "Lääkkeen tai kliinisen ravintovalmisteen korvausoikeus" },
    ],
    c_lausunto: [
      { value: "alle_16_vammaistuki", label: "Alle 16-vuotiaan vammaistuki" },
      { value: "16_vuotta_tayttaneen_vammaistuki", label: "16 vuotta täyttäneen vammaistuki" },
      { value: "elaketta_saavan_hoitotuki", label: "Eläkettä saavan hoitotuki" },
    ],
  }), []);

  const diagnosisSuggestions = useMemo(() => extractDiagnosisSuggestions(sourceText), [sourceText]);
  const manualSearchResults = useMemo(() => searchIcd10Catalog(query), [query]);
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

    lines.push(mode === "sairausloma" ? "Sairauslomatodistus" : mode === "bc_lausunto" ? "B/C-lausunto" : mode === "b_lausunto" ? "B-lausunto" : "C-lausunto");
    lines.push("");
    const selectedPurpose = purposeOptions[mode].find((item) => item.value === purpose);
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
    if (sourceText.trim()) {
      lines.push("");
      lines.push("Lähtötiedot:");
      lines.push(sourceText.trim());
    }
    if (additionalNotes.trim()) {
      lines.push("");
      lines.push("Lisähuomiot:");
      lines.push(additionalNotes.trim());
    }

    return lines.join("\n");
  }, [absenceFrom, absenceTo, additionalNotes, isMedicineReimbursement, medicineName, mode, occupation, periodFrom, periodTo, purpose, purposeOptions, selectedIcd, sourceText]);

  async function copyDraft() {
    await navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
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
                  {item === "sairausloma" ? "Sairauslomatodistus" : item === "bc_lausunto" ? "B/C-lausunto" : item === "b_lausunto" ? "B-lausunto" : "C-lausunto"}
                </option>
              ))}
            </select>
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

          <TextArea label={copy.sourceText} value={sourceText} onChange={setSourceText} rows={7} />
          <p className="-mt-2 text-xs text-slate-500">{copy.sourceHint}</p>

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
            <button onClick={copyDraft} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50">
              <Copy size={16} />
              {copy.copy}
            </button>
          </div>
          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 whitespace-pre-wrap text-sm leading-7 text-slate-800 min-h-[36rem]">
            {draft}
          </div>
        </section>
      </div>
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
