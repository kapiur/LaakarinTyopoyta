"use client";

import { ShieldCheck } from "lucide-react";
import { useI18n } from "../lib/useI18n";

type UiLang = "fi" | "ru" | "en";

type PrivacyInfo = {
  anonymized?: boolean;
  findingTypes?: string[];
} | null | undefined;

const labels: Record<string, Record<UiLang, string>> = {
  hetu: { fi: "henkilötunnus", ru: "HETU", en: "Finnish personal identity code" },
  email: { fi: "sähköposti", ru: "email", en: "email" },
  phone: { fi: "puhelinnumero", ru: "телефон", en: "phone number" },
  dateOfBirth: { fi: "syntymäaika", ru: "дата рождения", en: "date of birth" },
  patientId: { fi: "potilas-/asiakasnumero", ru: "номер пациента/клиента", en: "patient/client ID" },
  explicitName: { fi: "nimi", ru: "имя", en: "name" },
  address: { fi: "osoite", ru: "адрес", en: "address" },
};

const text = {
  fi: {
    title: "AI-tietosuoja",
    body: "Älä syötä potilaan tunnistetietoja. Palvelin poistaa tunnistetietoja automaattisesti ennen AI-käsittelyä.",
    done: "Tunnistetietoja poistettu ennen AI-käsittelyä",
    none: "Tunnistetietoja ei havaittu automaattisessa tarkistuksessa",
  },
  ru: {
    title: "Защита данных при AI-обработке",
    body: "Не вводите идентифицирующие данные пациента. Сервер автоматически удаляет найденные идентификаторы перед отправкой в AI.",
    done: "Перед AI-обработкой были удалены идентификаторы",
    none: "Автоматическая проверка не обнаружила идентификаторов",
  },
  en: {
    title: "AI privacy protection",
    body: "Do not enter patient identifiers. The server automatically removes detected identifiers before AI processing.",
    done: "Identifiers were removed before AI processing",
    none: "No identifiers were detected by the automatic check",
  },
};

function localizeFinding(type: string, language: UiLang) {
  return labels[type]?.[language] || type;
}

export default function PrivacyNotice({ privacy, compact = false }: { privacy?: PrivacyInfo; compact?: boolean }) {
  const { language } = useI18n();
  const lang = ((language as UiLang) || "fi") in text ? (language as UiLang) : "fi";
  const dict = text[lang];
  const findingTypes = Array.from(new Set(privacy?.findingTypes || []));
  const hasResult = Boolean(privacy);
  const anonymized = Boolean(privacy?.anonymized && findingTypes.length > 0);

  return (
    <div className={`rounded-2xl border px-4 py-3 text-xs font-bold ${anonymized ? "border-blue-100 bg-blue-50 text-blue-800" : "border-emerald-100 bg-emerald-50 text-emerald-800"}`}>
      <div className="flex items-start gap-2">
        <ShieldCheck size={compact ? 14 : 16} className="mt-0.5 shrink-0" />
        <div className="min-w-0 space-y-1">
          <div className="font-black uppercase tracking-wide">{dict.title}</div>
          <div className="leading-relaxed opacity-90">{dict.body}</div>
          {hasResult && (
            <div className="pt-1 text-[11px] leading-relaxed">
              {anonymized ? dict.done : dict.none}
              {anonymized && ": "}
              {anonymized && findingTypes.map((type) => localizeFinding(type, lang)).join(", ")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
