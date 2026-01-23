"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  BookOpen, Search, Loader2, ChevronRight, Sparkles, Edit2, X, Save,
  AlertTriangle, CheckCircle2, Trash2, Plus, 
  Settings, Zap
} from "lucide-react";
import ReactMarkdown from "react-markdown";

// --- Types ---
type ClinicalCard = {
  id: number; slug: string; title: string; subtitle?: string | null;
  environment: string; audience: string; tags: string[];
  isPublished: boolean; updatedAt: string; createdAt: string;
  sections?: ClinicalSection[]; fields?: ClinicalField[]; rules?: ClinicalRule[];
};

type ClinicalSection = {
  id?: number; cardId?: number; key: string; title: string; order: number;
  content: string; highlightCallout?: string | null;
};

type ClinicalField = {
  id?: number; cardId?: number; key: string; label: string; type: string;
  unit?: string | null; placeholder?: string | null; options: string[];
  order: number; isUniversal: boolean;
};

type ClinicalRule = {
  id?: number; cardId?: number; fieldKey: string; operator: string;
  value: string; highlightSectionKey?: string | null; addHint?: string | null;
  priority: number;
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
  
  if (op === "truthy" || op === "true") {
    if (typeof fieldValue === "boolean") return fieldValue;
    return ["1", "true", "yes", "kyllä", "on"].includes(fvStr);
  }
  
  const fn = safeNum(fieldValue);
  const rn = safeNum(rhsRaw);

  if (op === "eq" || op === "==") return (fn !== null && rn !== null) ? fn === rn : fvStr === String(rhsRaw).toLowerCase();
  if (op === "gt" || op === ">") return fn !== null && rn !== null && fn > rn;
  if (op === "lt" || op === "<") return fn !== null && rn !== null && fn < rn;
  if (op === "gte" || op === ">=") return fn !== null && rn !== null && fn >= rn;
  if (op === "lte" || op === "<=") return fn !== null && rn !== null && fn <= rn;

  return false;
}

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
  const [editTab, setEditTab] = useState<"content" | "fields" | "rules">("content");
  
  // States for renaming
  const [draftTitle, setDraftTitle] = useState("");
  const [draftSubtitle, setDraftSubtitle] = useState("");
  
  const [draft, setDraft] = useState<{
    sections: ClinicalSection[];
    fields: ClinicalField[];
    rules: ClinicalRule[];
  }>({ sections: [], fields: [], rules: [] });
  
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState<string | null>(null);

  useEffect(() => { fetchCards(); }, []);
  useEffect(() => { setParams({}); setSaveOk(null); }, [activeSlug]);
  useEffect(() => { if (activeSlug) fetchCard(activeSlug); }, [activeSlug]);

  const fetchCards = async () => {
    setLoadingList(true);
    try {
      const res = await fetch("/api/pikaohjeet", { cache: "no-store" });
      const data = await res.json();
      setCards(Array.isArray(data) ? data : []);
      if (!activeSlug && data.length > 0) setActiveSlug(data[0].slug);
    } catch (e) { console.error(e); } finally { setLoadingList(false); }
  };

  const fetchCard = async (slug: string) => {
    setLoadingCard(true);
    try {
      const res = await fetch(`/api/pikaohjeet/${encodeURIComponent(slug)}`, { cache: "no-store" });
      const data = await res.json();
      setCard(data);
    } catch (e) { setCard(null); } finally { setLoadingCard(false); }
  };

  const startEditing = () => {
    if (!card) return;
    setDraftTitle(card.title);
    setDraftSubtitle(card.subtitle || "");
    setDraft({
      sections: JSON.parse(JSON.stringify(card.sections || [])),
      fields: JSON.parse(JSON.stringify(card.fields || [])),
      rules: JSON.parse(JSON.stringify(card.rules || []))
    });
    setIsEditing(true);
  };

  const handleCreateNew = async () => {
    const title = prompt("Anna uuden kortin nimi (esim. Verenpaine):");
    if (!title) return;
    try {
      const res = await fetch("/api/pikaohjeet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Virhe luomisessa");
      await fetchCards();
      setActiveSlug(data.slug);
    } catch (e: any) { alert(e.message); }
  };

  const handleDelete = async (slug: string) => {
    if (!confirm("Haluatko varmasti poistaa tämän ohjeen lopullisesti?")) return;
    try {
      const res = await fetch(`/api/pikaohjeet/${slug}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Poisto epäonnistui");
      if (activeSlug === slug) setActiveSlug(null);
      await fetchCards();
    } catch (e: any) { alert(e.message); }
  };

  const handleSave = async () => {
    if (!card) return;
    setSaving(true);
    try {
      const cleanDraft = {
        title: draftTitle,
        subtitle: draftSubtitle,
        sections: draft.sections.map(({ id, cardId, ...rest }) => rest),
        fields: draft.fields.map(({ id, cardId, ...rest }) => rest),
        rules: draft.rules.map(({ id, cardId, ...rest }) => rest),
      };

      const res = await fetch(`/api/pikaohjeet/${card.slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanDraft),
      });
      
      if (!res.ok) throw new Error("Tallennusvirhe");
      
      setSaveOk("Tallennettu onnistuneesti");
      setIsEditing(false);
      await fetchCard(card.slug);
      await fetchCards();
      setTimeout(() => setSaveOk(null), 3000);
    } catch (e: any) { 
      alert(e.message); 
    } finally { 
      setSaving(false); 
    }
  };

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

  const renderFieldInput = (f: ClinicalField) => {
    const value = params[f.key];
    const inputBase = "w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/10 font-medium text-sm transition-all shadow-inner";
    
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
                className={classNames("px-4 py-2 rounded-lg text-xs font-semibold border transition-all shadow-sm", isActive ? "bg-slate-800 text-white border-slate-800 shadow-md scale-[1.02]" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50")}>
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
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Kliiniset ohjekortit</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {saveOk && <div className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 border border-emerald-100 animate-in zoom-in-95"><CheckCircle2 size={14} />{saveOk}</div>}
          {card && <button onClick={startEditing} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 shadow-md transition-all active:scale-95 text-xs flex items-center gap-2"><Edit2 size={14} /> Muokkaa</button>}
        </div>
      </header>

      <main className="flex-1 grid grid-cols-12 gap-6 min-h-0 overflow-hidden">
        <aside className="col-span-3 flex flex-col gap-4 min-h-0">
          <button onClick={handleCreateNew} className="w-full py-3 bg-blue-50 text-blue-600 border border-blue-200 border-dashed rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-blue-100 transition-all flex items-center justify-center gap-2 shadow-sm">
            <Plus size={16} /> Uusi pikaohje
          </button>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input placeholder="Etsi pikaohje..." className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/10 font-medium text-sm transition-all shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {loadingList ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" /></div> : 
              cards.filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase())).map(c => (
                <div key={c.slug} className="group relative">
                  <button onClick={() => setActiveSlug(c.slug)} className={classNames("w-full text-left p-4 rounded-2xl border transition-all relative pr-12", activeSlug === c.slug ? "bg-blue-600 text-white border-blue-600 shadow-lg translate-x-1" : "bg-white border-slate-100 hover:border-blue-200 hover:bg-slate-50")}>
                    <span className="font-bold text-sm truncate block">{c.title}</span>
                    {c.subtitle && <span className={classNames("text-[10px] block opacity-70 truncate", activeSlug === c.slug ? "text-white" : "text-slate-500")}>{c.subtitle}</span>}
                    <ChevronRight size={14} className={classNames("absolute right-4 top-1/2 -translate-y-1/2 transition-all", activeSlug === c.slug ? "opacity-100" : "opacity-0 translate-x-1 group-hover:opacity-100")} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(c.slug); }}
                    className="absolute right-10 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all z-10"
                    title="Poista"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            }
          </div>
        </aside>

        <section className="col-span-9 min-h-0">
          {loadingCard ? (
            <div className="h-full flex items-center justify-center bg-white rounded-[2rem] border shadow-inner"><Loader2 className="animate-spin text-blue-500" /></div>
          ) : !card ? (
            <div className="h-full bg-white rounded-[2rem] border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-3">
              <BookOpen size={48} strokeWidth={1} className="opacity-20" />
              <span className="font-semibold text-xs uppercase tracking-widest opacity-50 font-black">Valitse ohje listasta</span>
            </div>
          ) : (
            <div className="grid grid-cols-12 h-full gap-6 animate-in fade-in duration-300">
              <div className="col-span-4 bg-white rounded-[2rem] border shadow-sm flex flex-col overflow-hidden">
                <div className="px-6 py-4 border-b bg-slate-50/50 flex justify-between items-center">
                  <div className="flex items-center gap-2 text-blue-600"><Sparkles size={14}/><span className="font-bold uppercase text-[10px] tracking-wider">Parametrit</span></div>
                </div>
                <div className="p-6 flex-1 overflow-y-auto space-y-5 custom-scrollbar">
                  {card.fields?.sort((a,b)=>a.order-b.order).map(f => (
                    <div key={f.key} className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{f.label}</label>
                      {renderFieldInput(f)}
                    </div>
                  ))}
                </div>
              </div>

              <div className="col-span-8 bg-blue-50/20 rounded-[2rem] flex flex-col overflow-hidden border border-blue-100 shadow-sm">
                <div className="p-10 flex-1 overflow-y-auto custom-scrollbar space-y-8">
                  <header className="border-b border-blue-100 pb-6">
                    <h2 className="text-3xl font-bold tracking-tight text-slate-800">{card.title}</h2>
                    {card.subtitle && <p className="text-md text-slate-500 font-medium mt-2">{card.subtitle}</p>}
                  </header>

                  <div className="space-y-6">
                    {card.sections?.sort((a,b)=>a.order-b.order).map(s => {
                      const hl = sectionHighlights[s.key];
                      return (
                        <div key={s.key} className={classNames("rounded-[2rem] border p-8 transition-all duration-500 shadow-sm", hl?.severity === "danger" ? "bg-rose-50 border-rose-200 shadow-rose-100" : hl?.severity === "warning" ? "bg-amber-50 border-amber-200 shadow-amber-100" : hl?.severity === "info" ? "bg-blue-50 border-blue-200" : "bg-white border-slate-100")}>
                          <div className="flex justify-between items-start gap-4 mb-4">
                            <h3 className={classNames("text-xs font-black uppercase tracking-widest", hl?.severity === "danger" ? "text-rose-800" : hl?.severity === "warning" ? "text-amber-800" : "text-slate-800")}>{s.title}</h3>
                            <div className="flex flex-col gap-1.5">{hl?.hints.map((h, i) => <div key={i} className="px-3 py-1 bg-white/80 border border-white rounded-xl text-[10px] font-bold flex items-center gap-1.5 shadow-sm"><AlertTriangle size={12} className="text-orange-500" /> {h}</div>)}</div>
                          </div>
                          <div className="text-[15px] text-slate-700 leading-relaxed prose prose-sm max-w-none prose-slate font-medium">
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

      {/* CMS MODAL */}
      {isEditing && card && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6 animate-in fade-in">
          <div className="bg-white rounded-[3rem] shadow-2xl max-w-6xl w-full h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            <header className="p-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-8">
                <span className="font-bold text-xs uppercase tracking-[0.2em] flex items-center gap-3"><Settings size={20} className="text-blue-400"/> Hallinta</span>
                <nav className="flex bg-slate-800 p-1 rounded-2xl">
                  {["content", "fields", "rules"].map((t) => (
                    <button key={t} onClick={()=>setEditTab(t as any)} className={classNames("px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all", editTab === t ? "bg-blue-600 text-white shadow-lg" : "text-slate-500 hover:text-white")}>{t === 'content' ? 'Sisältö' : t === 'fields' ? 'Kentät' : 'Säännöt'}</button>
                  ))}
                </nav>
              </div>
              <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={24}/></button>
            </header>

            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-10">
              {/* Metatiedot */}
              <div className="grid grid-cols-2 gap-8 bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Ohjeen nimi</label>
                    <input className="w-full p-4 bg-white border-none rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 font-bold transition-all" value={draftTitle} onChange={e => setDraftTitle(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Alaotsikko (Subtitle)</label>
                    <input className="w-full p-4 bg-white border-none rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 font-bold transition-all" value={draftSubtitle} onChange={e => setDraftSubtitle(e.target.value)} />
                  </div>
              </div>

              {editTab === "content" && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4">
                  {draft.sections.sort((a,b)=>a.order-b.order).map((s, idx) => (
                    <div key={idx} className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 space-y-6 relative group shadow-sm hover:shadow-md transition-all">
                      <button onClick={()=>setDraft(d => ({ ...d, sections: d.sections.filter((_,i)=>i!==idx) }))} className="absolute right-6 top-6 text-slate-300 hover:text-rose-500 transition-all"><Trash2 size={20}/></button>
                      <div className="grid grid-cols-12 gap-6">
                        <div className="col-span-8 space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Osion Otsikko</label>
                          <input className="w-full p-4 bg-white border-none rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/5" value={s.title} onChange={e => {
                            const newSecs = [...draft.sections]; newSecs[idx].title = e.target.value; setDraft({...draft, sections: newSecs});
                          }} />
                        </div>
                        <div className="col-span-4 space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Avain (Key)</label>
                          <input className="w-full p-4 bg-white border-none rounded-2xl font-mono text-xs outline-none focus:ring-4 focus:ring-blue-500/5" value={s.key} onChange={e => {
                            const newSecs = [...draft.sections]; newSecs[idx].key = e.target.value; setDraft({...draft, sections: newSecs});
                          }} />
                        </div>
                      </div>
                      <textarea className="w-full p-8 bg-white border-none rounded-[2rem] min-h-[250px] text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/5 shadow-inner leading-relaxed" value={s.content} onChange={e => {
                        const newSecs = [...draft.sections]; newSecs[idx].content = e.target.value; setDraft({...draft, sections: newSecs});
                      }} />
                    </div>
                  ))}
                  <button onClick={()=>setDraft(d => ({ ...d, sections: [...d.sections, { key:`sec_${Date.now()}`, title:"Uusi osio", order: draft.sections.length*10, content:"" }] }))} className="w-full py-8 border-2 border-dashed border-slate-200 rounded-[2rem] text-slate-300 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/30 transition-all flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest"><Plus size={24}/> Lisää uusi osio</button>
                </div>
              )}

              {editTab === "fields" && (
                <div className="space-y-4 animate-in slide-in-from-bottom-4">
                  {draft.fields.sort((a,b)=>a.order-b.order).map((f, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-6 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 items-end relative shadow-sm">
                      <div className="col-span-3 space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Nimi (Label)</label>
                        <input className="w-full p-3.5 bg-white border-none rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5" value={f.label} onChange={e => {
                           const newF = [...draft.fields]; newF[idx].label = e.target.value; setDraft({...draft, fields: newF});
                        }} />
                      </div>
                      <div className="col-span-2 space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Tyyppi</label>
                        <select className="w-full p-3.5 bg-white border-none rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-500/5 appearance-none" value={f.type} onChange={e => {
                           const newF = [...draft.fields]; newF[idx].type = e.target.value; setDraft({...draft, fields: newF});
                        }}>
                          <option value="number">Number</option>
                          <option value="boolean">Boolean</option>
                          <option value="select">Select</option>
                        </select>
                      </div>
                      <div className="col-span-2 space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Yksikkö</label>
                        <input className="w-full p-3.5 bg-white border-none rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5" value={f.unit || ""} onChange={e => {
                           const newF = [...draft.fields]; newF[idx].unit = e.target.value; setDraft({...draft, fields: newF});
                        }} />
                      </div>
                      <div className="col-span-3 space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Avain (Key)</label>
                        <input className="w-full p-3.5 bg-white border-none rounded-xl text-xs font-mono font-bold outline-none focus:ring-4 focus:ring-blue-500/5" value={f.key} onChange={e => {
                           const newF = [...draft.fields]; newF[idx].key = e.target.value; setDraft({...draft, fields: newF});
                        }} />
                      </div>
                      <div className="col-span-2 flex justify-center pb-1">
                        <button onClick={()=>setDraft(d => ({ ...d, fields: d.fields.filter((_,i)=>i!==idx) }))} className="p-3 text-slate-300 hover:text-rose-500 transition-all"><Trash2 size={20}/></button>
                      </div>
                    </div>
                  ))}
                  <button onClick={()=>setDraft(d => ({ ...d, fields: [...d.fields, { key:`f_${Date.now()}`, label:"Uusi kenttä", type:"number", options:[], order: draft.fields.length*10, isUniversal:false }] }))} className="w-full py-6 border-2 border-dashed border-slate-200 rounded-[2rem] text-slate-300 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/30 transition-all flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest"><Plus size={20}/> Lisää kenttä</button>
                </div>
              )}

              {editTab === "rules" && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4">
                  {draft.rules.map((r, idx) => (
                    <div key={idx} className="p-8 bg-blue-50/30 rounded-[2rem] border border-blue-100 flex flex-col gap-6 relative shadow-sm">
                      <button onClick={()=>setDraft(d => ({ ...d, rules: d.rules.filter((_,i)=>i!==idx) }))} className="absolute right-6 top-6 text-slate-300 hover:text-rose-500"><Trash2 size={20}/></button>
                      <div className="flex items-center gap-6 flex-wrap">
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Jos</span>
                        <select className="p-3 bg-white border-none rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-500/5 min-w-[180px]" value={r.fieldKey} onChange={e => {
                          const newR = [...draft.rules]; newR[idx].fieldKey = e.target.value; setDraft({...draft, rules: newR});
                        }}>
                          <option value="">Valitse kenttä...</option>
                          {draft.fields.map(f => <option key={f.key} value={f.key}>{f.label} ({f.key})</option>)}
                        </select>
                        <select className="p-3 bg-white border-none rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-500/5" value={r.operator} onChange={e => {
                          const newR = [...draft.rules]; newR[idx].operator = e.target.value; setDraft({...draft, rules: newR});
                        }}>
                          <option value=">">&gt;</option><option value="<">&lt;</option><option value="==">==</option><option value="truthy">on Kyllä</option>
                        </select>
                        <input className="p-3 bg-white border-none rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-500/5 w-24" value={r.value} onChange={e => {
                           const newR = [...draft.rules]; newR[idx].value = e.target.value; setDraft({...draft, rules: newR});
                        }} />
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">niin korosta</span>
                        <select className="p-3 bg-white border-none rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-500/5 min-w-[180px]" value={r.highlightSectionKey || ""} onChange={e => {
                          const newR = [...draft.rules]; newR[idx].highlightSectionKey = e.target.value; setDraft({...draft, rules: newR});
                        }}>
                          <option value="">(Ei mitään)</option>
                          {draft.sections.map(s => <option key={s.key} value={s.key}>{s.title}</option>)}
                        </select>
                      </div>
                      <div className="flex items-center gap-8">
                         <div className="flex-1 space-y-2">
                           <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Huomioteksti (Hint)</label>
                           <input className="w-full p-3.5 bg-white border-none rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/5 shadow-inner" value={r.addHint || ""} onChange={e => {
                             const newR = [...draft.rules]; newR[idx].addHint = e.target.value; setDraft({...draft, rules: newR});
                           }} />
                         </div>
                         <div className="w-48 space-y-2">
                           <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Taso (Priority)</label>
                           <select className="w-full p-3.5 bg-white border-none rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-500/5" value={r.priority} onChange={e => {
                             const newR = [...draft.rules]; newR[idx].priority = parseInt(e.target.value); setDraft({...draft, rules: newR});
                           }}>
                             <option value="50">Info (Sininen)</option><option value="40">Warning (Keltainen)</option><option value="20">Danger (Punainen)</option>
                           </select>
                         </div>
                      </div>
                    </div>
                  ))}
                  <button onClick={()=>setDraft(d => ({ ...d, rules: [...d.rules, { fieldKey: draft.fields[0]?.key || "", operator:">", value:"0", highlightSectionKey:null, addHint:"", priority:50 }] }))} className="w-full py-6 border-2 border-dashed border-blue-200 rounded-[2rem] text-blue-400 hover:bg-blue-50 transition-all flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest"><Zap size={20}/> Lisää uusi sääntö</button>
                </div>
              )}
            </div>

            <footer className="p-8 border-t bg-slate-50 flex justify-between items-center shrink-0">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Järjestelmä tallentaa muutokset globaalisti.</p>
              <div className="flex gap-4">
                <button onClick={() => setIsEditing(false)} className="px-8 py-4 font-black text-xs uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">Peruuta</button>
                <button onClick={handleSave} disabled={saving} className="bg-slate-900 text-white px-12 py-4 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl shadow-slate-200 hover:bg-black disabled:opacity-50 flex items-center gap-3 transition-all active:scale-[0.98]">
                  {saving ? <Loader2 size={16} className="animate-spin text-blue-400" /> : <Save size={16} className="text-blue-400" />} 
                  {saving ? 'Tallennetaan...' : 'Päivitä kortti'}
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}

      <style jsx global>{`.custom-scrollbar::-webkit-scrollbar { width: 5px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }`}</style>
    </div>
  );
}
