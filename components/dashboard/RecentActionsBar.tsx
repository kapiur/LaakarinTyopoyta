"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Clock3, FileText, Loader2, Trash2 } from "lucide-react";
import { recordWorkspaceActivity, WORKSPACE_ACTIVITY_EVENT } from "../../lib/dashboard/workspaceActivityClient";
import type { TranslationKey } from "../../lib/i18n";
import { useI18n } from "../../lib/useI18n";
import type { HomeQuickAction } from "./QuickActionsBar";
import { homeActionIconMap } from "./homeActionIcons";

type RecentAction = HomeQuickAction & { lastUsedAt: string };

export default function RecentActionsBar({
  onSelectAiTool,
  onRestoreAiTool,
}: {
  onSelectAiTool: (key: string) => void;
  onRestoreAiTool: (key: string) => void;
}) {
  const { t } = useI18n();
  const [recent, setRecent] = useState<RecentAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const initialToolApplied = useRef(false);
  const selectAiToolRef = useRef(onSelectAiTool);
  const restoreAiToolRef = useRef(onRestoreAiTool);

  useEffect(() => {
    selectAiToolRef.current = onSelectAiTool;
    restoreAiToolRef.current = onRestoreAiTool;
  }, [onRestoreAiTool, onSelectAiTool]);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/home/recent-actions", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      setRecent(Array.isArray(data.recent) ? data.recent : []);
      if (!initialToolApplied.current && typeof data.lastAiToolKey === "string") {
        initialToolApplied.current = true;
        restoreAiToolRef.current(data.lastAiToolKey);
      }
    } catch (error) {
      console.error("Recent workspace actions loading failed", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const refresh = () => load();
    window.addEventListener(WORKSPACE_ACTIVITY_EVENT, refresh);
    return () => window.removeEventListener(WORKSPACE_ACTIVITY_EVENT, refresh);
  }, [load]);

  function labelFor(item: RecentAction) {
    return item.labelKey ? t(item.labelKey as TranslationKey) : item.label || item.key;
  }

  function activate(item: RecentAction) {
    if (item.type === "aiTool") {
      recordWorkspaceActivity(item.id);
      onSelectAiTool(item.key);
    }
  }

  async function clearRecent() {
    if (clearing) return;
    setClearing(true);
    try {
      const response = await fetch("/api/home/recent-actions", { method: "DELETE" });
      if (response.ok) setRecent([]);
    } catch (error) {
      console.error("Recent workspace actions clearing failed", error);
    } finally {
      setClearing(false);
    }
  }

  if (loading || recent.length === 0) return null;

  return (
    <section className="mb-4 flex items-center gap-3 overflow-hidden border-b border-slate-200 px-1 pb-3">
      <div className="hidden shrink-0 items-center gap-2 border-r border-slate-200 pr-3 text-xs font-bold text-slate-500 md:flex">
        <Clock3 size={14} /> {t("dashboard.recentActions")}
      </div>
      <div className="custom-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {recent.map((item) => {
          const Icon = homeActionIconMap[item.icon as keyof typeof homeActionIconMap] ?? FileText;
          const className = "flex shrink-0 items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800";
          return item.href ? (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => item.type === "template" && recordWorkspaceActivity(item.id)}
              className={className}
            >
              <Icon size={14} /> {labelFor(item)}
            </Link>
          ) : (
            <button key={item.id} type="button" onClick={() => activate(item)} className={className}>
              <Icon size={14} /> {labelFor(item)}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={clearRecent}
        disabled={clearing}
        title={t("dashboard.clearRecentActions")}
        aria-label={t("dashboard.clearRecentActions")}
        className="shrink-0 rounded-md p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
      >
        {clearing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
      </button>
    </section>
  );
}
