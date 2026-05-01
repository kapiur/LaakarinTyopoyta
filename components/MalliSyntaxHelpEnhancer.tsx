"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useI18n } from "../lib/useI18n";

const copy = {
  fi: {
    titles: ["Syntaksin pikamuistio", "Syntaksiohje"],
    title: "Syntaksiohje",
    intro: "Malli koostuu tavallisesta tekstistä ja aaltosulkeissa olevista kentistä {{...}}. Alla yleisimmät käyttötavat.",
    examplesTitle: "Esimerkit",
    rulesTitle: "Säännöt",
    importantTitle: "Tärkeää",
    important: "Käyttöliittymän kieli voi vaihtua, mutta mallien tekninen syntaksi, kenttien arvot ja lopullinen lääketieteellinen teksti säilyvät suomeksi.",
    examples: [
      ["Yksirivinen kenttä", "{{oire}}", "Lyhyt vapaa tekstikenttä esimerkiksi oireelle tai statuksen osalle."],
      ["Monirivinen tekstikenttä", "{{statuskuvaus:textarea}}", "Pidempää vapaata tekstiä varten, esimerkiksi statuskuvaus tai suunnitelma."],
      ["Valintakenttä", "{{kipu:select:ei,kyllä}}", "Näyttää valmiit vaihtoehdot. Vaihtoehdot kirjoitetaan pilkulla eroteltuna."],
      ["Ehdollinen kenttä", "{{kipukuvaus:textarea:showIf:kipu=kyllä}}", "Kenttä näytetään vain silloin, kun kentässä kipu on valittu kyllä."],
    ],
    rules: [
      "tekninen kentän nimi kirjoitetaan latinalla",
      "välilyöntejä ei käytetä – käytä tarvittaessa alaviivaa _",
      "kenttätyypit ovat input, textarea ja select",
      "select-vaihtoehdot erotetaan pilkulla",
      "showIf näyttää kentän vain ehdon täyttyessä",
      "arvot kuten ei/kyllä jätetään suomeksi",
    ],
  },
  ru: {
    titles: ["Краткая памятка по синтаксису", "Синтаксис шаблонов"],
    title: "Синтаксис шаблонов",
    intro: "Шаблон состоит из обычного текста и полей в фигурных скобках {{...}}. Ниже — самые частые варианты использования.",
    examplesTitle: "Примеры",
    rulesTitle: "Правила",
    importantTitle: "Важно",
    important: "Язык интерфейса может меняться, но технический синтаксис шаблонов, значения полей и итоговый медицинский текст остаются на финском языке.",
    examples: [
      ["Однострочное поле", "{{oire}}", "Короткое свободное текстовое поле, например для симптома или части статуса."],
      ["Многострочное текстовое поле", "{{statuskuvaus:textarea}}", "Для более длинного свободного текста, например statuskuvaus или suunnitelma."],
      ["Поле выбора", "{{kipu:select:ei,kyllä}}", "Показывает готовые варианты выбора. Варианты пишутся через запятую."],
      ["Условное поле", "{{kipukuvaus:textarea:showIf:kipu=kyllä}}", "Поле показывается только тогда, когда в поле kipu выбрано значение kyllä."],
    ],
    rules: [
      "техническое имя поля пишется латиницей",
      "пробелы не используются — при необходимости используйте _",
      "типы полей: input, textarea и select",
      "варианты select указываются через запятую",
      "showIf показывает поле только при выполнении условия",
      "значения вроде ei/kyllä оставляются на финском",
    ],
  },
  en: {
    titles: ["Syntax quick reference", "Template syntax"],
    title: "Template syntax",
    intro: "A template consists of normal text and fields inside curly braces {{...}}. Below are the most common usage patterns.",
    examplesTitle: "Examples",
    rulesTitle: "Rules",
    importantTitle: "Important",
    important: "The interface language can change, but template syntax, field values and final medical text remain in Finnish.",
    examples: [
      ["Single-line field", "{{oire}}", "A short free-text field, for example for a symptom or part of the status."],
      ["Multi-line text field", "{{statuskuvaus:textarea}}", "For longer free text, for example statuskuvaus or suunnitelma."],
      ["Selection field", "{{kipu:select:ei,kyllä}}", "Shows predefined options. Options are written separated by commas."],
      ["Conditional field", "{{kipukuvaus:textarea:showIf:kipu=kyllä}}", "The field is shown only when the field kipu has the value kyllä."],
    ],
    rules: [
      "technical field names are written with Latin characters",
      "do not use spaces — use _ when needed",
      "field types are input, textarea and select",
      "select options are separated with commas",
      "showIf displays a field only when the condition is met",
      "values such as ei/kyllä remain in Finnish",
    ],
  },
} as const;

