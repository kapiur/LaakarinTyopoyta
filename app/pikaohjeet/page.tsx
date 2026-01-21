"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  BookOpen,
  Search,
  Loader2,
  ChevronRight,
  Sparkles,
  Edit2,
  X,
  Save,
  AlertTriangle,
  Info,
  CheckCircle2,
  History,
  Tag,
} from "lucide-react";

// --- Types ---
type ClinicalCard = {
  id: number;
  slug: string;
  title: string;
  subtitle?: string | null;
  environment: string;
  audience: string;
  tags: string[];
  isPublished: boolean;
  updatedAt: string;
  createdAt: string;
  updatedByUserId?: string | null;
  updatedByEmail?: string | null;
  updatedByName?: string | null;
  sections?: ClinicalSection[];
  fields?: ClinicalField[];
  rules?: ClinicalRule[];
  revisions?: ClinicalRevision[];
};

type ClinicalSection = {
  id: number;
  cardId: number;
  key: string;
  title: string;
  order: number;
  content: string;
  highlightCallout?: string | null;
};

type ClinicalField = {
  id: number;
  cardId: number;
  key: string;
  label: string;
  type: string;
  unit?: string | null;
  placeholder?: string | null;
  options: string[];
  order: number;
  isUniversal: boolean;
};

type ClinicalRule = {
  id: number;
  cardId: number;
  fieldKey: string;
  operator: string;
  value: string;
  highlightSectionKey?: string | null;
  addHint?: string | null;
  priority: number;
};

type ClinicalRevision = {
  id: number;
  cardId: number;
  createdAt: string;
  editorUserId?: string | null;
  editorEmail?: string | null;
  editorName?: string | null;
  action: string;
  summary?: string | null;
  payload?: any;
};

// --- Helpers ---
function classNames(...arr: Array<string | false | null | undefined>) {
  return arr.filter(Boolean).join(" ");
}

function safeNum(v: any): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function evalRule(rule: ClinicalRule, fieldValue: any): boolean {
  const op = (rule.operator || "").toLowerCase().trim();
  const rhsRaw = rule.value;
  const fvStr = String(fieldValue ?? "").trim().toLowerCase();
  const rhsStr = String(rhsRaw ?? "").trim().toLowerCase();

  if (op === "truthy" || op === "true") {
    if (typeof fieldValue === "boolean") return fieldValue;
    return ["1", "true", "yes", "kyllä", "on"].includes(fvStr);
  }
  if (op === "includes") return fvStr.includes(rhsStr);
  
  const fn = safeNum(fieldValue);
  const rn = safeNum(rhsRaw);

  if (op === "eq" || op === "==") {
    if (fn !== null && rn !== null) return fn === rn;
    return fvStr === rhsStr;
  }
  if (op === "neq") {
    if (fn !== null && rn !== null) return fn !== rn;
    return fvStr !== rhsStr;
  }
  if (fn === null || rn === null) return false;
  if (op === "gt" || op === ">") return fn > rn;
  if (op === "gte" || op === ">=") return fn >= rn;
  if (op === "lt" || op === "<") return fn < rn;
  if (op === "lte" || op === "<=") return fn <= rn;

  return false;
}

function severityFromPriority(priority: number) {
  if (priority <= 20) return "danger";
  if (priority <= 40) return "warning";
  return "info";
}

