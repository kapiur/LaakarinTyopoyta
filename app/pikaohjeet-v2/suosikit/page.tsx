"use client";

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Clipboard, Loader2, Search, Star, Stethoscope, UserRound } from "lucide-react";
import { useI18n } from "../../../lib/useI18n";

type UiLang = "fi" | "ru" | "en";

type CardListItem = {
  slug: string;
  title: string;
  description?: string | null;
  type: string;
  tags: string[];
  isFavorite?: boolean;
  visibility?: string;
};

type Section = {
  key: string;
  title: string;
  content: string;
  order: number;
  kind?: string;
};

type CardDetail = CardListItem & {
  sections: Section[];
};

const ui = {
  fi: {
    title: "Suosikit",
    subtitle: "Merkitse usein käytetyt kortit ja avaa ne nopeasti",
    back: "Takaisin Pikaohjeisiin",
    search: "Hae korteista...",
    all: "Kaikki kortit",
    favorites: "Vain suosikit",
    noCards: "Ei kortteja",
    noFavorites: "Ei suosikkeja vielä",
    clinical: "Kliininen",
    personal: "Muistilappu",
    select: "Valitse kortti listasta",
    copy: "Kopioi",
    copied: "Kopioitu",
    addFavorite: "Lisää suosikkeihin",
    removeFavorite: "Poista suosikeista",
  },
  ru: {
    title: "Избранное",
    subtitle: "Отмечайте часто используемые карточки и открывайте их быстрее",
    back: "Назад в Pikaohjeet",
    search: "Поиск по карточкам...",
    all: "Все карточки",
    favorites: "Только избранные",
    noCards: "Карточек нет",
    noFavorites: "Избранных пока нет",
    clinical: "Клиническая",
    personal: "Заметка",
    select: "Выберите карточку из списка",
    copy: "Копировать",
    copied: "Скопировано",
    addFavorite: "Добавить в избранное",
    removeFavorite: "Убрать из избранного",
  },
  en: {
    title: "Favorites",
    subtitle: "Mark frequently used cards and open them faster",
    back: "Back to Pikaohjeet",
    search: "Search cards...",
    all: "All cards",
    favorites: "Favorites only",
    noCards: "No cards",
    noFavorites: "No favorites yet",
    clinical: "Clinical",
    personal: "Note",
    select: "Select a card from the list",
    copy: "Copy",
    copied: "Copied",
    addFavorite: "Add to favorites",
    removeFavorite: "Remove from favorites",
  },
};

function sectionTone(kind?: string) {
  if (kind === "WARNING") return "border-amber-100 bg-amber-50/70";
  if (kind === "CRITERIA") return "border-blue-100 bg-blue-50/60";
  if (kind === "ACTIONS") return "border-emerald-100 bg-emerald-50/60";
  return "border-slate-100 bg-white";
}

