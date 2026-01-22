"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  BookOpen, Search, Loader2, ChevronRight, Sparkles, Edit2, X, Save,
  AlertTriangle, Info, CheckCircle2, History, Tag, Trash2, Plus, 
  Settings, FileText, Zap, ChevronDown
} from "lucide-react";
import ReactMarkdown from "react-markdown";

// --- Types ---
type ClinicalCard = {
  id: number; slug: string; title: string; subtitle?: string | null;
  environment: string; audience: string; tags: string[];
  isPublished: boolean; updatedAt: string; createdAt: string;
  updatedByUserId?: string | null; updatedByEmail?: string | null; updatedByName?: string | null;
  sections?: ClinicalSection[]; fields?: ClinicalField[]; rules?: ClinicalRule[];
  revisions?: ClinicalRevision[];
};

type ClinicalSection = {
  id: number; cardId: number; key: string; title: string; order: number;
  content: string; highlightCallout?: string | null;
};

type ClinicalField = {
  id: number; cardId: number; key: string; label: string; type: string;
  unit?: string | null; placeholder?: string | null; options: string[];
  order: number; isUniversal: boolean;
};

type ClinicalRule = {
  id: number; cardId: number; fieldKey: string; operator: string;
  value: string; highlightSectionKey?: string | null; addHint?: string | null;
  priority: number;
};

type ClinicalRevision = {
  id: number; cardId: number; createdAt: string; editorUserId?: string | null;
  editorEmail?: string | null; editorName?: string | null; action: string;
  summary?: string | null; payload?: any;
};

function classNames(...arr: Array<string | false | null | undefined>) {
  return arr.filter(Boolean).join(" ");
}

// --- Logic Engine ---
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
  
  const fn = safeNum(fieldValue);
  const rn = safeNum(rhsRaw);

  if (op === "eq" || op === "==") return (fn !== null && rn !== null) ? fn === rn : fvStr === rhsStr;
  if (op === "gt" || op === ">") return fn !== null && rn !== null && fn > rn;
  if (op === "lt" || op === "<") return fn !== null && rn !== null && fn < rn;
  if (op === "gte" || op === ">=") return fn !== null && rn !== null && fn >= rn;
  if (op === "lte" || op === "<=") return fn !== null && rn !== null && fn <= rn;

  return false;
}

