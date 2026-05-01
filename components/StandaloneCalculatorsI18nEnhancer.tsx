"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useI18n } from "../lib/useI18n";

type Replacements = Record<string, string>;

const text: Record<string, Replacements> = {
  fi: {},
  ru: {
    "← Takaisin laskureihin": "← Назад к калькуляторам",
    "PCA-laskuri": "PCA-калькулятор",
    "PEDS-laskuri": "PEDS-калькулятор",
    "Parannettu PCA-laskuri. Lääkekirjaston hallinta on erillisellä Lääkekirjastot-sivulla.": "Расширенный PCA-калькулятор. Управление библиотекой препаратов находится на отдельной странице библиотек.",
    "Valitse indikaatio ja lääke omasta kirjastosta. Arvot täyttyvät automaattisesti, mutta niitä voi muokata käsin.": "Выберите показание и препарат из собственной библиотеки. Значения заполняются автоматически, но их можно изменить вручную.",
    "Lääkekirjastot": "Библиотеки препаратов",
    "Päivitä": "Обновить",
    "Lääke 1 ja mg/vrk": "Препарат 1 и mg/vrk",
    "Lääke 2 ja mg/vrk": "Препарат 2 и mg/vrk",
    "Lääke 3 ja mg/vrk": "Препарат 3 и mg/vrk",
    "Poista": "Удалить",
    "Lisää lääke": "Добавить препарат",
    "Preset: 3 vrk / ad 25 / 0,4 ml/h": "Preset: 3 vrk / ad 25 / 0,4 ml/h",
    "Preset: 5 vrk / ad 50 / 0,4 ml/h": "Preset: 5 vrk / ad 50 / 0,4 ml/h",
    "Tyhjennä lomake": "Очистить форму",
    "Laskelmat": "Расчёты",
    "Kopioi": "Копировать",
    "Kopioitu": "Скопировано",
    "Syötä tiedot": "Введите данные",
    "Lääkkeet yhteensä": "Препараты всего",
    "NaCl lisätään": "Добавить NaCl",
    "PCA-perusasetukset": "Основные настройки PCA",
    "Boluslaskenta": "Расчёт болюса",
    "Laskennallinen 2 × tuntiannos.": "Расчётно 2 × часовая доза.",
    "Tarkista annokset, yhteensopivuus, munuaistoiminta, sedaatioaste ja paikallinen ohjeistus ennen käyttöönottoa.": "Перед применением проверьте дозы, совместимость, функцию почек, степень седации и локальные инструкции.",
    "Indikaatio / sairaus": "Показание / заболевание",
    "Lääke": "Препарат",
    "Kaikki indikaatiot": "Все показания",
    "Paino (kg)": "Вес (kg)",
    "Annos (mg/kg/vrk)": "Доза (mg/kg/vrk)",
    "Annos (iu/kg/vrk)": "Доза (IU/kg/vrk)",
    "Yksikkö": "Единица",
    "Vahvuus (mg/ml)": "Концентрация (mg/ml)",
    "Vahvuus (iu/ml)": "Концентрация (IU/ml)",
    "Vahvuus (mg/tab)": "Концентрация (mg/tab)",
    "Vahvuus (iu/tab)": "Концентрация (IU/tab)",
    "Kesto (pv)": "Длительность (pv)",
    "Pakkaus (ml)": "Упаковка (ml)",
    "Pakkaus (kpl)": "Упаковка (kpl)",
    "Antokerrat / vrk": "Приёмов / vrk",
    "Vuorokausiannos": "Суточная доза",
    "Koko kuurin tarve": "Потребность на весь курс",
    "Tarvittava tilavuus": "Необходимый объём",
    "Koko kuurin määrä": "Количество на весь курс",
    "Määrätään reseptiin koko kuurille": "Назначается в рецепте на весь курс",
    "Kerta-annos (ml)": "Разовая доза (ml)",
    "Kerta-annos (tabl)": "Разовая доза (tabl)",
    "Resepti": "Рецепт",
    "Tarkista tulos aina ennen kliinistä käyttöä potilaan iän, painon, munuaistoiminnan, käyttöaiheen ja paikallisten ohjeiden mukaan.": "Всегда проверяйте результат перед клиническим применением с учётом возраста, веса, функции почек, показания и локальных инструкций.",
  },
  en: {
    "← Takaisin laskureihin": "← Back to calculators",
    "PCA-laskuri": "PCA calculator",
    "PEDS-laskuri": "PEDS calculator",
    "Parannettu PCA-laskuri. Lääkekirjaston hallinta on erillisellä Lääkekirjastot-sivulla.": "Improved PCA calculator. Drug library management is on the separate drug libraries page.",
    "Valitse indikaatio ja lääke omasta kirjastosta. Arvot täyttyvät automaattisesti, mutta niitä voi muokata käsin.": "Select an indication and a drug from your own library. Values are filled automatically but can be edited manually.",
    "Lääkekirjastot": "Drug libraries",
    "Päivitä": "Refresh",
    "Lääke 1 ja mg/vrk": "Drug 1 and mg/day",
    "Lääke 2 ja mg/vrk": "Drug 2 and mg/day",
    "Lääke 3 ja mg/vrk": "Drug 3 and mg/day",
    "Poista": "Delete",
    "Lisää lääke": "Add drug",
    "Preset: 3 vrk / ad 25 / 0,4 ml/h": "Preset: 3 days / ad 25 / 0.4 ml/h",
    "Preset: 5 vrk / ad 50 / 0,4 ml/h": "Preset: 5 days / ad 50 / 0.4 ml/h",
    "Tyhjennä lomake": "Clear form",
    "Laskelmat": "Calculations",
    "Kopioi": "Copy",
    "Kopioitu": "Copied",
    "Syötä tiedot": "Enter values",
    "Lääkkeet yhteensä": "Drugs total",
    "NaCl lisätään": "Add NaCl",
    "PCA-perusasetukset": "PCA basic settings",
    "Boluslaskenta": "Bolus calculation",
    "Laskennallinen 2 × tuntiannos.": "Calculated as 2 × hourly dose.",
    "Tarkista annokset, yhteensopivuus, munuaistoiminta, sedaatioaste ja paikallinen ohjeistus ennen käyttöönottoa.": "Check doses, compatibility, renal function, sedation level and local guidance before use.",
    "Indikaatio / sairaus": "Indication / disease",
    "Lääke": "Drug",
    "Kaikki indikaatiot": "All indications",
    "Paino (kg)": "Weight (kg)",
    "Annos (mg/kg/vrk)": "Dose (mg/kg/day)",
    "Annos (iu/kg/vrk)": "Dose (IU/kg/day)",
    "Yksikkö": "Unit",
    "Vahvuus (mg/ml)": "Strength (mg/ml)",
    "Vahvuus (iu/ml)": "Strength (IU/ml)",
    "Vahvuus (mg/tab)": "Strength (mg/tab)",
    "Vahvuus (iu/tab)": "Strength (IU/tab)",
    "Kesto (pv)": "Duration (days)",
    "Pakkaus (ml)": "Package (ml)",
    "Pakkaus (kpl)": "Package (pcs)",
    "Antokerrat / vrk": "Doses / day",
    "Vuorokausiannos": "Daily dose",
    "Koko kuurin tarve": "Total course need",
    "Tarvittava tilavuus": "Required volume",
    "Koko kuurin määrä": "Total course amount",
    "Määrätään reseptiin koko kuurille": "Prescribe for the whole course",
    "Kerta-annos (ml)": "Single dose (ml)",
    "Kerta-annos (tabl)": "Single dose (tabl)",
    "Resepti": "Prescription",
    "Tarkista tulos aina ennen kliinistä käyttöä potilaan iän, painon, munuaistoiminnan, käyttöaiheen ja paikallisten ohjeiden mukaan.": "Always check the result before clinical use according to age, weight, renal function, indication and local guidance.",
  },
};