export default function PikaohjeetFavoritesPage() {
  const { language } = useI18n();
  const dict = ui[(language as UiLang) || "fi"] ?? ui.fi;

  const [cards, setCards] = useState<CardListItem[]>([]);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [activeCard, setActiveCard] = useState<CardDetail | null>(null);
  const [query, setQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingCard, setLoadingCard] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [togglingSlug, setTogglingSlug] = useState<string | null>(null);

  async function loadCards(selectSlug?: string | null) {
    setLoading(true);
    try {
      const res = await fetch("/api/pikaohjeet-v2", { cache: "no-store" });
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setCards(list);
      if (selectSlug !== undefined) setActiveSlug(selectSlug);
      else if (!activeSlug && list.length > 0) setActiveSlug(list[0].slug);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeSlug) {
      setActiveCard(null);
      return;
    }
    let mounted = true;
    async function loadCard() {
      setLoadingCard(true);
      try {
        const res = await fetch(`/api/pikaohjeet-v2/${encodeURIComponent(activeSlug)}`, { cache: "no-store" });
        const data = await res.json();
        const listItem = cards.find((item) => item.slug === activeSlug);
        if (mounted && res.ok) setActiveCard({ ...data, tags: listItem?.tags || data.tags || [], isFavorite: listItem?.isFavorite || false });
      } finally {
        if (mounted) setLoadingCard(false);
      }
    }
    loadCard();
    return () => { mounted = false; };
  }, [activeSlug, cards]);

  const filteredCards = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...cards]
      .sort((a, b) => Number(Boolean(b.isFavorite)) - Number(Boolean(a.isFavorite)) || a.title.localeCompare(b.title))
      .filter((card) => {
        if (favoritesOnly && !card.isFavorite) return false;
        if (!q) return true;
        return [card.title, card.description || "", ...(card.tags || [])].join(" ").toLowerCase().includes(q);
      });
  }, [cards, favoritesOnly, query]);

  async function toggleFavorite(card: CardListItem) {
    const next = !card.isFavorite;
    setTogglingSlug(card.slug);
    setCards((current) => current.map((item) => item.slug === card.slug ? { ...item, isFavorite: next } : item));
    setActiveCard((current) => current?.slug === card.slug ? { ...current, isFavorite: next } : current);
    try {
      const res = await fetch(`/api/pikaohjeet-v2/${encodeURIComponent(card.slug)}/favorite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Favorite error");
      await loadCards(card.slug);
    } catch (error: any) {
      alert(error?.message || "Favorite error");
      await loadCards(card.slug);
    } finally {
      setTogglingSlug(null);
    }
  }

  async function copyText(key: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1200);
  }

  const activeListItem = activeCard ? cards.find((card) => card.slug === activeCard.slug) : null;
  const activeIsFavorite = Boolean(activeListItem?.isFavorite || activeCard?.isFavorite);

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-[1700px] flex-col gap-4 p-0 text-slate-900 sm:p-2 lg:h-[calc(100dvh-96px)] lg:p-4">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm sm:px-7 sm:py-5 lg:rounded-[2rem]">
        <div>
          <a href="/pikaohjeet-v2" className="mb-3 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-400 hover:text-blue-600"><ArrowLeft size={14} /> {dict.back}</a>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">{dict.title}</h1>
          <p className="text-xs font-bold text-slate-400">{dict.subtitle}</p>
        </div>
        {activeListItem && (
          <button onClick={() => toggleFavorite(activeListItem)} disabled={togglingSlug === activeListItem.slug} className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-black uppercase tracking-wide shadow-sm ${activeIsFavorite ? "border border-amber-100 bg-amber-50 text-amber-800" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
            {togglingSlug === activeListItem.slug ? <Loader2 className="animate-spin" size={15} /> : <Star size={15} fill={activeIsFavorite ? "currentColor" : "none"} />}
            {activeIsFavorite ? dict.removeFavorite : dict.addFavorite}
          </button>
        )}
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5 lg:overflow-hidden">
        <aside className="col-span-1 flex min-h-0 flex-col gap-4 lg:col-span-4 xl:col-span-3">
          <div className="rounded-[2rem] border border-slate-100 bg-white p-4 shadow-sm">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={dict.search} className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-semibold outline-none focus:border-blue-200 focus:bg-white focus:ring-4 focus:ring-blue-500/10" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => setFavoritesOnly(false)} className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-wide ${!favoritesOnly ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-100 bg-white text-slate-400"}`}>{dict.all}</button>
              <button onClick={() => setFavoritesOnly(true)} className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-wide ${favoritesOnly ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-100 bg-white text-slate-400"}`}>{dict.favorites}</button>
            </div>
          </div>

          <div className="min-h-0 max-h-[30rem] flex-1 overflow-y-auto pr-1 lg:max-h-none">
            {loading ? <div className="flex h-40 items-center justify-center text-blue-500"><Loader2 className="animate-spin" /></div> : filteredCards.length === 0 ? <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-300">{favoritesOnly ? dict.noFavorites : dict.noCards}</div> : (
              <div className="space-y-2">
                {filteredCards.map((card) => (
                  <button key={card.slug} onClick={() => setActiveSlug(card.slug)} className={`w-full rounded-[1.35rem] border p-4 text-left transition ${activeSlug === card.slug ? "border-blue-200 bg-blue-50" : "border-slate-100 bg-white hover:bg-slate-50"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-black text-slate-800">{card.title}</div>
                        {card.description && <div className="mt-1 line-clamp-2 text-xs font-semibold text-slate-400">{card.description}</div>}
                      </div>
                      <Star size={16} fill={card.isFavorite ? "currentColor" : "none"} className={card.isFavorite ? "shrink-0 text-amber-500" : "shrink-0 text-slate-300"} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-[9px] font-black text-slate-500">{card.type === "PERSONAL" ? dict.personal : dict.clinical}</span>
                      {card.tags?.slice(0, 3).map((tag) => <span key={tag} className="rounded-lg bg-slate-100 px-2 py-1 text-[9px] font-black text-slate-500">#{tag}</span>)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        <section className="col-span-1 min-h-[30rem] overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50 p-3 shadow-sm sm:p-6 lg:col-span-8 lg:min-h-0 lg:rounded-[2rem] xl:col-span-9">
          {loadingCard ? <div className="flex h-full items-center justify-center text-blue-500"><Loader2 className="animate-spin" /></div> : !activeCard ? <div className="flex h-full items-center justify-center text-sm font-black uppercase tracking-widest text-slate-300">{dict.select}</div> : (
            <div className="mx-auto max-w-5xl space-y-5">
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-7 lg:rounded-[2rem]">
                <div className="mb-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 rounded-xl border border-slate-100 bg-slate-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-slate-600">{activeCard.type === "PERSONAL" ? <UserRound size={13} /> : <Stethoscope size={13} />} {activeCard.type === "PERSONAL" ? dict.personal : dict.clinical}</span>
                  {activeIsFavorite && <span className="inline-flex items-center gap-1 rounded-xl border border-amber-100 bg-amber-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-amber-800"><Star size={13} fill="currentColor" /> {dict.favorites}</span>}
                </div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{activeCard.title}</h2>
                {activeCard.description && <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">{activeCard.description}</p>}
                {activeListItem?.tags?.length ? <div className="mt-4 flex flex-wrap gap-2">{activeListItem.tags.map((tag) => <span key={tag} className="rounded-xl bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-500">#{tag}</span>)}</div> : null}
              </div>

              {[...(activeCard.sections || [])].sort((a, b) => a.order - b.order).map((section) => (
                <article key={section.key} className={`rounded-2xl border p-4 shadow-sm sm:p-6 lg:rounded-[2rem] ${sectionTone(section.kind)}`}>
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <h3 className="text-sm font-black uppercase tracking-wide text-slate-800">{section.title}</h3>
                    <button onClick={() => copyText(section.key, section.content)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wide text-slate-500 hover:bg-slate-50"><Clipboard size={13} /> {copiedKey === section.key ? dict.copied : dict.copy}</button>
                  </div>
                  <div className="prose prose-slate max-w-none text-sm font-semibold leading-relaxed"><ReactMarkdown>{section.content}</ReactMarkdown></div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
