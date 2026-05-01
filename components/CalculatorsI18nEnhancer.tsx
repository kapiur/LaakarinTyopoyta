"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useI18n } from "../lib/useI18n";

type Replacements = Record<string, string>;

const text: Record<string, Replacements> = {
  fi: {},
  ru: {
    "pca-Laskuri": "PCA-калькулятор",
    "vte-Laskuri": "VTE-калькулятор",
    "pe-Laskuri": "PE-калькулятор",
    "cad-Laskuri": "CAD-калькулятор",
    "chads-Laskuri": "CHADS-калькулятор",
    "peds-Laskuri": "PEDS-калькулятор",
    "bmi-Laskuri": "BMI-калькулятор",
    "gfr-Laskuri": "GFR-калькулятор",
    "Paino (kg)": "Вес (kg)",
    "Annos (mg/kg/vrk)": "Доза (mg/kg/vrk)",
    "Kuurin kesto (päivää)": "Длительность курса (päivää)",
    "Vahvuus (mg / ml)": "Концентрация (mg / ml)",
    "Antokerrat (vrk)": "Приёмов (vrk)",
    "Pullon koko (ml)": "Размер флакона (ml)",
    "Tyhjennä lomake": "Очистить форму",
    "Asetukset": "Настройки",
    "Lääkekirjasto": "Библиотека препаратов",
    "Laske": "Рассчитать",
    "Kopioi": "Копировать",
    "Kopioitu": "Скопировано",
    "Tulos": "Результат",
    "Potilaan ikä": "Возраст пациента",
    "Sukupuoli": "Пол",
    "Mies": "Мужчина",
    "Nainen": "Женщина",
    "Ikä": "Возраст",
    "Kivun tyyppi": "Тип боли",
    "Riskitekijät": "Факторы риска",
    "Pituus (cm)": "Рост (cm)",
    "Ikä (v)": "Возраст (лет)",
    "Krea (µmol/l)": "Krea (µmol/l)",
    "Painoindeksi": "Индекс массы тела",
    "Ei tulosta": "Нет результата",
    "Laske tulos": "Рассчитать результат",
    "Tarkista lähtötiedot": "Проверьте исходные данные",
  },
  en: {
    "pca-Laskuri": "PCA calculator",
    "vte-Laskuri": "VTE calculator",
    "pe-Laskuri": "PE calculator",
    "cad-Laskuri": "CAD calculator",
    "chads-Laskuri": "CHADS calculator",
    "peds-Laskuri": "PEDS calculator",
    "bmi-Laskuri": "BMI calculator",
    "gfr-Laskuri": "GFR calculator",
    "Paino (kg)": "Weight (kg)",
    "Annos (mg/kg/vrk)": "Dose (mg/kg/day)",
    "Kuurin kesto (päivää)": "Course duration (days)",
    "Vahvuus (mg / ml)": "Strength (mg / ml)",
    "Antokerrat (vrk)": "Doses (day)",
    "Pullon koko (ml)": "Bottle size (ml)",
    "Tyhjennä lomake": "Clear form",
    "Asetukset": "Settings",
    "Lääkekirjasto": "Drug library",
    "Laske": "Calculate",
    "Kopioi": "Copy",
    "Kopioitu": "Copied",
    "Tulos": "Result",
    "Potilaan ikä": "Patient age",
    "Sukupuoli": "Sex",
    "Mies": "Male",
    "Nainen": "Female",
    "Ikä": "Age",
    "Kivun tyyppi": "Pain type",
    "Riskitekijät": "Risk factors",
    "Pituus (cm)": "Height (cm)",
    "Ikä (v)": "Age (y)",
    "Krea (µmol/l)": "Creatinine (µmol/l)",
    "Painoindeksi": "Body mass index",
    "Ei tulosta": "No result",
    "Laske tulos": "Calculate result",
    "Tarkista lähtötiedot": "Check input values",
  },
};

const placeholders: Record<string, Replacements> = {
  fi: {},
  ru: {
    "Nimi": "Название",
    "-- Valitse lääke --": "-- Выберите препарат --",
  },
  en: {
    "Nimi": "Name",
    "-- Valitse lääke --": "-- Select drug --",
  },
};

const reverseText: Record<string, Replacements> = {
  ru: Object.fromEntries(Object.entries(text.ru).map(([fi, value]) => [value, fi])),
  en: Object.fromEntries(Object.entries(text.en).map(([fi, value]) => [value, fi])),
};

const reversePlaceholders: Record<string, Replacements> = {
  ru: Object.fromEntries(Object.entries(placeholders.ru).map(([fi, value]) => [value, fi])),
  en: Object.fromEntries(Object.entries(placeholders.en).map(([fi, value]) => [value, fi])),
};

function normalize(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function replaceText(root: ParentNode, map: Replacements) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const parent = node.parentElement;
    if (!parent) continue;
    if (["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "CODE", "OPTION"].includes(parent.tagName)) continue;
    nodes.push(node);
  }

  for (const node of nodes) {
    const current = normalize(node.nodeValue || "");
    const replacement = map[current];
    if (replacement) node.nodeValue = (node.nodeValue || "").replace(current, replacement);
  }
}

function replacePlaceholders(root: ParentNode, map: Replacements) {
  root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input[placeholder], textarea[placeholder]").forEach((field) => {
    const value = field.getAttribute("placeholder") || "";
    const replacement = map[value];
    if (replacement) field.setAttribute("placeholder", replacement);
  });
}

function replaceOptions(root: ParentNode, map: Replacements) {
  root.querySelectorAll<HTMLOptionElement>("option").forEach((option) => {
    const value = normalize(option.textContent || "");
    const replacement = map[value];
    if (replacement) option.textContent = replacement;
  });
}

export default function CalculatorsI18nEnhancer() {
  const pathname = usePathname();
  const { language } = useI18n();

  useEffect(() => {
    if (pathname !== "/calculators") return;

    const apply = () => {
      const root = document.body;
      replaceText(root, reverseText.ru || {});
      replaceText(root, reverseText.en || {});
      replacePlaceholders(root, reversePlaceholders.ru || {});
      replacePlaceholders(root, reversePlaceholders.en || {});
      replaceOptions(root, reversePlaceholders.ru || {});
      replaceOptions(root, reversePlaceholders.en || {});

      if (language === "fi") return;

      replaceText(root, text[language] || {});
      replacePlaceholders(root, placeholders[language] || {});
      replaceOptions(root, placeholders[language] || {});
    };

    const applySoon = () => {
      window.setTimeout(apply, 0);
      window.setTimeout(apply, 75);
    };

    applySoon();
    window.addEventListener("click", applySoon, true);
    window.addEventListener("change", applySoon, true);

    return () => {
      window.removeEventListener("click", applySoon, true);
      window.removeEventListener("change", applySoon, true);
    };
  }, [pathname, language]);

  return null;
}
