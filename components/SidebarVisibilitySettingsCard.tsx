"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Bot, Calculator, FileText, FlaskConical, LayoutDashboard, Link as LinkIcon, Loader2, Pill, RotateCcw, Zap } from "lucide-react";
import { translate, type TranslationKey } from "../lib/i18n";
import { useI18n } from "../lib/useI18n";

type UiLang = "fi" | "ru" | "en";

type SidebarVisibilityItem = {
  key: string;
  href: string;
  labelKey: TranslationKey;
  icon: "LayoutDashboard" | "FileText" | "Bot" | "Zap" | "LinkIcon" | "Pill" | "Calculator" | "FlaskConical";
  customOrder: number | null;
  isVisible: boolean;
};

const iconMap = {
  LayoutDashboard,
  FileText,
  Bot,
  Zap,
  LinkIcon,
  Pill,
  Calculator,
  FlaskConical,
};

const texts = {
  fi: {
    title: "Sivuvalikko",
    description: "Valitse, mitkä pääosion linkit näkyvät vasemman reunan valikossa ja missä järjestyksessä. Asetukset ja uloskirjautuminen pysyvät aina omassa alaosassaan.",
    loading: "Ladataan valikkoa...",
    loadFailed: "Valikon asetusten lataus epäonnistui.",
    saveFailed: "Valikon näkyvyysasetuksen tallennus epäonnistui.",
    orderFailed: "Valikon järjestyksen tallennus epäonnistui.",
    reset: "Palauta oletukset",
    resetFailed: "Valikon oletusasetusten palautus epäonnistui.",
    visible: "Näkyy valikossa",
    hidden: "Piilotettu valikosta",
    moveUp: "Siirrä ylemmäs",
    moveDown: "Siirrä alemmas",
    descriptions: {
      home: "Etusivu ja oma työpöytänäkymä.",
      templates: "Tekstimallit ja dokumenttipohjat.",
      "ai-tools": "Omat AI-työkalut tekstin muokkaukseen ja työnkulkuun.",
      "quick-guides": "Pikaohjeet ja kliiniset muistilistat.",
      links: "Tärkeät resurssit, ohjeet ja omat suosikkilinkit.",
      medicines: "Lääketiedot ja lääkehakemisto.",
      calculators: "Kliiniset laskurit oman työn tueksi.",
      "drug-libraries": "Pediatriset ja PCA-lääkevalikoimat.",
    },
  },
  ru: {
    title: "Боковое меню",
    description: "Выберите, какие основные разделы показываются в левом меню и в каком порядке. Настройки и выход остаются в нижнем служебном блоке.",
    loading: "Загрузка меню...",
    loadFailed: "Не удалось загрузить настройки бокового меню.",
    saveFailed: "Не удалось сохранить видимость пункта меню.",
    orderFailed: "Не удалось сохранить порядок пунктов меню.",
    reset: "Вернуть стандартные настройки",
    resetFailed: "Не удалось вернуть стандартные настройки меню.",
    visible: "Показывается в меню",
    hidden: "Скрыто из меню",
    moveUp: "Поднять выше",
    moveDown: "Опустить ниже",
    descriptions: {
      home: "Главная страница и ваш рабочий стол.",
      templates: "Шаблоны текста и заготовки документов.",
      "ai-tools": "Личные AI-инструменты для редактирования текста и работы.",
      "quick-guides": "Быстрые инструкции и клинические памятки.",
      links: "Важные ресурсы, инструкции и личные ссылки.",
      medicines: "Лекарственная информация и справочник.",
      calculators: "Клинические калькуляторы для повседневной работы.",
      "drug-libraries": "Педиатрические и PCA-библиотеки препаратов.",
    },
  },
  en: {
    title: "Sidebar menu",
    description: "Choose which main sections appear in the left sidebar and in what order. Settings and sign-out stay in the fixed utility area at the bottom.",
    loading: "Loading sidebar menu...",
    loadFailed: "Could not load sidebar menu settings.",
    saveFailed: "Could not save sidebar visibility setting.",
    orderFailed: "Could not save sidebar order.",
    reset: "Restore defaults",
    resetFailed: "Could not restore sidebar defaults.",
    visible: "Shown in sidebar",
    hidden: "Hidden from sidebar",
    moveUp: "Move up",
    moveDown: "Move down",
    descriptions: {
      home: "Home and your main workspace view.",
      templates: "Text templates and document patterns.",
      "ai-tools": "Personal AI tools for writing and workflow support.",
      "quick-guides": "Quick guides and clinical checklists.",
      links: "Important resources, instructions, and favourite links.",
      medicines: "Medication information and reference pages.",
      calculators: "Clinical calculators for daily work.",
      "drug-libraries": "Pediatric and PCA drug libraries.",
    },
  },
} as const;

