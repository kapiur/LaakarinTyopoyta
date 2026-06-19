"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  Plus,
  Save,
  Search,
  SlidersHorizontal,
  X,
  Zap,
} from "lucide-react";
import { recordWorkspaceActivity, WORKSPACE_ACTIVITY_EVENT } from "../../lib/dashboard/workspaceActivityClient";
import type { TranslationKey } from "../../lib/i18n";
import { useI18n } from "../../lib/useI18n";
import { homeActionIconMap } from "./homeActionIcons";

export type HomeQuickAction = {
  id: string;
  type: "route" | "calculator" | "template" | "aiTool";
  key: string;
  label?: string;
  labelKey?: string;
  description?: string;
  descriptionKey?: string;
  href?: string;
  icon: string;
  group: "route" | "calculator" | "template" | "aiTool";
};

function moveItem(items: HomeQuickAction[], index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export default function QuickActionsBar({
  activeAiToolKey,
  onSelectAiTool,
}: {
  activeAiToolKey: string;
  onSelectAiTool: (key: string) => void;
}) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<HomeQuickAction[]>([]);
  const [draft, setDraft] = useState<HomeQuickAction[]>([]);
  const [catalog, setCatalog] = useState<HomeQuickAction[]>([]);
  const [maxActions, setMaxActions] = useState(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  function localizedLabel(item: HomeQuickAction) {
    return item.labelKey ? t(item.labelKey as TranslationKey) : item.label || item.key;
  }

  function localizedDescription(item: HomeQuickAction) {
    return item.descriptionKey ? t(item.descriptionKey as TranslationKey) : item.description || "";
  }

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const response = await fetch("/api/home/quick-actions", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "load failed");
        if (!mounted) return;
        setSelected(Array.isArray(data.selected) ? data.selected : []);
        setDraft(Array.isArray(data.selected) ? data.selected : []);
        setCatalog(Array.isArray(data.catalog) ? data.catalog : []);
        setMaxActions(Number(data.maxActions) || 10);
      } catch (loadError) {
        console.error("Home quick actions loading failed", loadError);
        if (mounted) setError(t("dashboard.quickActionsLoadFailed"));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [t]);

  const available = useMemo(() => {
    const selectedIds = new Set(draft.map((item) => item.id));
    const needle = search.trim().toLocaleLowerCase();
    return catalog.filter((item) => {
      if (selectedIds.has(item.id)) return false;
      if (!needle) return true;
      return `${localizedLabel(item)} ${localizedDescription(item)}`.toLocaleLowerCase().includes(needle);
    });
    // Localization helpers intentionally follow the current t() function.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, draft, search, t]);

  const availableGroups = useMemo(
    () => ["aiTool", "calculator", "template", "route"]
      .map((group) => ({ group, items: available.filter((item) => item.group === group) }))
      .filter((entry) => entry.items.length > 0),
    [available],
  );

  function openSettings() {
    setDraft(selected);
    setSearch("");
    setError("");
    setOpen(true);
  }

  async function save() {
    if (draft.length < 1 || saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/home/quick-actions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: draft.map((item) => item.id) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "save failed");
      const nextSelected = Array.isArray(data.selected) ? data.selected : draft;
      setSelected(nextSelected);
      setDraft(nextSelected);
      setOpen(false);
      window.dispatchEvent(new Event(WORKSPACE_ACTIVITY_EVENT));
    } catch (saveError) {
      console.error("Home quick actions saving failed", saveError);
      setError(t("dashboard.quickActionsSaveFailed"));
    } finally {
      setSaving(false);
    }
  }

  function activate(item: HomeQuickAction) {
    if (item.type === "aiTool") {
      recordWorkspaceActivity(item.id);
      onSelectAiTool(item.key);
    }
  }

  return (
    <>
      <section className="mb-4 flex items-center gap-3 overflow-hidden rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <div className="hidden shrink-0 items-center gap-2 border-r border-slate-200 pr-3 text-xs font-bold text-slate-500 md:flex">
          <Zap size={15} className="text-blue-600" /> {t("dashboard.quickAccess")}
        </div>
        <div className="custom-scrollbar flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto py-0.5">
          {loading ? (
            <span className="flex items-center gap-2 px-3 py-2 text-xs text-slate-400">
              <Loader2 size={14} className="animate-spin" /> {t("common.loading")}
            </span>
          ) : selected.length > 0 ? (
            selected.map((item) => {
              const Icon = homeActionIconMap[item.icon as keyof typeof homeActionIconMap] ?? FileText;
              const className = `flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs font-bold transition-colors ${
                item.type === "aiTool" && item.key === activeAiToolKey
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"
              }`;
              return item.href ? (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => item.type === "template" && recordWorkspaceActivity(item.id)}
                  className={className}
                >
                  <Icon size={15} /> {localizedLabel(item)}
                </Link>
              ) : (
                <button key={item.id} type="button" onClick={() => activate(item)} className={className}>
                  <Icon size={15} /> {localizedLabel(item)}
                </button>
              );
            })
          ) : (
            <span className="px-3 py-2 text-xs text-slate-400">{t("dashboard.noQuickActions")}</span>
          )}
        </div>
        <button
          type="button"
          onClick={openSettings}
          title={t("dashboard.customizeQuickAccess")}
          aria-label={t("dashboard.customizeQuickAccess")}
          className="shrink-0 rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <SlidersHorizontal size={17} />
        </button>
      </section>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-3 backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-actions-title"
            className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 id="quick-actions-title" className="text-lg font-bold text-slate-900">{t("dashboard.quickActionsSettingsTitle")}</h2>
                <p className="mt-1 text-xs text-slate-500">{draft.length}/{maxActions}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title={t("common.close")}>
                <X size={18} />
              </button>
            </header>

            <div className="grid min-h-0 flex-1 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <section className="custom-scrollbar min-h-0 overflow-y-auto border-b border-slate-200 p-4 md:border-b-0 md:border-r">
                <h3 className="mb-3 text-xs font-black uppercase text-slate-500">{t("dashboard.selectedQuickActions")}</h3>
                <div className="divide-y divide-slate-100 border-y border-slate-100">
                  {draft.map((item, index) => {
                    const Icon = homeActionIconMap[item.icon as keyof typeof homeActionIconMap] ?? FileText;
                    return (
                      <div key={item.id} className="flex items-center gap-3 py-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600"><Icon size={16} /></div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-bold text-slate-800">{localizedLabel(item)}</div>
                          <div className="truncate text-[11px] text-slate-400">{t(`dashboard.quickActionGroup${item.group === "aiTool" ? "Ai" : item.group === "calculator" ? "Calculators" : item.group === "template" ? "Templates" : "Workspace"}` as TranslationKey)}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => setDraft((current) => moveItem(current, index, -1))} disabled={index === 0} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-25" title={t("dashboard.moveActionUp")}><ChevronUp size={15} /></button>
                          <button type="button" onClick={() => setDraft((current) => moveItem(current, index, 1))} disabled={index === draft.length - 1} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-25" title={t("dashboard.moveActionDown")}><ChevronDown size={15} /></button>
                          <button type="button" onClick={() => setDraft((current) => current.filter((entry) => entry.id !== item.id))} disabled={draft.length === 1} className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-25" title={t("dashboard.removeQuickAction")}><X size={15} /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="custom-scrollbar min-h-0 overflow-y-auto p-4">
                <div className="sticky top-0 z-10 mb-4 bg-white pb-2">
                  <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 focus-within:border-blue-400">
                    <Search size={15} className="text-slate-400" />
                    <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("dashboard.searchQuickActions")} className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none" />
                  </label>
                </div>
                <div className="space-y-5">
                  {availableGroups.map(({ group, items }) => (
                    <div key={group}>
                      <h3 className="mb-2 text-xs font-black uppercase text-slate-500">{t(`dashboard.quickActionGroup${group === "aiTool" ? "Ai" : group === "calculator" ? "Calculators" : group === "template" ? "Templates" : "Workspace"}` as TranslationKey)}</h3>
                      <div className="divide-y divide-slate-100 border-y border-slate-100">
                        {items.map((item) => {
                          const Icon = homeActionIconMap[item.icon as keyof typeof homeActionIconMap] ?? FileText;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setDraft((current) => current.length < maxActions ? [...current, item] : current)}
                              disabled={draft.length >= maxActions}
                              className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600"><Icon size={16} /></div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-bold text-slate-800">{localizedLabel(item)}</div>
                                {localizedDescription(item) && <div className="truncate text-[11px] text-slate-500">{localizedDescription(item)}</div>}
                              </div>
                              <Plus size={16} className="shrink-0 text-blue-600" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {availableGroups.length === 0 && <div className="py-8 text-center text-sm text-slate-400">{t("dashboard.noAvailableQuickActions")}</div>}
                </div>
              </section>
            </div>

            <footer className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
              <span className="text-xs font-medium text-red-600">{error}</span>
              <div className="ml-auto flex items-center gap-2">
                <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">{t("common.cancel")}</button>
                <button type="button" onClick={save} disabled={saving || draft.length < 1} className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:bg-slate-300">
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  {t("common.save")}
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
