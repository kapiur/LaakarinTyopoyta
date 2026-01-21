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

/**
 * Pikaohjeet (Clinical Cards) — UI page
 * - Left: search + list of cards
 * - Right: patient params (fields) + sections with rule-driven highlights
 * - Edit: inline editor modal (sections) for quick updates
 *
 * Assumes existing API:
 * - GET  /api/pikaohjeet                -> list cards (or {cards:[...]})
 * - GET  /api/pikaohjeet/[slug]         -> full card
 * - PUT  /api/pikaohjeet/[slug]         -> update card (sections/fields/rules, etc.)
 *
 * Notes:
 * - Editing доступно всем: UI не блокирует редактирование.
 * - Audit trail (кто/когда) должен фиксироваться на сервере (updatedBy* / revisions).
 */

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
  type: string; // number, text, boolean, select
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
  operator: string; // eq, neq, gt, gte, lt, lte, includes, truthy
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

function classNames(...arr: Array<string | false | null | undefined>) {
  return arr.filter(Boolean).join(" ");
}

function normalizeApiList(payload: any): ClinicalCard[] {
  if (Array.isArray(payload)) return payload as ClinicalCard[];
  if (payload?.cards && Array.isArray(payload.cards)) return payload.cards as ClinicalCard[];
  if (payload?.data && Array.isArray(payload.data)) return payload.data as ClinicalCard[];
  return [];
}

function safeNum(v: any): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function evalRule(rule: ClinicalRule, fieldValue: any): boolean {
  const op = (rule.operator || "").toLowerCase().trim();
  const rhsRaw = rule.value;

  // boolean-ish
  const fvStr = String(fieldValue ?? "").trim().toLowerCase();
  const rhsStr = String(rhsRaw ?? "").trim().toLowerCase();

  if (op === "truthy") {
    if (typeof fieldValue === "boolean") return fieldValue;
    return fvStr === "1" || fvStr === "true" || fvStr === "yes" || fvStr === "kyllä" || fvStr === "on";
  }

  // includes (string)
  if (op === "includes") {
    return fvStr.includes(rhsStr);
  }

  // eq / neq for strings + numbers
  if (op === "eq") {
    const fn = safeNum(fieldValue);
    const rn = safeNum(rhsRaw);
    if (fn !== null && rn !== null) return fn === rn;
    return fvStr === rhsStr;
  }
  if (op === "neq") {
    const fn = safeNum(fieldValue);
    const rn = safeNum(rhsRaw);
    if (fn !== null && rn !== null) return fn !== rn;
    return fvStr !== rhsStr;
  }

  // numeric comparisons
  const fn = safeNum(fieldValue);
  const rn = safeNum(rhsRaw);
  if (fn === null || rn === null) return false;

  if (op === "gt") return fn > rn;
  if (op === "gte") return fn >= rn;
  if (op === "lt") return fn < rn;
  if (op === "lte") return fn <= rn;

  return false;
}

function severityFromPriority(priority: number) {
  // lower priority number = more important (if you use that convention) — but yours default=50.
  // We'll interpret: <=20 = danger, <=40 = warning, else info.
  if (priority <= 20) return "danger";
  if (priority <= 40) return "warning";
  return "info";
}

