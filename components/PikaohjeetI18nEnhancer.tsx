"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useI18n } from "../lib/useI18n";

type Replacements = Record<string, string>;

const replacements: Record<string, Replacements> = {
  fi: {},
  ru: {
    "Pikaohjeet": "Быстрые инструкции",
    "Kliiniset ohjekortit": "Клинические карточки",
    "Muokkaa": "Редактировать",
    "Uusi pikaohje": "Новая инструкция",
    "Parametrit": "Параметры",
    "Tyhjennä": "Очистить",
    "Valitse ohje listasta": "Выберите инструкцию из списка",
    "Hallinta": "Управление",
    "Sisältö": "Содержание",
    "Kentät": "Поля",
    "Säännöt": "Правила",
    "Nimi": "Название",
    "Subtitle": "Подзаголовок",
    "Osion Otsikko": "Заголовок раздела",
    "Avain (Key)": "Ключ (Key)",
    "Lisää uusi osio": "Добавить новый раздел",
    "Uusi osio": "Новый раздел",
    "Nimi (Label)": "Название (Label)",
    "Tyyppi": "Тип",
    "Vaihtoehdot (pilkulla erotettu)": "Варианты через запятую",
    "Lisää uusi kenttä": "Добавить новое поле",
    "JOS": "ЕСЛИ",
    "JA (И)": "И",
    "Tallenna": "Сохранить",
    "Tallennettu": "Сохранено",
    "Poista": "Удалить",
    "Peruuta": "Отмена",
    "Valitse": "Выбрать",
  },
  en: {
    "Pikaohjeet": "Quick guides",
    "Kliiniset ohjekortit": "Clinical cards",
    "Muokkaa": "Edit",
    "Uusi pikaohje": "New quick guide",
    "Parametrit": "Parameters",
    "Tyhjennä": "Clear",
    "Valitse ohje listasta": "Select a guide from the list",
    "Hallinta": "Management",
    "Sisältö": "Content",
    "Kentät": "Fields",
    "Säännöt": "Rules",
    "Nimi": "Name",
    "Subtitle": "Subtitle",
    "Osion Otsikko": "Section title",
    "Avain (Key)": "Key",
    "Lisää uusi osio": "Add new section",
    "Uusi osio": "New section",
    "Nimi (Label)": "Name (Label)",
    "Tyyppi": "Type",
    "Vaihtoehdot (pilkulla erotettu)": "Options separated with commas",
    "Lisää uusi kenttä": "Add new field",
    "JOS": "IF",
    "JA (И)": "AND",
    "Tallenna": "Save",
    "Tallennettu": "Saved",
    "Poista": "Delete",
    "Peruuta": "Cancel",
    "Valitse": "Select",
  },
};

const placeholders: Record<string, Replacements> = {
  fi: {},
  ru: {
    "Etsi...": "Искать...",
    "Esim: Tyyppi 1, Tyyppi 2": "Например: Tyyppi 1, Tyyppi 2",
  },
  en: {
    "Etsi...": "Search...",
    "Esim: Tyyppi 1, Tyyppi 2": "Example: Tyyppi 1, Tyyppi 2",
  },
};

const reverseReplacements: Record<string, Replacements> = {
  ru: Object.fromEntries(Object.entries(replacements.ru).map(([fi, value]) => [value, fi])),
  en: Object.fromEntries(Object.entries(replacements.en).map(([fi, value]) => [value, fi])),
};

const reversePlaceholders: Record<string, Replacements> = {
  ru: Object.fromEntries(Object.entries(placeholders.ru).map(([fi, value]) => [value, fi])),
  en: Object.fromEntries(Object.entries(placeholders.en).map(([fi, value]) => [value, fi])),
};

const confirmMessages = {
  fi: {
    deleteGuide: "Haluatko varmasti poistaa tämän ohjeen lopullisesti?",
    newGuide: "Anna uuden kortin nimi:",
  },
  ru: {
    deleteGuide: "Вы действительно хотите окончательно удалить эту инструкцию?",
    newGuide: "Введите название новой карточки:",
  },
  en: {
    deleteGuide: "Do you really want to permanently delete this guide?",
    newGuide: "Enter the name of the new card:",
  },
} as const;

function normalize(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function replaceTextNodes(root: ParentNode, map: Replacements) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const parent = node.parentElement;
    if (!parent) continue;
    if (["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "CODE"].includes(parent.tagName)) continue;
    nodes.push(node);
  }

  for (const node of nodes) {
    const current = normalize(node.nodeValue || "");
    const replacement = map[current];
    if (replacement) node.nodeValue = (node.nodeValue || "").replace(current, replacement);
  }
}

function replaceInputPlaceholders(root: ParentNode, map: Replacements) {
  root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input[placeholder], textarea[placeholder]").forEach((field) => {
    const value = field.getAttribute("placeholder") || "";
    const replacement = map[value];
    if (replacement) field.setAttribute("placeholder", replacement);
  });
}

export default function PikaohjeetI18nEnhancer() {
  const pathname = usePathname();
  const { language } = useI18n();

  useEffect(() => {
    if (!pathname.startsWith("/pikaohjeet")) return;

    const apply = () => {
      const root = document.querySelector("main") || document.body;

      replaceTextNodes(root, reverseReplacements.ru || {});
      replaceTextNodes(root, reverseReplacements.en || {});
      replaceInputPlaceholders(root, reversePlaceholders.ru || {});
      replaceInputPlaceholders(root, reversePlaceholders.en || {});

      if (language === "fi") return;

      replaceTextNodes(root, replacements[language] || {});
      replaceInputPlaceholders(root, placeholders[language] || {});
    };

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["placeholder"] });
    return () => observer.disconnect();
  }, [pathname, language]);

  useEffect(() => {
    if (!pathname.startsWith("/pikaohjeet")) return;

    const originalConfirm = window.confirm;
    const originalPrompt = window.prompt;
    const c = confirmMessages[language] ?? confirmMessages.fi;

    window.confirm = (message?: string) => {
      if (message === confirmMessages.fi.deleteGuide) return originalConfirm(c.deleteGuide);
      return originalConfirm(message);
    };

    window.prompt = (message?: string, defaultValue?: string) => {
      if (message === confirmMessages.fi.newGuide) return originalPrompt(c.newGuide, defaultValue);
      return originalPrompt(message, defaultValue);
    };

    return () => {
      window.confirm = originalConfirm;
      window.prompt = originalPrompt;
    };
  }, [pathname, language]);

  return null;
}