function makeEl<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text) el.textContent = text;
  return el;
}

export default function MalliSyntaxHelpEnhancer() {
  const pathname = usePathname();
  const { language } = useI18n();

  useEffect(() => {
    if (!pathname.startsWith("/malli")) return;
    const c = copy[language] ?? copy.fi;

    const enhance = () => {
      const headings = Array.from(document.querySelectorAll("h2"));
      const knownTitles: readonly string[] = c.titles;
      const title = headings.find((h) => knownTitles.includes((h.textContent || "").trim()));
      if (!title) return;

      const dialog = title.closest(".bg-white.rounded-\\[2rem\\]") as HTMLElement | null;
      if (!dialog || dialog.dataset.syntaxHelpEnhanced === language) return;

      dialog.dataset.syntaxHelpEnhanced = language;
      dialog.className = "bg-white rounded-[2rem] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-7 space-y-6";

      title.textContent = c.title;
      const children = Array.from(dialog.children);
      children.slice(1).forEach((child) => child.remove());

      const intro = makeEl("p", "text-sm font-semibold text-slate-500 leading-relaxed max-w-2xl", c.intro);
      dialog.appendChild(intro);

      const examplesSection = makeEl("section", "space-y-3");
      examplesSection.appendChild(makeEl("h3", "text-[10px] font-black uppercase tracking-widest text-blue-600", c.examplesTitle));
      const examplesGrid = makeEl("div", "grid gap-3");
      c.examples.forEach(([label, code, description]) => {
        const card = makeEl("div", "rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-3");
        const textWrap = makeEl("div");
        textWrap.appendChild(makeEl("div", "text-sm font-black text-slate-800", label));
        textWrap.appendChild(makeEl("p", "mt-1 text-xs font-semibold text-slate-500 leading-relaxed", description));
        card.appendChild(textWrap);
        card.appendChild(makeEl("code", "block rounded-xl bg-slate-950 p-4 font-mono text-sm font-bold text-white overflow-x-auto", code));
        examplesGrid.appendChild(card);
      });
      examplesSection.appendChild(examplesGrid);
      dialog.appendChild(examplesSection);

      const rulesSection = makeEl("section", "rounded-2xl border border-blue-100 bg-blue-50/60 p-5 space-y-3");
      rulesSection.appendChild(makeEl("h3", "text-[10px] font-black uppercase tracking-widest text-blue-700", c.rulesTitle));
      const list = makeEl("ul", "grid gap-2 text-sm font-semibold text-slate-700");
      c.rules.forEach((rule) => {
        const li = makeEl("li", "flex gap-2");
        li.appendChild(makeEl("span", "text-blue-600", "•"));
        li.appendChild(makeEl("span", "", rule));
        list.appendChild(li);
      });
      rulesSection.appendChild(list);
      dialog.appendChild(rulesSection);

      const note = makeEl("section", "rounded-2xl border border-amber-100 bg-amber-50 p-5");
      note.appendChild(makeEl("h3", "text-[10px] font-black uppercase tracking-widest text-amber-700", c.importantTitle));
      note.appendChild(makeEl("p", "mt-2 text-sm font-semibold text-amber-900/80 leading-relaxed", c.important));
      dialog.appendChild(note);
    };

    enhance();
    const observer = new MutationObserver(enhance);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname, language]);

  return null;
}