export default function PikaohjeetPage() {
  const { data: session } = useSession();

  const [loadingList, setLoadingList] = useState(true);
  const [cards, setCards] = useState<ClinicalCard[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  const [loadingCard, setLoadingCard] = useState(false);
  const [card, setCard] = useState<ClinicalCard | null>(null);

  // patient params (key -> string)
  const [params, setParams] = useState<Record<string, any>>({});

  // editor
  const [isEditing, setIsEditing] = useState(false);
  const [draftSections, setDraftSections] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  useEffect(() => {
    fetchCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // reset params when switching card
    setParams({});
    setSaveOk(null);
    setSaveErr(null);
  }, [activeSlug]);

  const fetchCards = async () => {
    setLoadingList(true);
    try {
      const res = await fetch("/api/pikaohjeet", { cache: "no-store" });
      const data = await res.json();
      const list = normalizeApiList(data)
        .filter((c) => c.isPublished !== false)
        .sort((a, b) => a.title.localeCompare(b.title, "fi"));
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
      setCard(data as ClinicalCard);

      // init draft sections
      const secMap: Record<string, string> = {};
      (data?.sections || [])
        .slice()
        .sort((a: ClinicalSection, b: ClinicalSection) => a.order - b.order)
        .forEach((s: ClinicalSection) => (secMap[s.key] = s.content || ""));
      setDraftSections(secMap);
    } catch (e) {
      console.error(e);
      setCard(null);
    } finally {
      setLoadingCard(false);
    }
  };

  useEffect(() => {
    if (activeSlug) fetchCard(activeSlug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSlug]);

  const filteredCards = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter((c) => {
      const hay = `${c.title} ${c.subtitle ?? ""} ${(c.tags || []).join(" ")}`.toLowerCase();
      return hay.includes(q) || c.slug.toLowerCase().includes(q);
    });
  }, [cards, searchTerm]);

  const orderedSections = useMemo(() => {
    return (card?.sections || []).slice().sort((a, b) => a.order - b.order);
  }, [card]);

  const orderedFields = useMemo(() => {
    return (card?.fields || []).slice().sort((a, b) => a.order - b.order);
  }, [card]);

  const activeRuleHits = useMemo(() => {
    const hits: Array<ClinicalRule & { severity: "danger" | "warning" | "info" }> = [];
    (card?.rules || [])
      .slice()
      .sort((a, b) => a.priority - b.priority)
      .forEach((r) => {
        const fv = params[r.fieldKey];
        if (evalRule(r, fv)) {
          hits.push({ ...r, severity: severityFromPriority(r.priority) as any });
        }
      });
    return hits;
  }, [card, params]);

  const sectionHighlights = useMemo(() => {
    const map: Record<
      string,
      {
        severity: "danger" | "warning" | "info";
        hints: string[];
      }
    > = {};
    for (const hit of activeRuleHits) {
      const key = hit.highlightSectionKey?.trim();
      if (!key) continue;
      const sev = hit.severity;
      if (!map[key]) {
        map[key] = { severity: sev, hints: [] };
      } else {
        // if current is more severe, upgrade
        const current = map[key].severity;
        const rank = (s: any) => (s === "danger" ? 3 : s === "warning" ? 2 : 1);
        if (rank(sev) > rank(current)) map[key].severity = sev;
      }
      if (hit.addHint) map[key].hints.push(hit.addHint);
    }
    return map;
  }, [activeRuleHits]);

  const topCallouts = useMemo(() => {
    // show at most 4, sorted by severity and priority
    const rank = (s: any) => (s === "danger" ? 3 : s === "warning" ? 2 : 1);
    const sorted = activeRuleHits
      .slice()
      .sort((a, b) => rank(b.severity) - rank(a.severity) || a.priority - b.priority);
    return sorted.slice(0, 4);
  }, [activeRuleHits]);

  const openEditor = () => {
    if (!card) return;
    const secMap: Record<string, string> = {};
    (card.sections || [])
      .slice()
      .sort((a, b) => a.order - b.order)
      .forEach((s) => (secMap[s.key] = s.content || ""));
    setDraftSections(secMap);
    setIsEditing(true);
    setSaveOk(null);
    setSaveErr(null);
  };

  const handleSave = async () => {
    if (!card) return;
    setSaving(true);
    setSaveOk(null);
    setSaveErr(null);

    try {
      // prepare sections payload in existing shape
      const newSections = orderedSections.map((s) => ({
        key: s.key,
        title: s.title,
        order: s.order,
        content: draftSections[s.key] ?? "",
        highlightCallout: s.highlightCallout ?? null,
      }));

      const res = await fetch(`/api/pikaohjeet/${encodeURIComponent(card.slug)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Server should stamp updatedBy* based on session (or allow override)
          sections: newSections,
          // Keep fields/rules as-is unless you build editor for them:
          fields: (card.fields || []).map((f) => ({
            key: f.key,
            label: f.label,
            type: f.type,
            unit: f.unit ?? null,
            placeholder: f.placeholder ?? null,
            options: f.options || [],
            order: f.order,
            isUniversal: f.isUniversal,
          })),
          rules: (card.rules || []).map((r) => ({
            fieldKey: r.fieldKey,
            operator: r.operator,
            value: r.value,
            highlightSectionKey: r.highlightSectionKey ?? null,
            addHint: r.addHint ?? null,
            priority: r.priority,
          })),
          // Optional: pass editor hint (server may ignore)
          editor: {
            email: session?.user?.email ?? null,
            name: (session?.user as any)?.name ?? null,
            userId: (session?.user as any)?.id ?? null,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Save failed (${res.status})`);
      }

      setSaveOk("Tallennettu");
      setIsEditing(false);
      await fetchCard(card.slug);
      setTimeout(() => setSaveOk(null), 2500);
    } catch (e: any) {
      console.error(e);
      setSaveErr(e?.message || "Tallennus epäonnistui");
    } finally {
      setSaving(false);
    }
  };

  const renderFieldInput = (f: ClinicalField) => {
    const key = f.key;
    const value = params[key];

    const base =
      "w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 font-bold text-sm transition-all";

    if (f.type === "boolean") {
      const on = value === true || String(value).toLowerCase() === "true" || String(value).toLowerCase() === "on";
      return (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setParams((p) => ({ ...p, [key]: true }))}
            className={classNames(
              "px-5 py-3 rounded-xl text-xs font-bold border transition-all",
              on ? "bg-blue-600 text-white border-blue-600 shadow-lg" : "bg-slate-50 border-slate-100 text-slate-600 hover:border-blue-300 hover:bg-white shadow-sm"
            )}
          >
            Kyllä
          </button>
          <button
            onClick={() => setParams((p) => ({ ...p, [key]: false }))}
            className={classNames(
              "px-5 py-3 rounded-xl text-xs font-bold border transition-all",
              !on ? "bg-blue-600 text-white border-blue-600 shadow-lg" : "bg-slate-50 border-slate-100 text-slate-600 hover:border-blue-300 hover:bg-white shadow-sm"
            )}
          >
            Ei
          </button>
        </div>
      );
    }

    if (f.type === "select") {
      return (
        <div className="flex flex-wrap gap-2">
          {(f.options || []).map((opt) => (
            <button
              key={opt}
              onClick={() => setParams((p) => ({ ...p, [key]: opt }))}
              className={classNames(
                "px-5 py-3 rounded-xl text-xs font-bold border transition-all",
                String(value) === opt
                  ? "bg-blue-600 text-white border-blue-600 shadow-lg"
                  : "bg-slate-50 border-slate-100 text-slate-600 hover:border-blue-300 hover:bg-white shadow-sm"
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      );
    }

    // number/text
    return (
      <div className="relative">
        <input
          className={base}
          placeholder={f.placeholder ?? ""}
          value={value ?? ""}
          onChange={(e) => setParams((p) => ({ ...p, [key]: e.target.value }))}
          inputMode={f.type === "number" ? "decimal" : undefined}
        />
        {f.unit ? (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {f.unit}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="max-w-[1600px] mx-auto h-[calc(100vh-100px)] flex flex-col gap-4 p-4 text-slate-900 font-sans relative">
      {/* HEADER */}
      <div className="flex items-center justify-between bg-white p-6 rounded-[2.5rem] border shadow-sm flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
            <BookOpen size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Pikaohjeet</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Nopeat kliiniset kortit — terveysasema
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {saveOk && (
            <div className="px-4 py-2 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              <CheckCircle2 size={14} />
              {saveOk}
            </div>
          )}
          {card && (
            <button
              onClick={openEditor}
              className="bg-blue-600 text-white px-6 py-4 rounded-2xl font-black hover:bg-blue-700 shadow-xl shadow-blue-100 uppercase tracking-[0.15em] text-[11px] transition-all active:scale-95 flex items-center gap-2"
            >
              <Edit2 size={14} />
              Muokkaa
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0 pb-2 overflow-hidden">
        {/* LEFT: LIST */}
        <div className="col-span-3 flex flex-col gap-4 min-h-0">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
            <input
              placeholder="Etsi pikaohje..."
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 font-bold text-sm transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
            {loadingList ? (
              <div className="flex justify-center py-10">
                <Loader2 className="animate-spin text-blue-500" />
              </div>
            ) : filteredCards.length === 0 ? (
              <div className="bg-white rounded-2xl border p-6 text-slate-400 text-sm font-bold">
                Ei tuloksia.
              </div>
            ) : (
              filteredCards.map((c) => (
                <div key={c.slug} className="group relative">
                  <button
                    onClick={() => setActiveSlug(c.slug)}
                    className={classNames(
                      "w-full text-left p-4 rounded-2xl border transition-all relative overflow-hidden pr-12",
                      activeSlug === c.slug
                        ? "bg-blue-600 text-white border-blue-600 shadow-lg"
                        : "bg-white border-slate-100 hover:border-blue-200 hover:shadow-sm"
                    )}
                  >
                    <span className="font-bold text-sm truncate block relative z-10">{c.title}</span>
                    {c.subtitle ? (
                      <span className={classNames("text-[11px] block mt-1 truncate relative z-10", activeSlug === c.slug ? "text-white/80" : "text-slate-400")}>
                        {c.subtitle}
                      </span>
                    ) : null}
                    <ChevronRight
                      size={14}
                      className={classNames(
                        "absolute right-4 top-1/2 -translate-y-1/2 transition-all",
                        activeSlug === c.slug ? "translate-x-0 opacity-100" : "translate-x-2 opacity-0"
                      )}
                    />
                  </button>

                  {c.tags?.length ? (
                    <div className={classNames("absolute left-4 -bottom-2 flex gap-1", activeSlug === c.slug ? "opacity-0" : "opacity-0 group-hover:opacity-100 transition-all")}>
                      <div className="px-2 py-1 rounded-xl bg-slate-50 border text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                        <Tag size={12} />
                        {c.tags.slice(0, 2).join(", ")}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT: CONTENT */}
        <div className="col-span-9 min-h-0">
          {!activeSlug ? (
            <div className="h-full bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-300 gap-4">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                <BookOpen size={40} strokeWidth={1} />
              </div>
              <span className="font-black uppercase tracking-[0.3em] text-[10px]">Valitse pikaohje listasta</span>
            </div>
          ) : loadingCard ? (
            <div className="h-full bg-white rounded-[2.5rem] border shadow-sm flex items-center justify-center">
              <div className="flex items-center gap-3 text-blue-400 italic animate-pulse">
                <Loader2 className="animate-spin" /> Ladataan...
              </div>
            </div>
          ) : !card ? (
            <div className="h-full bg-white rounded-[2.5rem] border shadow-sm flex items-center justify-center text-slate-400 font-bold">
              Korttia ei löydy.
            </div>
          ) : (
            <div className="grid grid-cols-12 h-full gap-6">
              {/* PARAMS */}
              <div className="col-span-5 bg-white rounded-[2.5rem] border shadow-sm flex flex-col overflow-hidden">
                <div className="p-6 border-b bg-slate-50/50 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-slate-400" />
                    <span className="font-black text-slate-400 uppercase text-[10px] tracking-[0.2em]">Potilasparametrit</span>
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {card.environment} • {card.audience}
                  </div>
                </div>

                <div className="p-8 flex-1 overflow-y-auto no-scrollbar space-y-8 bg-white">
                  {orderedFields.length === 0 ? (
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-slate-500 text-sm font-bold">
                      Ei kenttiä. Lisää ClinicalField-määrittelyt kortille.
                    </div>
                  ) : (
                    orderedFields.map((f) => (
                      <div key={f.key} className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">
                          {f.label}
                        </label>
                        {renderFieldInput(f)}
                      </div>
                    ))
                  )}

                  {/* Callouts */}
                  {topCallouts.length > 0 && (
                    <div className="space-y-3">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                        <AlertTriangle size={14} />
                        Huomiot
                      </div>
                      <div className="space-y-2">
                        {topCallouts.map((h) => (
                          <div
                            key={h.id}
                            className={classNames(
                              "p-4 rounded-2xl border text-sm font-bold leading-snug",
                              h.severity === "danger"
                                ? "bg-rose-50 border-rose-200 text-rose-800"
                                : h.severity === "warning"
                                  ? "bg-amber-50 border-amber-200 text-amber-800"
                                  : "bg-blue-50 border-blue-200 text-blue-800"
                            )}
                          >
                            {h.addHint || `${h.fieldKey} ${h.operator} ${h.value}`}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTIONS */}
              <div className="col-span-7 bg-blue-50/30 rounded-[2.5rem] flex flex-col overflow-hidden border border-blue-100 shadow-sm relative backdrop-blur-sm">
                <div className="p-6 border-b border-blue-100 flex justify-between items-center bg-white/60">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-sm shadow-emerald-200" />
                    <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Ohje</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      <Info size={14} />
                      Päivitetty: {new Date(card.updatedAt).toLocaleString("fi-FI")}
                    </div>
                    {card.updatedByEmail || card.updatedByName ? (
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {card.updatedByName || card.updatedByEmail}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="p-10 flex-1 overflow-y-auto no-scrollbar space-y-8">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-800">{card.title}</h2>
                    {card.subtitle ? <p className="text-sm text-slate-500 font-bold mt-1">{card.subtitle}</p> : null}
                    {card.tags?.length ? (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {card.tags.map((t) => (
                          <span key={t} className="px-3 py-1 rounded-xl bg-white/70 border text-[10px] font-black uppercase tracking-widest text-slate-500">
                            {t}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {orderedSections.length === 0 ? (
                    <div className="bg-white/70 border rounded-2xl p-6 text-slate-500 font-bold">
                      Ei osioita. Lisää ClinicalSection-määrittelyt kortille.
                    </div>
                  ) : (
                    orderedSections.map((s) => {
                      const hl = sectionHighlights[s.key];
                      const sev = hl?.severity;

                      const border =
                        sev === "danger"
                          ? "border-rose-200"
                          : sev === "warning"
                            ? "border-amber-200"
                            : sev === "info"
                              ? "border-blue-200"
                              : "border-slate-100";

                      const bg =
                        sev === "danger"
                          ? "bg-rose-50/70"
                          : sev === "warning"
                            ? "bg-amber-50/70"
                            : sev === "info"
                              ? "bg-blue-50/70"
                              : "bg-white/70";

                      const titleColor =
                        sev === "danger"
                          ? "text-rose-800"
                          : sev === "warning"
                            ? "text-amber-800"
                            : sev === "info"
                              ? "text-blue-800"
                              : "text-slate-800";

                      return (
                        <div key={s.key} className={classNames("rounded-[2rem] border p-8 shadow-sm", bg, border)}>
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className={classNames("text-[10px] font-black uppercase tracking-[0.2em] mb-2", titleColor)}>
                                {s.title}
                              </div>
                              {s.highlightCallout ? (
                                <div className="text-xs font-bold text-slate-600 bg-white/70 border border-slate-100 rounded-2xl p-4 mb-4">
                                  {s.highlightCallout}
                                </div>
                              ) : null}
                            </div>

                            {hl?.hints?.length ? (
                              <div className="min-w-[220px] max-w-[320px]">
                                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
                                  <AlertTriangle size={12} />
                                  Korostukset
                                </div>
                                <div className="space-y-2">
                                  {hl.hints.slice(0, 3).map((h, idx) => (
                                    <div key={idx} className="text-[11px] font-bold text-slate-700 bg-white/70 border border-slate-100 rounded-2xl p-3">
                                      {h}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </div>

                          <div className="mt-6 whitespace-pre-wrap text-slate-800 leading-relaxed font-medium">
                            {s.content || <span className="text-slate-300 italic">Tyhjä</span>}
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Revisions preview (optional) */}
                  {card.revisions && card.revisions.length > 0 && (
                    <div className="rounded-[2rem] border border-slate-100 bg-white/70 p-8">
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                          <History size={14} />
                          Viimeisimmät muutokset
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {card.revisions.length} merkintää
                        </div>
                      </div>
                      <div className="mt-4 space-y-3">
                        {card.revisions
                          .slice()
                          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                          .slice(0, 5)
                          .map((r) => (
                            <div key={r.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60">
                              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                {new Date(r.createdAt).toLocaleString("fi-FI")} • {r.editorName || r.editorEmail || "Tuntematon"} • {r.action}
                              </div>
                              {r.summary ? <div className="text-sm font-bold text-slate-700 mt-1">{r.summary}</div> : null}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                {saveErr && (
                  <div className="absolute bottom-8 left-8 right-8 p-5 bg-white/80 border border-rose-200 rounded-3xl text-[11px] text-rose-700 flex items-center gap-4 animate-in slide-in-from-bottom-4 shadow-xl shadow-rose-900/5 backdrop-blur-md">
                    <div className="w-10 h-10 bg-rose-600 rounded-2xl flex items-center justify-center text-white shrink-0">
                      <AlertTriangle size={18} />
                    </div>
                    <span className="font-bold tracking-tight leading-tight">{saveErr}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* EDIT MODAL (sections only) */}
      {isEditing && card && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] shadow-2xl max-w-5xl w-full overflow-hidden border h-[85vh] flex flex-col">
            <div className="p-8 border-b bg-blue-600 flex justify-between items-center text-white">
              <div className="font-black uppercase text-sm tracking-widest flex items-center gap-3">
                <Edit2 size={20} />
                Muokkaa: {card.title}
              </div>
              <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 flex-1 overflow-y-auto no-scrollbar space-y-6 bg-white">
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 text-slate-600 font-bold text-sm">
                Muokkaukset ovat yhteisiä kaikille käyttäjille. Järjestelmä tallentaa automaattisesti, kuka ja milloin teki viimeisimmät muutokset.
              </div>

              {orderedSections.map((s) => (
                <div key={s.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-blue-600 uppercase ml-2 tracking-[0.15em]">
                      {s.title} <span className="text-slate-300">({s.key})</span>
                    </label>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      order {s.order}
                    </div>
                  </div>
                  <textarea
                    className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[2rem] font-mono text-sm min-h-[160px] outline-none focus:bg-white focus:ring-8 focus:ring-blue-500/5 transition-all leading-relaxed shadow-inner"
                    value={draftSections[s.key] ?? ""}
                    onChange={(e) => setDraftSections((d) => ({ ...d, [s.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            <div className="p-8 bg-slate-50 border-t flex justify-between items-center">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {session?.user?.email ? `Kirjautunut: ${session.user.email}` : "Ei sessiota"}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-8 py-4 bg-white text-slate-700 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-100 transition-all text-[11px] border"
                  disabled={saving}
                >
                  Peruuta
                </button>

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all text-[11px] shadow-lg shadow-blue-100 flex items-center gap-2 disabled:opacity-60"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Tallenna
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
