"use client";

import { BellRing, Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "../lib/useI18n";

type EvidenceSummaryResponse = {
  latestSourceSyncAt?: string;
  unreadGuidelineUpdateCount: number;
  hasUnreadGuidelineUpdates: boolean;
};

const copy = {
  fi: {
    title: "Käytössä olevat suosituslähteet ovat päivittyneet.",
    action: "Merkitse nähdyksi",
    loading: "Päivitetään...",
  },
  ru: {
    title: "Используемые клинические рекомендации обновились.",
    action: "Отметить просмотренным",
    loading: "Обновление...",
  },
  en: {
    title: "The clinical recommendations you use have been updated.",
    action: "Mark as seen",
    loading: "Updating...",
  },
  de: {
    title: "Die verwendeten klinischen Empfehlungen wurden aktualisiert.",
    action: "Als gesehen markieren",
    loading: "Wird aktualisiert...",
  },
} as const;

export default function GuidelineUpdatesNotice() {
  const { language } = useI18n();
  const [summary, setSummary] = useState<EvidenceSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const l = copy[language as keyof typeof copy] ?? copy.en;

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const response = await fetch("/api/profile/evidence-summary", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (mounted) setSummary(data);
      } catch (error) {
        console.error("Guideline update notice loading failed", error);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  async function markSeen() {
    if (saving) return;
    setSaving(true);
    try {
      const response = await fetch("/api/profile/evidence-summary", { method: "POST" });
      if (!response.ok) return;
      const data = await response.json();
      setSummary(data.summary);
    } catch (error) {
      console.error("Guideline update notice save failed", error);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !summary?.hasUnreadGuidelineUpdates) return null;

  return (
    <section className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <div className="flex items-center gap-2 font-semibold">
        <BellRing size={16} />
        <span>{l.title}</span>
      </div>
      <button
        type="button"
        onClick={markSeen}
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-md border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
        {saving ? l.loading : l.action}
      </button>
    </section>
  );
}