// --- Main Page Component ---
export default function PikaohjeetPage() {
  const { data: session } = useSession();

  const [loadingList, setLoadingList] = useState(true);
  const [cards, setCards] = useState<ClinicalCard[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  const [loadingCard, setLoadingCard] = useState(false);
  const [card, setCard] = useState<ClinicalCard | null>(null);
  const [params, setParams] = useState<Record<string, any>>({});

  const [isEditing, setIsEditing] = useState(false);
  const [draftSections, setDraftSections] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  useEffect(() => { fetchCards(); }, []);

  useEffect(() => {
    setParams({});
    setSaveOk(null);
    setSaveErr(null);
  }, [activeSlug]);

  const fetchCards = async () => {
    setLoadingList(true);
    try {
      const res = await fetch("/api/pikaohjeet", { cache: "no-store" });
      const data = await res.json();
      const list = (Array.isArray(data) ? data : data?.cards || [])
        .filter((c: any) => c.isPublished !== false)
        .sort((a: any, b: any) => a.title.localeCompare(b.title, "fi"));
      setCards(list);
      if (!activeSlug && list.length > 0) setActiveSlug(list[0].slug);
    } catch (e) {
      console.error(e);
      setCards([]);
    } finally {
      setLoadingList(false);
    }
  };

  const fetchCard = async (slug: string) => {
    setLoadingCard(true);
    try {
      const res = await fetch(`/api/pikaohjeet/${encodeURIComponent(slug)}`, { cache: "no-store" });
      const data = await res.json();
      setCard(data);
      const secMap: Record<string, string> = {};
      (data?.sections || []).forEach((s: any) => (secMap[s.key] = s.content || ""));
      setDraftSections(secMap);
    } catch (e) {
      setCard(null);
    } finally {
      setLoadingCard(false);
    }
  };

  useEffect(() => {
    if (activeSlug) fetchCard(activeSlug);
  }, [activeSlug]);

  const filteredCards = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter((c) => 
      `${c.title} ${c.subtitle ?? ""} ${c.tags?.join(" ")}`.toLowerCase().includes(q)
    );
  }, [cards, searchTerm]);

  const activeRuleHits = useMemo(() => {
    const hits: any[] = [];
    (card?.rules || []).forEach((r) => {
      if (evalRule(r, params[r.fieldKey])) {
        hits.push({ ...r, severity: severityFromPriority(r.priority) });
      }
    });
    return hits.sort((a, b) => a.priority - b.priority);
  }, [card, params]);

  const sectionHighlights = useMemo(() => {
    const map: Record<string, { severity: string; hints: string[] }> = {};
    activeRuleHits.forEach(hit => {
      const key = hit.highlightSectionKey?.trim();
      if (!key) return;
      if (!map[key]) map[key] = { severity: hit.severity, hints: [] };
      else {
        const rank = (s: string) => (s === "danger" ? 3 : s === "warning" ? 2 : 1);
        if (rank(hit.severity) > rank(map[key].severity)) map[key].severity = hit.severity;
      }
      if (hit.addHint) map[key].hints.push(hit.addHint);
    });
    return map;
  }, [activeRuleHits]);

  const handleSave = async () => {
    if (!card) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/pikaohjeet/${card.slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sections: card.sections?.map(s => ({ ...s, content: draftSections[s.key] })),
          fields: card.fields,
          rules: card.rules
        }),
      });
      if (!res.ok) throw new Error("Tallennus epäonnistui");
      setSaveOk("Tallennettu");
      setIsEditing(false);
      await fetchCard(card.slug);
      setTimeout(() => setSaveOk(null), 2500);
    } catch (e: any) {
      setSaveErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const renderFieldInput = (f: ClinicalField) => {
    const value = params[f.key];
    const inputBase = "w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/10 font-medium text-sm transition-all";
    const btnBase = "px-4 py-2 rounded-lg text-xs font-semibold border transition-all shadow-sm";

    if (f.type === "boolean" || f.type === "select") {
      const opts = f.type === "boolean" ? ["kyllä", "ei"] : f.options;
      return (
        <div className="flex flex-wrap gap-2">
          {opts.map(opt => {
            const isActive = f.type === "boolean" 
              ? (opt === "kyllä" ? (value === true || value === "kyllä") : (value === false || value === "ei"))
              : String(value) === opt;
            return (
              <button
                key={opt}
                onClick={() => setParams(p => ({ ...p, [f.key]: f.type === "boolean" ? (opt === "kyllä") : opt }))}
                className={classNames(btnBase, isActive ? "bg-slate-800 text-white border-slate-800" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50")}
              >
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </button>
            );
          })}
        </div>
      );
    }

    return (
      <div className="relative">
        <input
          className={inputBase}
          placeholder={f.placeholder ?? ""}
          value={value ?? ""}
          onChange={(e) => setParams(p => ({ ...p, [f.key]: e.target.value }))}
          inputMode={f.type === "number" ? "decimal" : undefined}
        />
        {f.unit && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase">{f.unit}</div>}
      </div>
    );
  };

  return (
    <div className="max-w-[1600px] mx-auto h-[calc(100vh-100px)] flex flex-col gap-4 p-4 text-slate-900 font-sans">
      {/* Header */}
      <header className="flex items-center justify-between bg-white px-8 py-4 rounded-3xl border shadow-sm flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
            <BookOpen size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Pikaohjeet</h1>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Kliiniset kortit — terveysasema</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {saveOk && <div className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 border border-emerald-100"><CheckCircle2 size={14} />{saveOk}</div>}
          {card && (
            <button onClick={() => setIsEditing(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 shadow-md transition-all active:scale-95 text-xs flex items-center gap-2">
              <Edit2 size={14} /> Muokkaa
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 grid grid-cols-12 gap-6 min-h-0 overflow-hidden">
        {/* Left: Sidebar */}
        <aside className="col-span-3 flex flex-col gap-4 min-h-0">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              placeholder="Etsi pikaohje..."
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/10 font-medium text-sm transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {loadingList ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" /></div> : 
              filteredCards.map(c => (
                <button
                  key={c.slug}
                  onClick={() => setActiveSlug(c.slug)}
                  className={classNames(
                    "w-full text-left p-4 rounded-2xl border transition-all relative group",
                    activeSlug === c.slug ? "bg-blue-600 text-white border-blue-600 shadow-lg" : "bg-white border-slate-100 hover:border-blue-200"
                  )}
                >
                  <span className="font-semibold text-sm truncate block">{c.title}</span>
                  {c.subtitle && <span className={classNames("text-[11px] block mt-0.5 truncate", activeSlug === c.slug ? "text-white/80" : "text-slate-400")}>{c.subtitle}</span>}
                  <ChevronRight size={14} className={classNames("absolute right-4 top-1/2 -translate-y-1/2 transition-all", activeSlug === c.slug ? "opacity-100" : "opacity-0 translate-x-1 group-hover:opacity-100")} />
                </button>
              ))
            }
          </div>
        </aside>

        {/* Right: Content Area */}
        <section className="col-span-9 min-h-0">
          {!card ? (
            <div className="h-full bg-white rounded-[2rem] border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-3">
              <BookOpen size={48} strokeWidth={1} className="opacity-20" />
              <span className="font-semibold text-xs uppercase tracking-widest opacity-50">Valitse ohje listasta</span>
            </div>
          ) : (
            <div className="grid grid-cols-12 h-full gap-6">
              {/* Parameters Column */}
              <div className="col-span-4 bg-white rounded-[2rem] border shadow-sm flex flex-col overflow-hidden">
                <div className="px-6 py-4 border-b bg-slate-50/50 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-blue-500" />
                    <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider">Potilasparametrit</span>
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase bg-white px-2 py-1 rounded-md border">{card.audience}</span>
                </div>
                <div className="p-6 flex-1 overflow-y-auto space-y-5 custom-scrollbar">
                  {card.fields?.sort((a,b)=>a.order-b.order).map(f => (
                    <div key={f.key} className="space-y-2 animate-in fade-in duration-500">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">{f.label}</label>
                      {renderFieldInput(f)}
                    </div>
                  ))}
                  {activeRuleHits.some(h => !h.highlightSectionKey) && (
                    <div className="pt-4 space-y-2 border-t">
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Huomiot</span>
                       {activeRuleHits.filter(h => !h.highlightSectionKey).map((h, i) => (
                         <div key={i} className={classNames("p-3 rounded-xl text-xs font-semibold border leading-snug shadow-sm", 
                           h.severity === "danger" ? "bg-rose-50 border-rose-100 text-rose-700" : 
                           h.severity === "warning" ? "bg-amber-50 border-amber-100 text-amber-700" : "bg-blue-50 border-blue-100 text-blue-700"
                         )}>
                           {h.addHint}
                         </div>
                       ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Guide Content Column */}
              <div className="col-span-8 bg-blue-50/20 rounded-[2rem] flex flex-col overflow-hidden border border-blue-100 shadow-sm relative">
                <div className="px-8 py-4 border-b border-blue-100 bg-white/80 backdrop-blur-sm flex justify-between items-center">
                  <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> Kliininen Ohje
                  </span>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Päivitetty: {new Date(card.updatedAt).toLocaleDateString("fi-FI")}</div>
                </div>

                <div className="p-10 flex-1 overflow-y-auto custom-scrollbar space-y-8">
                  <header>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-800">{card.title}</h2>
                    {card.subtitle && <p className="text-sm text-slate-500 font-medium mt-1">{card.subtitle}</p>}
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {card.tags?.map(t => <span key={t} className="px-2.5 py-1 rounded-lg bg-white border text-[10px] font-bold text-slate-500 uppercase tracking-wide shadow-sm">#{t}</span>)}
                    </div>
                  </header>

                  <div className="space-y-6">
                    {card.sections?.sort((a,b)=>a.order-b.order).map(s => {
                      const hl = sectionHighlights[s.key];
                      return (
                        <div key={s.key} className={classNames(
                          "rounded-2xl border p-6 transition-all duration-500 shadow-sm",
                          hl?.severity === "danger" ? "bg-rose-50 border-rose-200" :
                          hl?.severity === "warning" ? "bg-amber-50 border-amber-200" :
                          hl?.severity === "info" ? "bg-blue-50 border-blue-200" : "bg-white border-slate-100"
                        )}>
                          <div className="flex justify-between items-start gap-4 mb-4">
                            <h3 className={classNames("text-xs font-bold uppercase tracking-widest", 
                              hl?.severity === "danger" ? "text-rose-800" : hl?.severity === "warning" ? "text-amber-800" : "text-slate-800"
                            )}>{s.title}</h3>
                            {hl?.hints.map((hint, i) => (
                              <div key={i} className="px-3 py-1 bg-white/60 border border-white rounded-lg text-[10px] font-bold flex items-center gap-1.5">
                                <AlertTriangle size={10} /> {hint}
                              </div>
                            ))}
                          </div>
                          <div className="text-[15px] font-normal text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {s.content}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Styles for scrollbar */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>

      {/* Editor Modal */}
      {isEditing && card && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-6 animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-4xl w-full h-[85vh] flex flex-col overflow-hidden border">
            <header className="p-6 bg-slate-800 text-white flex justify-between items-center">
              <span className="font-bold text-sm uppercase tracking-widest flex items-center gap-2"><Edit2 size={16}/> Muokkaa: {card.title}</span>
              <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={20}/></button>
            </header>
            <div className="p-8 flex-1 overflow-y-auto space-y-6">
              {card.sections?.sort((a,b)=>a.order-b.order).map(s => (
                <div key={s.key} className="space-y-2">
                  <label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest ml-1">{s.title}</label>
                  <textarea 
                    className="w-full p-5 bg-slate-50 border rounded-2xl min-h-[140px] text-sm font-medium focus:ring-4 focus:ring-blue-500/5 outline-none focus:bg-white transition-all"
                    value={draftSections[s.key] ?? ""}
                    onChange={e => setDraftSections(d => ({ ...d, [s.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <footer className="p-6 border-t bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setIsEditing(false)} className="px-6 py-3 font-bold text-xs uppercase tracking-widest text-slate-500 hover:text-slate-700">Peruuta</button>
              <button onClick={handleSave} disabled={saving} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold uppercase text-[11px] tracking-widest shadow-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Tallenna muutokset
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
