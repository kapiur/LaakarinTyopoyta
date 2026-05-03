"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, CheckCircle2, Loader2, Save, Sparkles, AlertTriangle } from "lucide-react";
import { useI18n } from "../../../lib/useI18n";

type UiLang = "fi" | "ru" | "en";
type Section = { key: string; title: string; content: string; kind: string; order: number };
type Draft = { title: string; slugSuggestion?: string; description?: string; type: "CLINICAL"; status: string; visibility: string; sourceStatus: string; environment?: string; audience?: string; tags: string[]; sections: Section[]; fields?: unknown[]; rules?: unknown[]; sources?: Array<{ title: string; url?: string; type?: string; verified?: boolean }>; warnings?: string[]; meta?: Record<string, unknown> };

type ChunkSummary = Record<string, unknown>;

const CHUNK_TARGET_CHARS = 16000;
const CHUNK_OVERLAP_CHARS = 800;
const DIRECT_MODE_MAX_CHARS = 30000;
const HARD_MATERIAL_MAX_CHARS = 240000;
const HARD_SOURCE_MAX_CHARS = 120000;

const ui = {
  fi: {
    title: "Kliinisen pikaohjeen AI-luonti", subtitle: "Muodosta lyhyt Terveysasema-käyttöön sopiva pikaohje materiaalista", back: "Takaisin Pikaohjeisiin", topic: "Aihe / otsikko", material: "Materiaali", source: "Lähdeteksti tai Käypä hoito -ote", materialPlaceholder: "Liitä pitkä ohje, oma luonnos tai muu materiaali tähän...", sourcePlaceholder: "Valinnainen: liitä Käypä hoito -teksti, paikallinen ohje tai lähdeote tähän...", create: "Muodosta pikaohje", save: "Hyväksy ja tallenna", saved: "Tallennettu", warning: "Huomio", noDraft: "AI-luonnosta ei ole vielä luotu.", adminNote: "Tallennus vaatii ADMIN-roolin. AI-luonnoksen luonti ei tallenna mitään tietokantaan.", extracting: "Käsitellään fragmentteja", synthesizing: "Koostetaan lopullinen kortti", direct: "Suora käsittely", chunked: "Ositettu käsittely", tooLong: "Materiaali on liian pitkä. Poista turhat osat tai jaa aihe kahdeksi kortiksi."
  },
  ru: {
    title: "AI-создание клинической pikaohje", subtitle: "Сформировать короткую рабочую карточку для Terveysasema из материала", back: "Назад в Pikaohjeet", topic: "Тема / заголовок", material: "Материал", source: "Источник или фрагмент Käypä hoito", materialPlaceholder: "Вставь длинную инструкцию, черновик или другой материал сюда...", sourcePlaceholder: "Необязательно: вставь текст Käypä hoito, локальную инструкцию или источник...", create: "Сформировать pikaohje", save: "Подтвердить и сохранить", saved: "Сохранено", warning: "Внимание", noDraft: "AI-черновик ещё не создан.", adminNote: "Сохранение требует ADMIN-роль. Создание AI-черновика ничего не сохраняет в базу.", extracting: "Обрабатываются фрагменты", synthesizing: "Собирается итоговая карточка", direct: "Прямая обработка", chunked: "Обработка по частям", tooLong: "Материал слишком длинный. Удали лишние части или раздели тему на две карточки."
  },
  en: {
    title: "Clinical pikaohje AI builder", subtitle: "Create a short Terveysasema-ready clinical card from source material", back: "Back to Pikaohjeet", topic: "Topic / title", material: "Material", source: "Source text or Käypä hoito excerpt", materialPlaceholder: "Paste a long guide, your draft, or other material here...", sourcePlaceholder: "Optional: paste a Käypä hoito excerpt, local guide, or source text here...", create: "Create pikaohje", save: "Approve and save", saved: "Saved", warning: "Warning", noDraft: "No AI draft has been created yet.", adminNote: "Saving requires ADMIN role. AI draft generation does not save anything to the database.", extracting: "Processing chunks", synthesizing: "Synthesizing final card", direct: "Direct processing", chunked: "Chunked processing", tooLong: "Material is too long. Remove irrelevant parts or split the topic into two cards."
  },
};

