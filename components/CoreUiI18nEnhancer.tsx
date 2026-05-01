"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useI18n } from "../lib/useI18n";

type Replacements = Record<string, string>;

const text: Record<string, Replacements> = {
  fi: {},
  ru: {
    "Turva-asetukset": "Безопасность",
    "Sinun tulee päivittää kirjautumistunniste ennen palvelun jatkokäyttöä.": "Перед дальнейшим использованием сервиса необходимо обновить данные входа.",
    "Nykyinen tunniste": "Текущий пароль",
    "Uusi tunniste": "Новый пароль",
    "Vahvista uusi tunniste": "Подтвердите новый пароль",
    "Tallenna uusi tunniste": "Сохранить новый пароль",
    "Palaa etusivulle": "Вернуться на главную",
    "Lääkärin Työpöytä": "Рабочий стол врача",
    "KIRJAUDU": "ВОЙТИ",
    "KIRJAUTUDUTAAN...": "ВХОД...",
    "Väärä sähköposti tai salasana": "Неверная почта или пароль",
    "Palvelinvirhe. Yritä uudelleen.": "Ошибка сервера. Попробуйте ещё раз.",
  },
  en: {
    "Turva-asetukset": "Security settings",
    "Sinun tulee päivittää kirjautumistunniste ennen palvelun jatkokäyttöä.": "You must update your sign-in credential before continuing to use the service.",
    "Nykyinen tunniste": "Current password",
    "Uusi tunniste": "New password",
    "Vahvista uusi tunniste": "Confirm new password",
    "Tallenna uusi tunniste": "Save new password",
    "Palaa etusivulle": "Back to home",
    "Lääkärin Työpöytä": "Doctor's Workspace",
    "KIRJAUDU": "SIGN IN",
    "KIRJAUTUDUTAAN...": "SIGNING IN...",
    "Väärä sähköposti tai salasana": "Incorrect email or password",
    "Palvelinvirhe. Yritä uudelleen.": "Server error. Try again.",
  },
};

const placeholders: Record<string, Replacements> = {
  fi: {},
  ru: {
    "Sähköposti": "Электронная почта",
    "Salasana": "Пароль",
  },
  en: {
    "Sähköposti": "Email",
    "Salasana": "Password",
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
    if (["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "CODE"].includes(parent.tagName)) continue;
    nodes.push(node);
  }
  nodes.forEach((node) => {
    const value = normalize(node.nodeValue || "");
    const replacement = map[value];
    if (replacement) node.nodeValue = (node.nodeValue || "").replace(value, replacement);
  });
}

function replacePlaceholders(root: ParentNode, map: Replacements) {
  root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input[placeholder], textarea[placeholder]").forEach((field) => {
    const value = field.getAttribute("placeholder") || "";
    const replacement = map[value];
    if (replacement) field.setAttribute("placeholder", replacement);
  });
}

export default function CoreUiI18nEnhancer() {
  const pathname = usePathname();
  const { language } = useI18n();

  useEffect(() => {
    const applies = pathname === "/login" || pathname.startsWith("/profile/security");
    if (!applies) return;

    const apply = () => {
      const root = document.body;
      replaceText(root, reverseText.ru || {});
      replaceText(root, reverseText.en || {});
      replacePlaceholders(root, reversePlaceholders.ru || {});
      replacePlaceholders(root, reversePlaceholders.en || {});
      if (language === "fi") return;
      replaceText(root, text[language] || {});
      replacePlaceholders(root, placeholders[language] || {});
    };

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["placeholder"] });
    return () => observer.disconnect();
  }, [pathname, language]);

  return null;
}