// --- UI Component ---
export default function PikaohjeetPage() {
  const { data: session } = useSession();

  const [loadingList, setLoadingList] = useState(true);
  const [cards, setCards] = useState<ClinicalCard[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  const [loadingCard, setLoadingCard] = useState(false);
  const [card, setCard] = useState<ClinicalCard | null>(null);
  const [params, setParams] = useState<Record<string, any>>({});

  // Editor State
  const [isEditing, setIsEditing] = useState(false);
  const [editTab, setEditTab] = useState<"content" | "fields" | "rules">("content");
  const [draft, setDraft] = useState<{
    sections: ClinicalSection[];
    fields: ClinicalField[];
    rules: ClinicalRule[];
  }>({ sections: [], fields: [], rules: [] });
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  useEffect(() => { fetchCards(); }, []);
  useEffect(() => { setParams({}); setSaveOk(null); setSaveErr(null); }, [activeSlug]);
  useEffect(() => { if (activeSlug) fetchCard(activeSlug); }, [activeSlug]);

  const fetchCards = async () => {
    setLoadingList(true);
    try {
      const res = await fetch("/api/pikaohjeet", { cache: "no-store" });
      const data = await res.json();
      setCards(data.sort((a: any, b: any) => a.title.localeCompare(b.title, "fi")));
      if (!activeSlug && data.length > 0) setActiveSlug(data[0].slug);
    } catch (e) { console.error(e); } finally { setLoadingList(false); }
  };

  const fetchCard = async (slug: string) => {
    setLoadingCard(true);
    try {
      const res = await fetch(`/api/pikaohjeet/${encodeURIComponent(slug)}`, { cache: "no-store" });
      const data = await res.json();
      setCard(data);
      setDraft({
        sections: [...(data.sections || [])],
        fields: [...(data.fields || [])],
        rules: [...(data.rules || [])]
      });
    } catch (e) { setCard(null); } finally { setLoadingCard(false); }
  };

  const filteredCards = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return cards.filter(c => `${c.title} ${c.subtitle ?? ""} ${c.tags?.join(" ")}`.toLowerCase().includes(q));
  }, [cards, searchTerm]);

  const activeRuleHits = useMemo(() => {
    return (card?.rules || [])
      .filter(r => evalRule(r, params[r.fieldKey]))
      .map(r => ({ ...r, severity: r.priority <= 20 ? "danger" : r.priority <= 40 ? "warning" : "info" }));
  }, [card, params]);

  const sectionHighlights = useMemo(() => {
    const map: Record<string, { severity: string; hints: string[] }> = {};
    activeRuleHits.forEach(hit => {
      const key = hit.highlightSectionKey;
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
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error("Tallennusvirhe");
      setSaveOk("Tallennettu");
      setIsEditing(false);
      await fetchCard(card.slug);
      setTimeout(() => setSaveOk(null), 2500);
    } catch (e: any) { setSaveErr(e.message); } finally { setSaving(false); }
  };

  // --- Render Helpers ---
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
              <button key={opt} onClick={() => setParams(p => ({ ...p, [f.key]: f.type === "boolean" ? (opt === "kyllä") : opt }))}
                className={classNames(btnBase, isActive ? "bg-slate-800 text-white border-slate-800" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50")}>
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </button>
            );
          })}
        </div>
      );
    }

    return (
      <div className="relative">
        <input className={inputBase} placeholder={f.placeholder ?? ""} value={value ?? ""}
          onChange={(e) => setParams(p => ({ ...p, [f.key]: e.target.value }))} inputMode={f.type === "number" ? "decimal" : undefined} />
        {f.unit && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase">{f.unit}</div>}
      </div>
    );
  };

  return (
    <div className="max-w-[1600px] mx-auto h-[calc(100vh-100px)] flex flex-col gap-4 p-4 text-slate-900 font-sans">
      <header className="flex items-center justify-between bg-white px-8 py-4 rounded-3xl border shadow-sm flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-100"><BookOpen size={20} /></div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Pikaohjeet</h1>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Kliiniset kortit — terveysasema</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {saveOk && <div className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 border border-emerald-100"><CheckCircle2 size={14} />{saveOk}</div>}
          {card && <button onClick={() => setIsEditing(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 shadow-md transition-all active:scale-95 text-xs flex items-center gap-2"><Edit2 size={14} /> Muokkaa</button>}
        </div>
      </header>

      <main className="flex-1 grid grid-cols-12 gap-6 min-h-0 overflow-hidden">
        {/* Left List */}
        <aside className="col-span-3 flex flex-col gap-4 min-h-0">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input placeholder="Etsi pikaohje..." className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/10 font-medium text-sm transition-all shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {loadingList ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" /></div> : 
              filteredCards.map(c => (
                <button key={c.slug} onClick={() => setActiveSlug(c.slug)} className={classNames("w-full text-left p-4 rounded-2xl border transition-all relative group", activeSlug === c.slug ? "bg-blue-600 text-white border-blue-600 shadow-lg" : "bg-white border-slate-100 hover:border-blue-200")}>
                  <span className="font-semibold text-sm truncate block">{c.title}</span>
                  {c.subtitle && <span className={classNames("text-[11px] block mt-0.5 truncate", activeSlug === c.slug ? "text-white/80" : "text-slate-400")}>{c.subtitle}</span>}
                  <ChevronRight size={14} className={classNames("absolute right-4 top-1/2 -translate-y-1/2 transition-all", activeSlug === c.slug ? "opacity-100" : "opacity-0 translate-x-1 group-hover:opacity-100")} />
                </button>
              ))
            }
          </div>
        </aside>

        {/* Right Content */}
        <section className="col-span-9 min-h-0">
          {!card ? (
            <div className="h-full bg-white rounded-[2rem] border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-3">
              <BookOpen size={48} strokeWidth={1} className="opacity-20" />
              <span className="font-semibold text-xs uppercase tracking-widest opacity-50">Valitse ohje listasta</span>
            </div>
          ) : (
            <div className="grid grid-cols-12 h-full gap-6">
              {/* Parameters */}
              <div className="col-span-4 bg-white rounded-[2rem] border shadow-sm flex flex-col overflow-hidden">
                <div className="px-6 py-4 border-b bg-slate-50/50 flex justify-between items-center">
                  <div className="flex items-center gap-2"><Sparkles size={14} className="text-blue-500" /><span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider">Potilasparametrit</span></div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase bg-white px-2 py-1 rounded-md border">{card.audience}</span>
                </div>
                <div className="p-6 flex-1 overflow-y-auto space-y-5 custom-scrollbar">
                  {card.fields?.sort((a,b)=>a.order-b.order).map(f => (
                    <div key={f.key} className="space-y-2 animate-in fade-in duration-500">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">{f.label}</label>
                      {renderFieldInput(f)}
                    </div>
                  ))}
                </div>
              </div>

              {/* Guide Content */}
              <div className="col-span-8 bg-blue-50/20 rounded-[2rem] flex flex-col overflow-hidden border border-blue-100 shadow-sm relative">
                <div className="p-10 flex-1 overflow-y-auto custom-scrollbar space-y-8">
                  <header>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-800">{card.title}</h2>
                    {card.subtitle && <p className="text-sm text-slate-500 font-medium mt-1">{card.subtitle}</p>}
                    <div className="flex flex-wrap gap-1.5 mt-4">{card.tags?.map(t => <span key={t} className="px-2.5 py-1 rounded-lg bg-white border text-[10px] font-bold text-slate-500 uppercase tracking-wide shadow-sm">#{t}</span>)}</div>
                  </header>

                  <div className="space-y-6">
                    {card.sections?.sort((a,b)=>a.order-b.order).map(s => {
                      const hl = sectionHighlights[s.key];
                      return (
                        <div key={s.key} className={classNames("rounded-2xl border p-6 transition-all duration-500 shadow-sm", hl?.severity === "danger" ? "bg-rose-50 border-rose-200" : hl?.severity === "warning" ? "bg-amber-50 border-amber-200" : hl?.severity === "info" ? "bg-blue-50 border-blue-200" : "bg-white border-slate-100")}>
                          <div className="flex justify-between items-start gap-4 mb-4">
                            <h3 className={classNames("text-xs font-bold uppercase tracking-widest", hl?.severity === "danger" ? "text-rose-800" : hl?.severity === "warning" ? "text-amber-800" : "text-slate-800")}>{s.title}</h3>
                            <div className="flex gap-1">{hl?.hints.map((h, i) => <div key={i} className="px-3 py-1 bg-white/60 border border-white rounded-lg text-[10px] font-bold flex items-center gap-1.5"><AlertTriangle size={10} /> {h}</div>)}</div>
                          </div>
                          <div className="text-[15px] font-normal text-slate-700 leading-relaxed prose prose-sm max-w-none">
                            <ReactMarkdown>{s.content}</ReactMarkdown>
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
      <style jsx global>{`.custom-scrollbar::-webkit-scrollbar { width: 5px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }`}</style>

      {/* CMS MODAL */}
      {isEditing && card && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6 animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-5xl w-full h-[90vh] flex flex-col overflow-hidden border">
            {/* Modal Header */}
            <header className="p-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-6">
                <span className="font-bold text-sm uppercase tracking-widest flex items-center gap-2"><Settings size={18}/> Muokkaa korttia</span>
                <nav className="flex bg-slate-800 p-1 rounded-xl">
                  <button onClick={()=>setEditTab("content")} className={classNames("px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all", editTab === "content" ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-white")}>Sisältö</button>
                  <button onClick={()=>setEditTab("fields")} className={classNames("px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all", editTab === "fields" ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-white")}>Kentät</button>
                  <button onClick={()=>setEditTab("rules")} className={classNames("px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all", editTab === "rules" ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-white")}>Säännöt</button>
                </nav>
              </div>
              <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={24}/></button>
            </header>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {/* TAB: CONTENT */}
              {editTab === "content" && (
                <div className="space-y-6">
                  {draft.sections.sort((a,b)=>a.order-b.order).map((s, idx) => (
                    <div key={idx} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4 relative group">
                      <button onClick={()=>setDraft(d => ({ ...d, sections: d.sections.filter((_,i)=>i!==idx) }))} className="absolute right-4 top-4 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                      <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-8 space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Otsikko</label>
                          <input className="w-full p-3 border rounded-xl font-semibold" value={s.title} onChange={e => {
                            const newSecs = [...draft.sections]; newSecs[idx].title = e.target.value; setDraft({...draft, sections: newSecs});
                          }} />
                        </div>
                        <div className="col-span-4 space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Avain (Key)</label>
                          <input className="w-full p-3 border rounded-xl font-mono text-xs bg-white" value={s.key} onChange={e => {
                            const newSecs = [...draft.sections]; newSecs[idx].key = e.target.value; setDraft({...draft, sections: newSecs});
                          }} />
                        </div>
                      </div>
                      <textarea className="w-full p-5 border rounded-2xl min-h-[160px] text-sm font-medium" value={s.content} onChange={e => {
                        const newSecs = [...draft.sections]; newSecs[idx].content = e.target.value; setDraft({...draft, sections: newSecs});
                      }} />
                    </div>
                  ))}
                  <button onClick={()=>setDraft(d => ({ ...d, sections: [...d.sections, { id:0, cardId:card.id, key:`sec_${Date.now()}`, title:"Uusi osio", order: d.sections.length*10, content:"" }] }))} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-all flex items-center justify-center gap-2 font-bold text-sm uppercase tracking-widest"><Plus size={18}/> Lisää osio</button>
                </div>
              )}

              {/* TAB: FIELDS */}
              {editTab === "fields" && (
                <div className="space-y-4">
                  {draft.fields.sort((a,b)=>a.order-b.order).map((f, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-4 p-5 bg-slate-50 rounded-2xl border items-end relative group">
                      <div className="col-span-3 space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Nimi (Label)</label>
                        <input className="w-full p-2.5 border rounded-xl text-sm" value={f.label} onChange={e => {
                           const newF = [...draft.fields]; newF[idx].label = e.target.value; setDraft({...draft, fields: newF});
                        }} />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Tyyppi</label>
                        <select className="w-full p-2.5 border rounded-xl text-sm bg-white" value={f.type} onChange={e => {
                           const newF = [...draft.fields]; newF[idx].type = e.target.value; setDraft({...draft, fields: newF});
                        }}>
                          <option value="number">Number</option>
                          <option value="boolean">Boolean</option>
                          <option value="select">Select</option>
                        </select>
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Yksikkö (Unit)</label>
                        <input className="w-full p-2.5 border rounded-xl text-sm" value={f.unit || ""} onChange={e => {
                           const newF = [...draft.fields]; newF[idx].unit = e.target.value; setDraft({...draft, fields: newF});
                        }} />
                      </div>
                      <div className="col-span-3 space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Avain (Key)</label>
                        <input className="w-full p-2.5 border rounded-xl text-sm font-mono bg-white" value={f.key} onChange={e => {
                           const newF = [...draft.fields]; newF[idx].key = e.target.value; setDraft({...draft, fields: newF});
                        }} />
                      </div>
                      <div className="col-span-2 flex justify-center pb-2">
                        <button onClick={()=>setDraft(d => ({ ...d, fields: d.fields.filter((_,i)=>i!==idx) }))} className="p-2 text-slate-300 hover:text-rose-500 transition-all"><Trash2 size={18}/></button>
                      </div>
                    </div>
                  ))}
                  <button onClick={()=>setDraft(d => ({ ...d, fields: [...d.fields, { id:0, cardId:card.id, key:`f_${Date.now()}`, label:"Uusi kenttä", type:"number", options:[], order: d.fields.length*10, isUniversal:false }] }))} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-all flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-widest"><Plus size={16}/> Lisää kenttä</button>
                </div>
              )}

              {/* TAB: RULES */}
              {editTab === "rules" && (
                <div className="space-y-4">
                  {draft.rules.map((r, idx) => (
                    <div key={idx} className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100 flex flex-col gap-4 relative group">
                      <button onClick={()=>setDraft(d => ({ ...d, rules: d.rules.filter((_,i)=>i!==idx) }))} className="absolute right-4 top-4 text-slate-300 hover:text-rose-500"><Trash2 size={16}/></button>
                      <div className="flex items-center gap-4 flex-wrap">
                        <span className="text-[10px] font-bold text-blue-600 uppercase">Jos</span>
                        <select className="p-2.5 border rounded-xl text-xs bg-white min-w-[140px]" value={r.fieldKey} onChange={e => {
                          const newR = [...draft.rules]; newR[idx].fieldKey = e.target.value; setDraft({...draft, rules: newR});
                        }}>
                          {draft.fields.map(f => <option key={f.key} value={f.key}>{f.label} ({f.key})</option>)}
                        </select>
                        <select className="p-2.5 border rounded-xl text-xs bg-white" value={r.operator} onChange={e => {
                          const newR = [...draft.rules]; newR[idx].operator = e.target.value; setDraft({...draft, rules: newR});
                        }}>
                          <option value=">">&gt;</option><option value="<">&lt;</option><option value="==">==</option><option value="truthy">on Kyllä</option>
                        </select>
                        <input className="p-2.5 border rounded-xl text-xs w-24" value={r.value} onChange={e => {
                           const newR = [...draft.rules]; newR[idx].value = e.target.value; setDraft({...draft, rules: newR});
                        }} />
                        <span className="text-[10px] font-bold text-blue-600 uppercase">niin korosta</span>
                        <select className="p-2.5 border rounded-xl text-xs bg-white min-w-[140px]" value={r.highlightSectionKey || ""} onChange={e => {
                          const newR = [...draft.rules]; newR[idx].highlightSectionKey = e.target.value; setDraft({...draft, rules: newR});
                        }}>
                          <option value="">(Ei mitään)</option>
                          {draft.sections.map(s => <option key={s.key} value={s.key}>{s.title}</option>)}
                        </select>
                      </div>
                      <div className="flex items-center gap-4">
                         <div className="flex-1 space-y-1">
                           <label className="text-[9px] font-bold text-slate-400 uppercase">Huomioteksti (Hint)</label>
                           <input className="w-full p-2.5 border rounded-xl text-xs" value={r.addHint || ""} onChange={e => {
                             const newR = [...draft.rules]; newR[idx].addHint = e.target.value; setDraft({...draft, rules: newR});
                           }} />
                         </div>
                         <div className="w-32 space-y-1">
                           <label className="text-[9px] font-bold text-slate-400 uppercase">Väri (Priority)</label>
                           <select className="w-full p-2.5 border rounded-xl text-xs bg-white" value={r.priority} onChange={e => {
                             const newR = [...draft.rules]; newR[idx].priority = parseInt(e.target.value); setDraft({...draft, rules: newR});
                           }}>
                             <option value="50">Info (Sininen)</option><option value="40">Warning (Keltainen)</option><option value="20">Danger (Punainen)</option>
                           </select>
                         </div>
                      </div>
                    </div>
                  ))}
                  <button onClick={()=>setDraft(d => ({ ...d, rules: [...d.rules, { id:0, cardId:card.id, fieldKey:draft.fields[0]?.key || "", operator:">", value:"0", highlightSectionKey:null, addHint:"", priority:50 }] }))} className="w-full py-3 border-2 border-dashed border-blue-200 rounded-2xl text-blue-400 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-widest"><Zap size={16}/> Lisää sääntö</button>
                </div>
              )}
            </div>

            <footer className="p-6 border-t bg-slate-50 flex justify-between items-center shrink-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Muutokset tallentuvat globaalisti kaikille käyttäjille.</p>
              <div className="flex gap-3">
                <button onClick={() => setIsEditing(false)} className="px-6 py-3 font-bold text-xs uppercase tracking-widest text-slate-500 hover:text-slate-700">Peruuta</button>
                <button onClick={handleSave} disabled={saving} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold uppercase text-[11px] tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Tallenna kortti
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
