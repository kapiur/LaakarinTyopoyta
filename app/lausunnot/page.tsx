"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, FileBadge2, Search } from "lucide-react";
import { useI18n } from "../../lib/useI18n";

type LausuntoMode = "sairausloma" | "b_lausunto" | "c_lausunto";

type AccessPayload = {
  enabled: boolean;
  practiceCountry: string;
  policyEnabled: boolean;
};

type Icd10Entry = {
  code: string;
  fi: string;
  en: string;
  ru: string;
  de: string;
};

const MODE_OPTIONS: LausuntoMode[] = ["sairausloma", "b_lausunto", "c_lausunto"];

export default function LausunnotPage() {
  const { language } = useI18n();
  const [access, setAccess] = useState<AccessPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Icd10Entry[]>([]);
  const [selectedIcd, setSelectedIcd] = useState<Icd10Entry | null>(null);
  const [mode, setMode] = useState<LausuntoMode>("sairausloma");
  const [purpose, setPurpose] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [objectiveFindings, setObjectiveFindings] = useState("");
  const [workLimitations, setWorkLimitations] = useState("");
  const [treatmentPlan, setTreatmentPlan] = useState("");
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
        sourceText: "Исходные тексты и выдержки",
        objectiveFindings: "Объективные данные и текущая оценка",
        workLimitations: "Ограничения трудоспособности / функции",
        treatmentPlan: "План, лечение и продолжение",
        additionalNotes: "Дополнительные замечания",
        occupation: "Профессия / характер работы",
        absenceFrom: "Больничный с",
        absenceTo: "Больничный по",
        icdTitle: "Поиск ICD-10",
        icdHint: "Особенно полезно для sairauslomatodistus: можно быстро найти подходящий код и расшифровку.",
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
        sourceText: "Source texts and excerpts",
        objectiveFindings: "Objective findings and current assessment",
        workLimitations: "Work limitations / functional impact",
        treatmentPlan: "Plan, treatment, and follow-up",
        additionalNotes: "Additional notes",
        occupation: "Occupation / job demands",
        absenceFrom: "Sick leave from",
        absenceTo: "Sick leave until",
        icdTitle: "ICD-10 search",
        icdHint: "Useful especially for sickness certificates.",
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
        sourceText: "Ausgangstexte und Auszuege",
        objectiveFindings: "Objektive Befunde und aktuelle Einschaetzung",
        workLimitations: "Arbeitsfaehigkeit / funktionelle Einschraenkungen",
        treatmentPlan: "Plan, Behandlung und weiteres Vorgehen",
        additionalNotes: "Zusaetzliche Hinweise",
        occupation: "Beruf / Arbeitsanforderungen",
        absenceFrom: "Arbeitsunfaehig ab",
        absenceTo: "Arbeitsunfaehig bis",
        icdTitle: "ICD-10-Suche",
        icdHint: "Besonders nuetzlich fuer Sairauslomatodistus.",
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
      sourceText: "Lahtotekstit ja ydintiedot",
      objectiveFindings: "Objektiiviset loydokset ja nykyarvio",
      workLimitations: "Toimintakyky ja tyokyvyn rajoitteet",
      treatmentPlan: "Hoitosuunnitelma ja jatko",
      additionalNotes: "Lisahuomiot",
      occupation: "Ammatti / työn kuva",
      absenceFrom: "Poissaolo alkaa",
      absenceTo: "Poissaolo paattyy",
      icdTitle: "ICD-10-haku",
      icdHint: "Erityisen hyodyllinen sairauslomatodistuksessa, jossa oikean diagnoosikoodin loytaminen on keskeista.",
      icdPlaceholder: "Esim. I10, hypertensio, alaselkan kipu",
      preview: "Osioitu luonnos",
      copy: copied ? "Kopioitu" : "Kopioi",
      loading: "Ladataan...",
    };
  }, [copied, language]);

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
    if (!access?.enabled) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const response = await fetch(`/api/lausunnot/icd-search?q=${encodeURIComponent(query)}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) return;
      const data = await response.json();
      setResults(data.items || []);
    }, 150);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [access?.enabled, query]);

  const draft = useMemo(() => {
    const lines: string[] = [];

    lines.push(mode === "sairausloma" ? "Sairauslomatodistus" : mode === "b_lausunto" ? "B-lausunto" : "C-lausunto");
    lines.push("");
    if (purpose.trim()) lines.push(`Tarkoitus: ${purpose.trim()}`);
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
    if (objectiveFindings.trim()) {
      lines.push("");
      lines.push("Objektiiviset loydokset ja arvio:");
      lines.push(objectiveFindings.trim());
    }
    if (workLimitations.trim()) {
      lines.push("");
      lines.push("Toiminta- ja tyokyvyn rajoitteet:");
      lines.push(workLimitations.trim());
    }
    if (treatmentPlan.trim()) {
      lines.push("");
      lines.push("Hoito ja jatkosuunnitelma:");
      lines.push(treatmentPlan.trim());
    }
    if (additionalNotes.trim()) {
      lines.push("");
      lines.push("Lisahuomiot:");
      lines.push(additionalNotes.trim());
    }

    return lines.join("\n");
  }, [absenceFrom, absenceTo, additionalNotes, mode, objectiveFindings, occupation, purpose, selectedIcd, sourceText, treatmentPlan, workLimitations]);

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

          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="flex items-center gap-2 text-slate-900">
              <Search size={16} />
              <h2 className="text-sm font-bold">{copy.icdTitle}</h2>
            </div>
            <p className="text-xs text-slate-500">{copy.icdHint}</p>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.icdPlaceholder}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {results.map((item) => (
                <button
                  key={item.code}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label={copy.purpose} value={purpose} onChange={setPurpose} />
            <Field label={copy.occupation} value={occupation} onChange={setOccupation} />
            {mode === "sairausloma" ? <Field label={copy.absenceFrom} value={absenceFrom} onChange={setAbsenceFrom} /> : null}
            {mode === "sairausloma" ? <Field label={copy.absenceTo} value={absenceTo} onChange={setAbsenceTo} /> : null}
          </div>

          <TextArea label={copy.sourceText} value={sourceText} onChange={setSourceText} rows={7} />
          <TextArea label={copy.objectiveFindings} value={objectiveFindings} onChange={setObjectiveFindings} rows={5} />
          <TextArea label={copy.workLimitations} value={workLimitations} onChange={setWorkLimitations} rows={4} />
          <TextArea label={copy.treatmentPlan} value={treatmentPlan} onChange={setTreatmentPlan} rows={5} />
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
