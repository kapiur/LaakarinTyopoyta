"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, FileBadge2, Search } from "lucide-react";
import { useI18n } from "../../lib/useI18n";
import { searchIcd10Catalog, type Icd10Entry } from "../../lib/lausunto/icd10Catalog";

type LausuntoMode = "sairausloma" | "b_lausunto" | "c_lausunto";

type AccessPayload = {
  enabled: boolean;
  practiceCountry: string;
  policyEnabled: boolean;
};

const MODE_OPTIONS: LausuntoMode[] = ["sairausloma", "b_lausunto", "c_lausunto"];

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

export default function LausunnotPage() {
  const { language } = useI18n();
  const [access, setAccess] = useState<AccessPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedIcd, setSelectedIcd] = useState<Icd10Entry | null>(null);
  const [mode, setMode] = useState<LausuntoMode>("sairausloma");
  const [purpose, setPurpose] = useState("sairauslomatodistus");
  const [sourceText, setSourceText] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [occupation, setOccupation] = useState("");
  const [absenceFrom, setAbsenceFrom] = useState("");
  const [absenceTo, setAbsenceTo] = useState("");
  const [copied, setCopied] = useState(false);

  const copy = useMemo(() => {
    if (language === "ru") {
      return {
        title: "Lausunto-рабочее пространство",
        subtitle: "Финский инструмент для B-, C-lausunto и sairauslomatodistus. Черновик строится по разделам, чтобы врач мог переносить его в рабочую программу частями.",
        noAccess: "Этот инструмент доступен только пользователям с включённым доступом и страной работы Финляндия.",
        mode: "Тип документа",
        purpose: "Для чего документ",
        sourceText: "Исходные тексты одним полем",
        sourceHint: "Вставьте сюда все записи, выписки и фрагменты. Инструмент сам использует этот массив как основу для lausunto.",
        additionalNotes: "Дополнительные замечания",
        occupation: "Профессия / характер работы",
        absenceFrom: "Больничный с",
        absenceTo: "Больничный по",
        diagnosisTitle: "Диагноз и ICD-10",
        diagnosisHint: "Ниже сначала показываются диагнозы, найденные по смыслу в тексте. При необходимости врач может поправить выбор вручную.",
        suggestedDiagnosis: "Предположительно из текста",
        manualDiagnosis: "Ручной поиск ICD-10",
        noDiagnosisSuggestion: "Автоподсказка пока не нашла уверенный диагноз. Можно выбрать вручную.",
        icdPlaceholder: "Например: I10, hypertension, alaselkan kipu",
        preview: "Черновик по разделам",
        copy: copied ? "Скопировано" : "Копировать",
        loading: "Загрузка...",
      };
    }
    if (language === "en") {
      return {
        title: "Lausunto workspace",
        subtitle: "Finnish workspace for B/C lausunto and sickness certificate drafting.",
        noAccess: "This tool is available only for Finland workflow users with explicit access.",
        mode: "Document type",
        purpose: "Purpose of document",
        sourceText: "All source texts in one field",
        sourceHint: "Paste all notes and excerpts here. The tool uses this combined material as the basis for the draft.",
        additionalNotes: "Additional notes",
        occupation: "Occupation / job demands",
        absenceFrom: "Sick leave from",
        absenceTo: "Sick leave until",
        diagnosisTitle: "Diagnosis and ICD-10",
        diagnosisHint: "Suggested diagnoses are first extracted from the text. The doctor can then refine or replace the choice manually.",
        suggestedDiagnosis: "Suggested from source text",
        manualDiagnosis: "Manual ICD-10 search",
        noDiagnosisSuggestion: "No confident diagnosis suggestion yet. You can select one manually.",
        icdPlaceholder: "For example: I10, hypertension, low back pain",
        preview: "Structured draft",
        copy: copied ? "Copied" : "Copy",
        loading: "Loading...",
      };
    }
    if (language === "de") {
      return {
        title: "Lausunto-Arbeitsbereich",
        subtitle: "Finnisches Werkzeug fuer B/C-Lausunto und Sairauslomatodistus.",
        noAccess: "Dieses Werkzeug ist nur fuer Nutzer mit Finnland-Kontext und expliziter Freischaltung verfuegbar.",
        mode: "Dokumenttyp",
        purpose: "Zweck des Dokuments",
        sourceText: "Alle Ausgangstexte in einem Feld",
        sourceHint: "Hier koennen alle Notizen und Auszuege gesammelt eingefuegt werden. Daraus wird der Entwurf aufgebaut.",
        additionalNotes: "Zusaetzliche Hinweise",
        occupation: "Beruf / Arbeitsanforderungen",
        absenceFrom: "Arbeitsunfaehig ab",
        absenceTo: "Arbeitsunfaehig bis",
        diagnosisTitle: "Diagnose und ICD-10",
        diagnosisHint: "Zuerst werden Diagnosen sinngemaess aus dem Text vorgeschlagen. Danach kann der Arzt manuell nachsteuern.",
        suggestedDiagnosis: "Aus dem Text vorgeschlagen",
        manualDiagnosis: "Manuelle ICD-10-Suche",
        noDiagnosisSuggestion: "Noch keine sichere Diagnose erkannt. Manuelle Auswahl ist moeglich.",
        icdPlaceholder: "Zum Beispiel: I10, Hypertonie, Kreuzschmerz",
        preview: "Entwurf nach Abschnitten",
        copy: copied ? "Kopiert" : "Kopieren",
        loading: "Laedt...",
      };
    }
    return {
      title: "Lausunto-tyotila",
      subtitle: "Suomeen rajattu tyokalu B- ja C-lausunnon seka sairauslomatodistuksen luonnosteluun. Tulostus rakennetaan osioittain, jotta tekstin voi siirtaa tyosoftaan paloina.",
      noAccess: "Tama tyokalu on kaytossa vain niille kayttajille, joille se on erikseen sallittu ja joiden tyoskentelymaa on Suomi.",
      mode: "Asiakirjan tyyppi",
      purpose: "Mita varten lausunto kirjoitetaan",
      sourceText: "Kaikki lahtotekstit yhteen kenttaan",
      sourceHint: "Liita tahan kaikki potilaan merkinnat, lausunnot ja poimitut tiedot. Tyokalu rakentaa luonnoksen taman aineiston pohjalta.",
      additionalNotes: "Lisahuomiot",
      occupation: "Ammatti / työn kuva",
      absenceFrom: "Poissaolo alkaa",
      absenceTo: "Poissaolo paattyy",
      diagnosisTitle: "Diagnoosi ja ICD-10",
      diagnosisHint: "Tyokalu ehdottaa ensin tekstista loytyvia diagnooseja. Niita voi sen jalkeen muokata tai hakea kasin.",
      suggestedDiagnosis: "Tekstista ehdotettu",
      manualDiagnosis: "Manuaalinen ICD-10-haku",
      noDiagnosisSuggestion: "Varmaa diagnoosiehdotusta ei loytynyt viela. Voit hakea diagnoosin kasin.",
      icdPlaceholder: "Esim. I10, hypertensio, alaselkan kipu",
      preview: "Osioitu luonnos",
      copy: copied ? "Kopioitu" : "Kopioi",
      loading: "Ladataan...",
    };
  }, [copied, language]);

  const purposeOptions = useMemo<Record<LausuntoMode, PurposeOption[]>>(() => ({
    sairausloma: [
      { value: "sairauslomatodistus", label: "Sairauslomatodistus" },
      { value: "sairauspoissaolon_jatko", label: "Sairauspoissaolon jatko" },
      { value: "tyohon_paluun_arvio", label: "Työhön paluun arvio" },
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

  const draft = useMemo(() => {
    const lines: string[] = [];

    lines.push(mode === "sairausloma" ? "Sairauslomatodistus" : mode === "b_lausunto" ? "B-lausunto" : "C-lausunto");
    lines.push("");
    const selectedPurpose = purposeOptions[mode].find((item) => item.value === purpose);
    if (selectedPurpose?.label) lines.push(`Tarkoitus: ${selectedPurpose.label}`);
    if (selectedIcd) lines.push(`Diagnoosi: ${selectedIcd.code} ${selectedIcd.fi}`);
    if (occupation.trim()) lines.push(`Ammatti / työn kuva: ${occupation.trim()}`);
    if (mode === "sairausloma" && (absenceFrom || absenceTo)) {
      lines.push(`Tyokyvyttomyys: ${absenceFrom || "___"} - ${absenceTo || "___"}`);
    }
    if (sourceText.trim()) {
      lines.push("");
      lines.push("Lahtotiedot:");
      lines.push(sourceText.trim());
    }
    if (additionalNotes.trim()) {
      lines.push("");
      lines.push("Lisahuomiot:");
      lines.push(additionalNotes.trim());
    }

    return lines.join("\n");
  }, [absenceFrom, absenceTo, additionalNotes, mode, occupation, purpose, purposeOptions, selectedIcd, sourceText]);

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
                  {item === "sairausloma" ? "Sairauslomatodistus" : item === "b_lausunto" ? "B-lausunto" : "C-lausunto"}
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
