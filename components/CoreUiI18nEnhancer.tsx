"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useI18n } from "../lib/useI18n";

type Replacements = Record<string, string>;

const text: Record<string, Replacements> = {
  fi: {},
  ru: {
    "Turva-asetukset": "Безопасность",
    "Käyttäjätilin ja ylläpidon asetukset.": "Настройки аккаунта и администрирования.",
    "Vaihda oma salasana ja tarkista kirjautumistilin perustiedot.": "Изменение пароля и основные данные аккаунта.",
    "Käyttäjähallinta": "Управление пользователями",
    "Luo käyttäjiä, poista käyttäjätilejä ja hallitse käyttöoikeuksia.": "Создание пользователей, удаление аккаунтов и управление правами.",
    "Ylläpitäjän huomio": "Заметка администратора",
    "Prompt Lab on poistettu sivuvalikosta. AI-työkalujen hallinta tapahtuu jatkossa uuden AI-työkalut-rakenteen kautta.": "Prompt Lab удалён из бокового меню. Управление AI-инструментами выполняется через новую структуру AI-инструментов.",
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
    "Suljettu käyttäjämalli: vain admin voi luoda uusia käyttäjiä.": "Закрытая модель пользователей: новых пользователей создаёт только администратор.",
    "Päivitä": "Обновить",
    "Luo uusi käyttäjä": "Создать нового пользователя",
    "Uusi käyttäjä saa aina roolin USER. Admin-roolia ei jaeta käyttöliittymästä.": "Новый пользователь всегда получает роль USER. Роль администратора через интерфейс не выдаётся.",
    "Luo käyttäjä": "Создать пользователя",
    "Vaadi salasanan vaihto ensimmäisen kirjautumisen jälkeen": "Требовать смену пароля после первого входа",
    "Käyttäjät": "Пользователи",
    "Käyttäjä": "Пользователь",
    "Rooli": "Роль",
    "Tila": "Статус",
    "Viimeisin kirjautuminen": "Последний вход",
    "Toiminnot": "Действия",
    "Ladataan käyttäjiä...": "Загрузка пользователей...",
    "Nimetön käyttäjä": "Пользователь без имени",
    "Luotu:": "Создан:",
    "Aktiivinen": "Активен",
    "Ei käytössä": "Отключён",
    "Salasanan vaihto vaaditaan": "Требуется смена пароля",
    "Käyttäjä aktiivinen": "Пользователь активен",
    "Vaadi salasanan vaihto": "Требовать смену пароля",
    "Muokkaa": "Редактировать",
    "Poista": "Удалить",
    "Tallenna": "Сохранить",
    "Peruuta": "Отмена",
    "Käyttäjä luotu onnistuneesti.": "Пользователь успешно создан.",
    "Käyttäjän tiedot päivitetty.": "Данные пользователя обновлены.",
    "Käyttäjä poistettu pysyvästi.": "Пользователь удалён окончательно.",
  },
  en: {
    "Turva-asetukset": "Security settings",
    "Käyttäjätilin ja ylläpidon asetukset.": "User account and administration settings.",
    "Vaihda oma salasana ja tarkista kirjautumistilin perustiedot.": "Change your password and review basic account details.",
    "Käyttäjähallinta": "User management",
    "Luo käyttäjiä, poista käyttäjätilejä ja hallitse käyttöoikeuksia.": "Create users, delete accounts and manage access rights.",
    "Ylläpitäjän huomio": "Administrator note",
    "Prompt Lab on poistettu sivuvalikosta. AI-työkalujen hallinta tapahtuu jatkossa uuden AI-työkalut-rakenteen kautta.": "Prompt Lab has been removed from the sidebar. AI tools are now managed through the new AI tools structure.",
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
    "Suljettu käyttäjämalli: vain admin voi luoda uusia käyttäjiä.": "Closed user model: only an administrator can create new users.",
    "Päivitä": "Refresh",
    "Luo uusi käyttäjä": "Create new user",
    "Uusi käyttäjä saa aina roolin USER. Admin-roolia ei jaeta käyttöliittymästä.": "A new user always receives the USER role. Admin role is not assigned through the interface.",
    "Luo käyttäjä": "Create user",
    "Vaadi salasanan vaihto ensimmäisen kirjautumisen jälkeen": "Require password change after first sign-in",
    "Käyttäjät": "Users",
    "Käyttäjä": "User",
    "Rooli": "Role",
    "Tila": "Status",
    "Viimeisin kirjautuminen": "Last sign-in",
    "Toiminnot": "Actions",
    "Ladataan käyttäjiä...": "Loading users...",
    "Nimetön käyttäjä": "Unnamed user",
    "Luotu:": "Created:",
    "Aktiivinen": "Active",
    "Ei käytössä": "Disabled",
    "Salasanan vaihto vaaditaan": "Password change required",
    "Käyttäjä aktiivinen": "User active",
    "Vaadi salasanan vaihto": "Require password change",
    "Muokkaa": "Edit",
    "Poista": "Delete",
    "Tallenna": "Save",
    "Peruuta": "Cancel",
    "Käyttäjä luotu onnistuneesti.": "User created successfully.",
    "Käyttäjän tiedot päivitetty.": "User details updated.",
    "Käyttäjä poistettu pysyvästi.": "User deleted permanently.",
  },
};

const placeholders: Record<string, Replacements> = {
  fi: {},
  ru: {
    "Sähköposti": "Электронная почта",
    "Salasana": "Пароль",
    "Nimi": "Имя",
    "Väliaikainen salasana": "Временный пароль",
  },
  en: {
    "Sähköposti": "Email",
    "Salasana": "Password",
    "Nimi": "Name",
    "Väliaikainen salasana": "Temporary password",
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
    const applies = pathname === "/login" || pathname.startsWith("/profile/security") || pathname.startsWith("/admin/users");
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