function sectionTone(kind: string) { if (kind === "WARNING") return "border-amber-100 bg-amber-50/70"; if (kind === "CRITERIA") return "border-blue-100 bg-blue-50/60"; if (kind === "ACTIONS") return "border-emerald-100 bg-emerald-50/60"; if (kind === "COPY_TEXT") return "border-violet-100 bg-violet-50/60"; return "border-slate-100 bg-white"; }

function splitText(text: string, targetChars = CHUNK_TARGET_CHARS, overlapChars = CHUNK_OVERLAP_CHARS) {
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (clean.length <= targetChars) return [clean];
  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    const hardEnd = Math.min(start + targetChars, clean.length);
    let end = hardEnd;
    if (hardEnd < clean.length) {
      const window = clean.slice(start, hardEnd);
      const paragraphBreak = window.lastIndexOf("\n\n");
      const sentenceBreak = Math.max(window.lastIndexOf(". "), window.lastIndexOf("! "), window.lastIndexOf("? "));
      const softBreak = paragraphBreak > targetChars * 0.55 ? paragraphBreak : sentenceBreak > targetChars * 0.55 ? sentenceBreak + 1 : -1;
      if (softBreak > 0) end = start + softBreak;
    }
    const chunk = clean.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= clean.length) break;
    start = Math.max(0, end - overlapChars);
  }
  return chunks;
}

async function postJson(url: string, payload: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || data?.details || "Request failed");
  return data;
}

