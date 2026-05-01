"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useI18n } from "../lib/useI18n";

type Replacements = Record<string, string>;

const templateTextReplacements: Record<string, Replacements> = {
  fi: {},
  ru: {
    "Tekstimallit": "Текстовые шаблоны",
    "Hallinta ja generointi": "Управление и генерация",
    "Hallinnoi osioita": "Управление разделами",
    "Uusi malli": "Новый шаблон",
    "Muokkaa mallia": "Редактировать шаблон",
    "Luo uusi malli": "Создать новый шаблон",
    "Mallin Otsikko": "Название шаблона",
    "Kategoria": "Категория",
    "Sisältö & Muuttujat": "Содержание и переменные",
    "Tallenna Järjestelmään": "Сохранить в систему",
    "Parametrit": "Параметры",
    "Tulos": "Результат",
    "Jaa": "Поделиться",
    "Kopioi": "Копировать",
    "Kopioitu!": "Скопировано!",
    "Hiotaan tekstiä...": "AI корректирует текст...",
    "Määritä parametrit...": "Заполните параметры...",
    "AI on optimoinut tekstin.": "AI оптимизировал текст.",
    "Palauta alkuperäinen": "Вернуть исходный вариант",
    "Valitse malli aloittaaksesi": "Выберите шаблон, чтобы начать",
    "Osioiden hallinta": "Управление разделами",
    "Uusi osio": "Новый раздел",
    "Luo": "Создать",
    "Tallenna": "Сохранить",
    "Peruuta": "Отмена",
    "Ei osioita": "Нет разделов",
  },
  en: {
    "Tekstimallit": "Text templates",
    "Hallinta ja generointi": "Management and generation",
    "Hallinnoi osioita": "Manage sections",
    "Uusi malli": "New template",
    "Muokkaa mallia": "Edit template",
    "Luo uusi malli": "Create new template",
    "Mallin Otsikko": "Template title",
    "Kategoria": "Category",
    "Sisältö & Muuttujat": "Content & variables",
    "Tallenna Järjestelmään": "Save to system",
    "Parametrit": "Parameters",
    "Tulos": "Result",
    "Jaa": "Share",
    "Kopioi": "Copy",
    "Kopioitu!": "Copied!",
    "Hiotaan tekstiä...": "AI is polishing the text...",
    "Määritä parametrit...": "Set parameters...",
    "AI on optimoinut tekstin.": "AI has optimised the text.",
    "Palauta alkuperäinen": "Restore original",
    "Valitse malli aloittaaksesi": "Select a template to start",
    "Osioiden hallinta": "Section management",
    "Uusi osio": "New section",
    "Luo": "Create",
    "Tallenna": "Save",
    "Peruuta": "Cancel",
    "Ei osioita": "No sections",
  },
};

const placeholderReplacements: Record<string, Replacements> = {
  fi: {},
  ru: {
    "Etsi malleja...": "Искать шаблоны...",
    "Esim. Status": "Например: Status",
  },
  en: {
    "Etsi malleja...": "Search templates...",
    "Esim. Status": "Example: Status",
  },
};

const reverseTextReplacements: Record<string, Replacements> = {
  ru: Object.fromEntries(Object.entries(templateTextReplacements.ru).map(([fi, value]) => [value, fi])),
  en: Object.fromEntries(Object.entries(templateTextReplacements.en).map(([fi, value]) => [value, fi])),
};

const reversePlaceholderReplacements: Record<string, Replacements> = {
  ru: Object.fromEntries(Object.entries(placeholderReplacements.ru).map(([fi, value]) => [value, fi])),
  en: Object.fromEntries(Object.entries(placeholderReplacements.en).map(([fi, value]) => [value, fi])),
};

function normalizeStaticUiText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function replaceTextNodes(root: ParentNode, replacements: Replacements) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const parent = node.parentElement;
    if (!parent) continue;
    if (["SCRIPT", "STYLE", "TEXTAREA", "INPUT"].includes(parent.tagName)) continue;
    textNodes.push(node);
  }

  for (const node of textNodes) {
    const normalized = normalizeStaticUiText(node.nodeValue || "");
    const replacement = replacements[normalized];
    if (replacement) node.nodeValue = (node.nodeValue || "").replace(normalized, replacement);
  }
}

function replacePlaceholders(root: ParentNode, replacements: Replacements) {
  const fields = root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input[placeholder], textarea[placeholder]");
  fields.forEach((field) => {
    const placeholder = field.getAttribute("placeholder") || "";
    const replacement = replacements[placeholder];
    if (replacement) field.setAttribute("placeholder", replacement);
  });
}

export default function TemplatesI18nEnhancer() {
  const pathname = usePathname();
  const { language } = useI18n();

  useEffect(() => {
    if (!pathname.startsWith("/templates")) return;

    const applyTranslations = () => {
      const root = document.querySelector("main");
      if (!root) return;

      replaceTextNodes(root, reverseTextReplacements.ru || {});
      replaceTextNodes(root, reverseTextReplacements.en || {});
      replacePlaceholders(root, reversePlaceholderReplacements.ru || {});
      replacePlaceholders(root, reversePlaceholderReplacements.en || {});

      if (language === "fi") return;

      replaceTextNodes(root, templateTextReplacements[language] || {});
      replacePlaceholders(root, placeholderReplacements[language] || {});
    };

    applyTranslations();
    const observer = new MutationObserver(() => applyTranslations());
    const root = document.querySelector("main");
    if (root) observer.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["placeholder"] });

    return () => observer.disconnect();
  }, [pathname, language]);

  return null;
}