export default function SidebarVisibilitySettingsCard() {
  const { language } = useI18n();
  const lang: UiLang = ["fi", "ru", "en"].includes(language as UiLang) ? (language as UiLang) : "fi";
  const i18n = texts[lang];
  const [items, setItems] = useState<SidebarVisibilityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [status, setStatus] = useState("");

  const loadVisibility = async () => {
    setIsLoading(true);
    setStatus("");
    try {
      const response = await fetch("/api/sidebar/visibility");
      if (!response.ok) throw new Error(i18n.loadFailed);
      const data = await response.json();
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      console.error(error);
      setStatus(i18n.loadFailed);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVisibility();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistOrder = async (nextItems: SidebarVisibilityItem[]) => {
    setIsReordering(true);
    setStatus("");

    try {
      const response = await fetch("/api/sidebar/visibility", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedKeys: nextItems.map((item) => item.key) }),
      });

      if (!response.ok) throw new Error(i18n.orderFailed);

      const data = await response.json();
      setItems(Array.isArray(data.items) ? data.items : nextItems);
    } catch (error) {
      console.error(error);
      setStatus(i18n.orderFailed);
      await loadVisibility();
    } finally {
      setIsReordering(false);
    }
  };

  const setItemVisibility = async (itemKey: string, isVisible: boolean) => {
    setUpdatingKey(itemKey);
    setStatus("");
    setItems((prev) => prev.map((item) => item.key === itemKey ? { ...item, isVisible } : item));

    try {
      const response = await fetch("/api/sidebar/visibility", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemKey, isVisible }),
      });

      if (!response.ok) throw new Error(i18n.saveFailed);
    } catch (error) {
      console.error(error);
      setStatus(i18n.saveFailed);
      await loadVisibility();
    } finally {
      setUpdatingKey(null);
    }
  };

  const moveItem = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= items.length || isReordering) return;

    const nextItems = [...items];
    const [movedItem] = nextItems.splice(index, 1);
    nextItems.splice(targetIndex, 0, movedItem);
    setItems(nextItems);
    await persistOrder(nextItems);
  };

  const resetDefaults = async () => {
    setIsResetting(true);
    setStatus("");
    try {
      const response = await fetch("/api/sidebar/visibility", { method: "DELETE" });
      if (!response.ok) throw new Error(i18n.resetFailed);
      await loadVisibility();
    } catch (error) {
      console.error(error);
      setStatus(i18n.resetFailed);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-slate-800">{i18n.title}</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-3xl">{i18n.description}</p>
        </div>
        <button
          onClick={resetDefaults}
          disabled={isResetting || isLoading || isReordering}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 disabled:opacity-50"
        >
          {isResetting ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
          {i18n.reset}
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
          <Loader2 size={16} className="animate-spin" /> {i18n.loading}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => {
            const Icon = iconMap[item.icon] ?? LayoutDashboard;
            const isUpdating = updatingKey === item.key;

            return (
              <div key={item.key} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.isVisible ? "bg-blue-100 text-blue-600" : "bg-slate-200 text-slate-400"}`}>
                    <Icon size={17} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-slate-800">{translate(lang, item.labelKey)}</div>
                    <p className="text-xs text-slate-500 leading-relaxed mt-1">
                      {i18n.descriptions[item.key as keyof typeof i18n.descriptions]}
                    </p>
                    <div className={`mt-2 text-[10px] font-bold uppercase ${item.isVisible ? "text-emerald-600" : "text-slate-400"}`}>
                      {item.isVisible ? i18n.visible : i18n.hidden}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => moveItem(index, -1)}
                      disabled={isReordering || index === 0}
                      aria-label={i18n.moveUp}
                      title={i18n.moveUp}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItem(index, 1)}
                      disabled={isReordering || index === items.length - 1}
                      aria-label={i18n.moveDown}
                      title={i18n.moveDown}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={item.isVisible}
                      disabled={isUpdating || isReordering}
                      onChange={(event) => setItemVisibility(item.key, event.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {status && <div className="text-xs text-red-500">{status}</div>}
    </div>
  );
}