export default function ClinicalBuilderPage() {
  const { language } = useI18n();
  const dict = ui[(language as UiLang) || "fi"] ?? ui.fi;
  const [topic, setTopic] = useState("");
  const [rawText, setRawText] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSlug, setSavedSlug] = useState<string | null>(null);
  const [progress, setProgress] = useState("");
  const [progressCount, setProgressCount] = useState({ done: 0, total: 0 });

  async function createDraft() {
    if (!rawText.trim()) return;
    if (rawText.length > HARD_MATERIAL_MAX_CHARS || sourceText.length > HARD_SOURCE_MAX_CHARS) { alert(dict.tooLong); return; }
    setLoading(true); setSavedSlug(null); setDraft(null); setProgressCount({ done: 0, total: 0 });
    try {
      if (rawText.length + sourceText.length <= DIRECT_MODE_MAX_CHARS) {
        setProgress(dict.direct);
        const data = await postJson("/api/pikaohjeet-v2/ai/create-clinical-card", { topic, rawText, sourceText });
        setDraft(data);
      } else {
        const materialChunks = splitText(rawText);
        const sourceChunks = sourceText.trim() ? splitText(sourceText) : [];
        const allChunks = [
          ...materialChunks.map((chunk, idx) => ({ chunk, index: idx + 1, total: materialChunks.length, isSource: false })),
          ...sourceChunks.map((chunk, idx) => ({ chunk, index: idx + 1, total: sourceChunks.length, isSource: true })),
        ];
        setProgress(dict.extracting); setProgressCount({ done: 0, total: allChunks.length });
        const materialSummaries: ChunkSummary[] = [];
        const sourceSummaries: ChunkSummary[] = [];
        for (let i = 0; i < allChunks.length; i += 3) {
          const batch = allChunks.slice(i, i + 3);
          const results = await Promise.all(batch.map((item) => postJson("/api/pikaohjeet-v2/ai/extract-clinical-chunk", { topic, ...item })));
          results.forEach((result, offset) => { if (batch[offset].isSource) sourceSummaries.push(result); else materialSummaries.push(result); });
          setProgressCount((prev) => ({ ...prev, done: Math.min(prev.total, prev.done + batch.length) }));
        }
        setProgress(dict.synthesizing);
        const data = await postJson("/api/pikaohjeet-v2/ai/synthesize-clinical-card", { topic, materialSummaries, sourceSummaries, meta: { materialChunks: materialChunks.length, sourceChunks: sourceChunks.length, originalMaterialChars: rawText.length, originalSourceChars: sourceText.length } });
        setDraft(data);
      }
    } catch (error: any) { alert(error?.message || "AI error"); }
    finally { setLoading(false); setProgress(""); }
  }

  async function saveDraft() { if (!draft) return; setSaving(true); try { const data = await postJson("/api/pikaohjeet-v2", draft); setSavedSlug(data.slug); } catch (error: any) { alert(error?.message || "Tallennusvirhe"); } finally { setSaving(false); } }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-96px)] max-w-[1700px] flex-col gap-4 p-4 text-slate-900">
      <header className="rounded-[2rem] border border-slate-100 bg-white px-7 py-5 shadow-sm"><a href="/pikaohjeet-v2" className="mb-3 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-400 hover:text-blue-600"><ArrowLeft size={14} /> {dict.back}</a><div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-black tracking-tight text-slate-900">{dict.title}</h1><p className="text-xs font-bold text-slate-400">{dict.subtitle}</p></div><div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-900">{dict.adminNote}</div></div></header>
      <main className="grid flex-1 grid-cols-12 gap-5">
        <section className="col-span-5 space-y-4 rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div><label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">{dict.topic}</label><input value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold outline-none focus:border-blue-200 focus:bg-white focus:ring-4 focus:ring-blue-500/10" /></div>
          <div><label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">{dict.material} · {rawText.length}</label><textarea value={rawText} onChange={(e) => setRawText(e.target.value)} placeholder={dict.materialPlaceholder} className="min-h-[360px] w-full rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 text-sm font-semibold leading-relaxed outline-none focus:border-blue-200 focus:bg-white focus:ring-4 focus:ring-blue-500/10" /></div>
          <div><label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">{dict.source} · {sourceText.length}</label><textarea value={sourceText} onChange={(e) => setSourceText(e.target.value)} placeholder={dict.sourcePlaceholder} className="min-h-[180px] w-full rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 text-sm font-semibold leading-relaxed outline-none focus:border-blue-200 focus:bg-white focus:ring-4 focus:ring-blue-500/10" /></div>
          <button onClick={createDraft} disabled={loading || !rawText.trim()} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 text-xs font-black uppercase tracking-wide text-white shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-50">{loading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />} {dict.create}</button>
          {loading && <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs font-black text-blue-800">{progress}{progressCount.total > 0 ? ` ${progressCount.done}/${progressCount.total}` : ""}</div>}
        </section>
        <section className="col-span-7 rounded-[2rem] border border-slate-100 bg-slate-50 p-6 shadow-sm">
          {!draft ? <div className="flex h-full min-h-[640px] items-center justify-center text-sm font-black uppercase tracking-widest text-slate-300">{dict.noDraft}</div> : <div className="space-y-5"><div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm"><div className="mb-3 flex flex-wrap gap-2"><span className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-blue-700">CLINICAL</span><span className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-amber-800">{draft.sourceStatus}</span>{draft.meta?.processingMode && <span className="rounded-xl border border-slate-100 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-slate-500">{String(draft.meta.processingMode)}</span>}</div><h2 className="text-3xl font-black tracking-tight text-slate-900">{draft.title}</h2>{draft.description && <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">{draft.description}</p>}{draft.tags?.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{draft.tags.map((tag) => <span key={tag} className="rounded-xl bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-500">#{tag}</span>)}</div>}</div>{draft.warnings?.length ? <div className="rounded-[1.5rem] border border-amber-100 bg-amber-50 p-5 text-sm font-semibold text-amber-900"><div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wide"><AlertTriangle size={16} /> {dict.warning}</div><ul className="list-disc space-y-1 pl-5">{draft.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul></div> : null}{[...(draft.sections || [])].sort((a,b) => a.order - b.order).map((section) => <article key={section.key} className={`rounded-[2rem] border p-6 shadow-sm ${sectionTone(section.kind)}`}><h3 className="mb-4 text-sm font-black uppercase tracking-wide text-slate-800">{section.title}</h3><div className="prose prose-slate max-w-none text-sm font-semibold leading-relaxed"><ReactMarkdown>{section.content}</ReactMarkdown></div></article>)}<button onClick={saveDraft} disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-4 text-xs font-black uppercase tracking-wide text-white shadow-lg shadow-emerald-100 hover:bg-emerald-700 disabled:opacity-50">{saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} {dict.save}</button>{savedSlug && <a href="/pikaohjeet-v2" className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-xs font-black uppercase tracking-wide text-emerald-700"><CheckCircle2 size={16} /> {dict.saved}: {savedSlug}</a>}</div>}
        </section>
      </main>
    </div>
  );
}
