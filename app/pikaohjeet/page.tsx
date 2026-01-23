"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  BookOpen, Search, Loader2, ChevronRight, Sparkles, Edit2, X, Save,
  AlertTriangle, CheckCircle2, Trash2, Plus, 
  Settings, Zap, RotateCcw
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
  id?: number; cardId?: number; groupId?: string | null; fieldKey: string; 
  operator: string; value: string; highlightSectionKey?: string | null; 
  addHint?: string | null; priority: number;
};

function classNames(...arr: Array<string | false | null | undefined>) {
  return arr.filter(Boolean).join(" ");
}

function safeNum(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function evalRule(rule: ClinicalRule, fieldValue: any): boolean {
  if (fieldValue === undefined || fieldValue === null || fieldValue === "") return false;

  const op = (rule.operator || "").toLowerCase().trim();
  const rhsRaw = rule.value;
  
  if (op === "truthy" || op === "true") {
    if (typeof fieldValue === "boolean") return fieldValue;
    return ["1", "true", "yes", "kyllä", "on"].includes(String(fieldValue).toLowerCase());
  }
  
  const fn = safeNum(fieldValue);
  const rn = safeNum(rhsRaw);

  if (fn !== null && rn !== null) {
    if (op === "eq" || op === "==") return fn === rn;
    if (op === "gt" || op === ">") return fn > rn;
    if (op === "lt" || op === "<") return fn < rn;
    if (op === "gte" || op === ">=") return fn >= rn;
    if (op === "lte" || op === "<=") return fn <= rn;
  }

  const fvStr = String(fieldValue).trim().toLowerCase();
  const rvStr = String(rhsRaw).trim().toLowerCase();
  if (op === "eq" || op === "==") return fvStr === rvStr;

  return false;
}

export default function PikaohjeetPage() {
  const { data: session } = useSession();
  const [cards, setCards] = useState<ClinicalCard[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [card, setCard] = useState<ClinicalCard | null>(null);
  const [loadingCard, setLoadingCard] = useState(false);
  const [params, setParams] = useState<Record<string, any>>({});

  const [isEditing, setIsEditing] = useState(false);
  const [editTab, setEditTab] = useState<"content" | "fields" | "rules">("content");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftSubtitle, setDraftSubtitle] = useState("");
  const [draft, setDraft] = useState<{
    sections: ClinicalSection[];
    fields: ClinicalField[];
    rules: ClinicalRule[];
  }>({ sections: [], fields: [], rules: [] });
  
  const [optionsInput, setOptionsInput] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState<string | null>(null);

  useEffect(() => { fetchCards(); }, []);
  useEffect(() => { if (activeSlug) fetchCard(activeSlug); }, [activeSlug]);

  const fetchCards = async () => {
    setLoadingList(true);
    try {
      const res = await fetch("/api/pikaohjeet");
      const data = await res.json();
      setCards(data);
      if (!activeSlug && data.length > 0) setActiveSlug(data[0].slug);
    } catch (e) { console.error(e); } finally { setLoadingList(false); }
  };

  const fetchCard = async (slug: string) => {
    setLoadingCard(true);
    try {
      const res = await fetch(`/api/pikaohjeet/${encodeURIComponent(slug)}`);
      const data = await res.json();
      setCard(data);
    } catch (e) { setCard(null); } finally { setLoadingCard(false); }
  };

  const startEditing = () => {
    if (!card) return;
    setDraftTitle(card.title);
    setDraftSubtitle(card.subtitle || "");
    const fields = JSON.parse(JSON.stringify(card.fields || [])).map((f: any) => ({...f, options: f.options || []}));
    setDraft({
      sections: JSON.parse(JSON.stringify(card.sections || [])),
      fields,
      rules: JSON.parse(JSON.stringify(card.rules || []))
    });
    
    const optInputMap: Record<number, string> = {};
    fields.forEach((f: any, idx: number) => {
      if (f.type === "select") optInputMap[idx] = f.options.join(", ");
    });
    setOptionsInput(optInputMap);
    setIsEditing(true);
  };

  const activeRuleHits = useMemo(() => {
    const allRules = card?.rules || [];
    const soloRules = allRules.filter(r => !r.groupId);
    const groupedRules = allRules.filter(r => r.groupId);
    const soloHits = soloRules.filter(r => evalRule(r, params[r.fieldKey]));
    const groupIds = Array.from(new Set(groupedRules.map(r => r.groupId)));
    const groupHits = groupIds.map(gid => {
      const rulesInGroup = groupedRules.filter(r => r.groupId === gid);
      return rulesInGroup.length > 0 && rulesInGroup.every(r => evalRule(r, params[r.fieldKey])) ? rulesInGroup[0] : null;
    }).filter((r): r is ClinicalRule => r !== null);

    return [...soloHits, ...groupHits].map(r => ({
      ...r, severity: r.priority <= 20 ? "danger" : r.priority <= 40 ? "warning" : "info"
    }));
  }, [card, params]);

  const sectionHighlights = useMemo(() => {
    const map: Record<string, { severity: string; hints: string[] }> = {};
    activeRuleHits.forEach(hit => {
      if (!hit.highlightSectionKey) return;
      const key = hit.highlightSectionKey;
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
          title: draftTitle,
          subtitle: draftSubtitle,
          sections: draft.sections.map(({ id, cardId, ...rest }: any) => rest),
          fields: draft.fields.map(({ id, cardId, ...rest }: any) => rest),
          // ИСПРАВЛЕНИЕ: groupId теперь сохраняется обязательно
          rules: draft.rules.map(({ id, cardId, ...rest }: any) => rest),
        }),
      });
      if (!res.ok) throw new Error("Tallennus epäonnistui");
      setSaveOk("Tallennettu");
      setIsEditing(false);
      fetchCard(card.slug);
      fetchCards();
      setTimeout(() => setSaveOk(null), 3000);
    } catch (e: any) { alert(e.message); } finally { setSaving(false); }
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

  const handleCreateNew = async () => {
    const title = prompt("Anna uuden kortin nimi:");
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

  const addConditionToRule = (groupId: string | null, baseRule: ClinicalRule) => {
    const newGroupId = groupId || `group_${Date.now()}`;
    if (!baseRule.groupId) {
      const newRules = [...draft.rules];
      const target = newRules.find(r => r === baseRule);
      if (target) target.groupId = newGroupId;
      setDraft({ ...draft, rules: newRules });
    }
    const newRule: ClinicalRule = {
      groupId: newGroupId,
      fieldKey: draft.fields[0]?.key || "",
      operator: "==",
      value: "",
      priority: baseRule.priority,
      highlightSectionKey: baseRule.highlightSectionKey,
      addHint: baseRule.addHint
    };
    setDraft(d => ({ ...d, rules: [...d.rules, newRule] }));
  };

  return (
    <div className="max-w-[1600px] mx-auto h-[calc(100vh-100px)] flex flex-col gap-4 p-4 text-slate-900 font-sans relative animate-in fade-in duration-500">
      <header className="flex items-center justify-between bg-white px-8 py-4 rounded-[2.5rem] border shadow-sm flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-100"><BookOpen size={20} /></div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Pikaohjeet</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kliiniset ohjekortit</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {saveOk && <div className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 border border-emerald-100 animate-in zoom-in-95"><CheckCircle2 size={14} />{saveOk}</div>}
          {card && (
            <button onClick={startEditing} className="bg-white border border-blue-600 text-blue-600 px-5 py-2 rounded-xl font-bold hover:bg-blue-50 transition-all active:scale-95 text-xs flex items-center gap-2">
              <Edit2 size={14} /> Muokkaa
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 grid grid-cols-12 gap-6 min-h-0 overflow-hidden">
        <aside className="col-span-3 flex flex-col gap-4 min-h-0">
          <button onClick={handleCreateNew} className="w-full py-3 bg-blue-50 text-blue-600 border border-blue-200 border-dashed rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-blue-100 transition-all flex items-center justify-center gap-2 shadow-sm"><Plus size={16} /> Uusi pikaohje</button>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input placeholder="Etsi..." className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 font-medium text-sm transition-all shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {loadingList ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" /></div> : 
              cards.filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase())).map(c => (
                <div key={c.slug} className="group relative">
                  <button onClick={() => setActiveSlug(c.slug)} className={classNames("w-full text-left p-4 rounded-2xl border transition-all relative pr-12", activeSlug === c.slug ? "bg-blue-600 text-white border-blue-600 shadow-lg translate-x-1" : "bg-white border-slate-100 hover:border-blue-200 hover:bg-slate-50")}>
                    <span className="font-bold text-sm truncate block">{c.title}</span>
                    <ChevronRight size={14} className={classNames("absolute right-4 top-1/2 -translate-y-1/2 transition-all", activeSlug === c.slug ? "opacity-100" : "opacity-0 translate-x-1 group-hover:opacity-100")} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(c.slug); }} className="absolute right-10 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all z-10">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            }
          </div>
        </aside>

        <section className="col-span-9 min-h-0 bg-white rounded-[2.5rem] border shadow-sm flex flex-col overflow-hidden">
           {loadingCard ? <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div> : card ? (
             <div className="flex-1 grid grid-cols-12 min-h-0">
                <div className="col-span-4 border-r overflow-y-auto p-8 space-y-8 custom-scrollbar bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Settings size={14} className="text-blue-500"/>
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.1em]">Parametrit</span>
                    </div>
                    <button onClick={() => setParams({})} className="text-[10px] font-bold text-slate-300 hover:text-blue-500 flex items-center gap-1 transition-colors">
                        <RotateCcw size={12}/> Tyhjennä
                    </button>
                  </div>
                  {card.fields?.sort((a,b)=>a.order-b.order).map(f => (
                    <div key={f.key} className="space-y-3">
                      <label className="text-[12px] font-bold text-slate-800 uppercase tracking-tight ml-1">{f.label}</label>
                      <div className="flex flex-wrap gap-2">
                        {f.type === "boolean" ? (
                           <div className="flex gap-2 w-full">
                              <button onClick={() => setParams({...params, [f.key]: params[f.key] === true ? null : true})} className={classNames("flex-1 py-3 rounded-xl font-bold text-sm border transition-all", params[f.key] === true ? "bg-blue-600 border-blue-600 text-white shadow-md" : "bg-white border-slate-200 text-slate-400 hover:bg-slate-50")}>Kyllä</button>
                              <button onClick={() => setParams({...params, [f.key]: params[f.key] === false ? null : false})} className={classNames("flex-1 py-3 rounded-xl font-bold text-sm border transition-all", params[f.key] === false ? "bg-blue-600 border-blue-600 text-white shadow-md" : "bg-white border-slate-200 text-slate-400 hover:bg-slate-50")}>Ei</button>
                           </div>
                        ) : f.type === "select" ? (
                          <div className="flex flex-wrap gap-2 w-full">
                            {f.options?.map(opt => (
                              <button key={opt} onClick={() => setParams({...params, [f.key]: params[f.key] === opt ? null : opt})} className={classNames("px-4 py-2 rounded-xl font-bold text-xs border transition-all", params[f.key] === opt ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50")}>
                                {opt}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="relative w-full">
                            <input className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 font-bold transition-all shadow-sm" placeholder={f.placeholder || ""} value={params[f.key] || ""} onChange={e => setParams({...params, [f.key]: e.target.value})} />
                            {f.unit && <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase">{f.unit}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="col-span-8 bg-slate-50/30 overflow-y-auto p-12 space-y-8 custom-scrollbar relative">
                   <header className="mb-10 border-b border-blue-100 pb-6">
                      <h2 className="text-4xl font-bold tracking-tight text-slate-800">{card.title}</h2>
                      {card.subtitle && <p className="text-md text-slate-500 font-medium mt-2">{card.subtitle}</p>}
                   </header>
                   <div className="space-y-6">
                      {card.sections?.sort((a,b)=>a.order-b.order).map(s => {
                        const hl = sectionHighlights[s.key];
                        return (
                          <div key={s.key} className={classNames("p-8 rounded-[2rem] border transition-all duration-500 shadow-sm", hl?.severity === "danger" ? "bg-rose-50 border-rose-200" : hl?.severity === "warning" ? "bg-amber-50 border-amber-200" : hl?.severity === "info" ? "bg-blue-50 border-blue-200" : "bg-white border-slate-100")}>
                            <div className="flex justify-between items-start mb-6">
                              <h3 className={classNames("text-[13px] font-bold uppercase tracking-wide", hl?.severity === "danger" ? "text-rose-900" : hl?.severity === "warning" ? "text-amber-900" : hl?.severity === "info" ? "text-blue-900" : "text-slate-800")}>{s.title}</h3>
                              <div className="flex flex-col gap-1.5">{hl?.hints.map((h, i) => <div key={i} className="px-3 py-1 bg-white border border-slate-100 rounded-xl text-[10px] font-bold flex items-center gap-1.5 shadow-sm animate-in slide-in-from-right-2"><AlertTriangle size={12} className="text-amber-500" /> {h}</div>)}</div>
                            </div>
                            <div className="prose prose-slate max-w-none text-slate-700 font-medium leading-relaxed text-[15px]"><ReactMarkdown>{s.content}</ReactMarkdown></div>
                          </div>
                        );
                      })}
                   </div>
                </div>
             </div>
           ) : <div className="flex-1 flex items-center justify-center text-slate-300 font-black uppercase tracking-widest italic text-xs">Valitse ohje listasta</div>}
        </section>
      </main>

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
               <button onClick={()=>setIsEditing(false)} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={24}/></button>
            </header>

            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-10">
               {editTab === "content" && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4">
                  {draft.sections.sort((a,b)=>a.order-b.order).map((s, idx) => (
                    <div key={idx} className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 space-y-6 relative group shadow-sm hover:shadow-md transition-all">
                      <button onClick={()=>setDraft(d => ({ ...d, sections: d.sections.filter((_,i)=>i!==idx) }))} className="absolute right-6 top-6 text-slate-300 hover:text-rose-500 transition-all"><Trash2 size={20}/></button>
                      <div className="grid grid-cols-12 gap-6">
                        <div className="col-span-8 space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Osion Otsikko</label>
                          <input className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/5" value={s.title} onChange={e => {
                            const newSecs = [...draft.sections]; newSecs[idx].title = e.target.value; setDraft({...draft, sections: newSecs});
                          }} />
                        </div>
                        <div className="col-span-4 space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Avain (Key)</label>
                          <input className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-mono text-xs outline-none focus:ring-4 focus:ring-blue-500/5" value={s.key} onChange={e => {
                            const newSecs = [...draft.sections]; newSecs[idx].key = e.target.value; setDraft({...draft, sections: newSecs});
                          }} />
                        </div>
                      </div>
                      <textarea className="w-full p-8 bg-white border border-slate-200 rounded-[2rem] min-h-[250px] text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/5 shadow-inner leading-relaxed" value={s.content} onChange={e => {
                        const newSecs = [...draft.sections]; newSecs[idx].content = e.target.value; setDraft({...draft, sections: newSecs});
                      }} />
                    </div>
                  ))}
                </div>
               )}

               {editTab === "fields" && (
                <div className="space-y-4 animate-in slide-in-from-bottom-4">
                  {draft.fields.sort((a,b)=>a.order-b.order).map((f, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-6 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 items-end relative shadow-sm">
                      <div className="col-span-3 space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Nimi (Label)</label>
                        <input className="w-full p-3.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5" value={f.label} onChange={e => {
                           const newF = [...draft.fields]; newF[idx].label = e.target.value; setDraft({...draft, fields: newF});
                        }} />
                      </div>
                      <div className="col-span-2 space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Tyyppi</label>
                        <select className="w-full p-3.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-500/5 appearance-none" value={f.type} onChange={e => {
                           const newF = [...draft.fields]; newF[idx].type = e.target.value; setDraft({...draft, fields: newF});
                        }}>
                          <option value="number">Number</option>
                          <option value="boolean">Boolean</option>
                          <option value="select">Select</option>
                        </select>
                      </div>
                      {f.type === "select" && (
                        <div className="col-span-4 space-y-2">
                           <label className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Vaihtoehdot (pilkulla erotettu)</label>
                           <input 
                              className="w-full p-3.5 bg-white border border-blue-200 rounded-xl text-xs font-bold" 
                              placeholder="Esim: Tyyppi 1, Tyyppi 2" 
                              value={optionsInput[idx] ?? ""} 
                              onChange={e => {
                                 const val = e.target.value;
                                 setOptionsInput(prev => ({...prev, [idx]: val}));
                                 const newF = [...draft.fields];
                                 newF[idx].options = val.split(",").map(s => s.trim()).filter(Boolean);
                                 setDraft({...draft, fields: newF});
                              }} 
                           />
                        </div>
                      )}
                      <div className="col-span-2 flex justify-center pb-1">
                        <button onClick={()=>setDraft(d => ({ ...d, fields: d.fields.filter((_,i)=>i!==idx) }))} className="p-3 text-slate-300 hover:text-rose-500 transition-all"><Trash2 size={20}/></button>
                      </div>
                    </div>
                  ))}
                  <button onClick={()=>setDraft(d => ({ ...d, fields: [...d.fields, { key:`f_${Date.now()}`, label:"Uusi kenttä", type:"number", options:[], order: draft.fields.length*10, isUniversal:false }] }))} className="w-full py-6 border-2 border-dashed border-slate-200 rounded-[2rem] text-slate-300 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/30 transition-all flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest">
                    <Plus size={20}/> Lisää uusi kenttä
                  </button>
                </div>
               )}

               {editTab === "rules" && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4">
                  {Object.values(draft.rules.reduce((acc: any, r) => {
                    const key = r.groupId || `solo_${Math.random()}`;
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(r);
                    return acc;
                  }, {})).map((group: any, gIdx: number) => (
                    <div key={gIdx} className="p-8 bg-blue-50/30 rounded-[2.5rem] border border-blue-100 space-y-6 relative shadow-sm">
                      <button onClick={()=>setDraft(d => ({ ...d, rules: d.rules.filter(r => !group.includes(r)) }))} className="absolute right-6 top-6 text-slate-300 hover:text-rose-500"><Trash2 size={20}/></button>
                      <div className="space-y-4">
                        {group.map((r: ClinicalRule, rIdx: number) => (
                          <div key={rIdx} className="space-y-4">
                            {rIdx > 0 && <div className="flex items-center gap-4 ml-4"><span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">— JA (И) —</span></div>}
                            <div className="flex items-center gap-4 flex-wrap">
                              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest w-8">{rIdx === 0 ? 'JOS' : ''}</span>
                              <select className="p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-500/5 min-w-[200px]" value={r.fieldKey} onChange={e => { r.fieldKey = e.target.value; setDraft({...draft}); }}>
                                {draft.fields.map(f => <option key={f.key} value={f.key}>{f.label} ({f.key})</option>)}
                              </select>
                              <select className="p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-500/5" value={r.operator} onChange={e => { r.operator = e.target.value; setDraft({...draft}); }}>
                                <option value=">">&gt;</option><option value="<">&lt;</option><option value="==">==</option><option value="truthy">kyllä</option>
                              </select>
                              <input className="p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-500/5 w-24" value={r.value} onChange={e => { r.value = e.target.value; setDraft({...draft}); }} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-col gap-6 pt-6 border-t border-blue-100">
                        <div className="flex items-center gap-4">
                           <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">KOROSTA SEURAAVA OSIO</span>
                           <select className="p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-500/5 min-w-[250px]" value={group[0].highlightSectionKey || ""} onChange={e => { group.forEach((rg: any) => rg.highlightSectionKey = e.target.value); setDraft({...draft}); }}>
                             <option value="">(Ei mitään / Не выбрано)</option>
                             {draft.sections.map(s => <option key={s.key} value={s.key}>{s.title}</option>)}
                           </select>
                        </div>
                        <div className="flex items-center justify-between">
                          <button onClick={() => addConditionToRule(group[0].groupId || null, group[0])} className="flex items-center gap-2 text-[10px] font-black text-blue-500 uppercase tracking-widest hover:text-blue-700 transition-colors"><Plus size={14}/> Lisää ehto</button>
                          <div className="w-48 space-y-2">
                             <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Väri</label>
                             <select className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black outline-none focus:ring-4 focus:ring-blue-500/5 uppercase" value={group[0].priority} onChange={e => { group.forEach((rg: any) => rg.priority = parseInt(e.target.value)); setDraft({...draft}); }}>
                                <option value="50">Info</option><option value="40">Warning</option><option value="20">Danger</option>
                             </select>
                          </div>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Huomioteksti (Hint)</label>
                           <input className="w-full p-3.5 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/5 shadow-inner" value={group[0].addHint || ""} onChange={e => { group.forEach((rg: any) => rg.addHint = e.target.value); setDraft({...draft}); }} />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button onClick={()=>setDraft(d => ({ ...d, rules: [...d.rules, { fieldKey: draft.fields[0]?.key || "", operator:">", value:"0", highlightSectionKey:null, addHint:"", priority:50 }] }))} className="w-full py-6 border-2 border-dashed border-blue-200 rounded-[2rem] text-blue-400 hover:bg-blue-50 transition-all flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest"><Zap size={20}/> Lisää uusi sääntöryhmä</button>
                </div>
               )}
            </div>

            <footer className="p-8 border-t bg-slate-50 flex justify-between items-center shrink-0">
               <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Tietokanta päivittyy tallennettaessa.</div>
               <div className="flex gap-4">
                 <button onClick={()=>setIsEditing(false)} className="px-8 py-4 font-black text-xs uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">Peruuta</button>
                 <button onClick={handleSave} disabled={saving} className="bg-slate-900 text-white px-12 py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-2xl shadow-slate-200 hover:bg-black disabled:opacity-50 flex items-center gap-3 active:scale-[0.98] transition-all">
                    {saving ? <Loader2 size={16} className="animate-spin text-blue-400" /> : <Save size={16} className="text-blue-400" />} 
                    {saving ? 'Tallennetaan...' : 'Päivitä kortти'}
                 </button>
               </div>
            </footer>
          </div>
        </div>
      )}
      <style jsx global>{`.custom-scrollbar::-webkit-scrollbar { width: 5px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }`}</style>
    </div>
  );
}