const placeholders: Record<string, Replacements> = {
  fi: {},
  ru: {
    "-- Valitse lääke --": "-- Выберите препарат --",
  },
  en: {
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
  nodes.forEach((node) => {
    const value = normalize(node.nodeValue || "");
    const replacement = map[value];
    if (replacement) node.nodeValue = (node.nodeValue || "").replace(value, replacement);
  });
}

function replaceOptions(root: ParentNode, map: Replacements) {
  root.querySelectorAll<HTMLOptionElement>("option").forEach((option) => {
    const value = normalize(option.textContent || "");
    const replacement = map[value];
    if (replacement) option.textContent = replacement;
  });
}

export default function StandaloneCalculatorsI18nEnhancer() {
  const pathname = usePathname();
  const { language } = useI18n();

  useEffect(() => {
    const applies = pathname === "/calculators/pca" || pathname === "/calculators/peds";
    if (!applies) return;

    const apply = () => {
      const root = document.body;
      replaceText(root, reverseText.ru || {});
      replaceText(root, reverseText.en || {});
      replaceOptions(root, reversePlaceholders.ru || {});
      replaceOptions(root, reversePlaceholders.en || {});

      if (language === "fi") return;

      replaceText(root, text[language] || {});
      replaceOptions(root, placeholders[language] || {});
    };

    const applySoon = () => {
      window.setTimeout(apply, 0);
      window.setTimeout(apply, 75);
      window.setTimeout(apply, 200);
    };

    applySoon();
    window.addEventListener("click", applySoon, true);
    window.addEventListener("change", applySoon, true);
    window.addEventListener("input", applySoon, true);

    return () => {
      window.removeEventListener("click", applySoon, true);
      window.removeEventListener("change", applySoon, true);
      window.removeEventListener("input", applySoon, true);
    };
  }, [pathname, language]);

  return null;
}
