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
    body: "Vältä potilaan tunnistetietojen syöttämistä aina kun mahdollista. Palvelin tekee automaattisen tarkistuksen ja yrittää poistaa tai estää tunnistetietoja ennen AI-käsittelyä.",
    done: "Automaattinen tarkistus löysi ja käsitteli tunnistetietoja ennen AI-käsittelyä",
    none: "Automaattinen tarkistus ei havainnut tunnettuja tunnistetietoja",
    caution: "Automaattinen tarkistus ei takaa, että kaikki tunnistetiedot havaitaan. Tee aina myös oma ammatillinen arvio ennen lähettämistä tai tallentamista.",
  },
  ru: {
    title: "Защита данных при AI-обработке",
    body: "По возможности не вводите идентифицирующие данные пациента. Сервер выполняет автоматическую проверку и пытается удалить или заблокировать идентификаторы перед AI-обработкой.",
    done: "Автоматическая проверка обнаружила и обработала идентификаторы перед AI-обработкой",
    none: "Автоматическая проверка не обнаружила известных идентификаторов",
    caution: "Автоматическая проверка не гарантирует, что будут найдены все идентификаторы. Перед отправкой или сохранением все равно нужен ваш ручной контроль.",
  },
  en: {
    title: "AI privacy protection",
    body: "Avoid entering patient identifiers whenever possible. The server runs an automatic check and tries to remove or block identifiers before AI processing.",
    done: "The automatic check detected and handled identifiers before AI processing",
    none: "The automatic check did not detect known identifiers",
    caution: "The automatic check does not guarantee that every identifier will be found. Manual review is still required before sending or saving text.",
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
  const wrapperClassName = anonymized
    ? "border-amber-100 bg-amber-50 text-amber-900"
    : "border-slate-200 bg-slate-50 text-slate-800";
  const cautionClassName = anonymized ? "text-amber-800/90" : "text-slate-500";

  return (
    <div className={`rounded-2xl border px-4 py-3 text-xs font-bold ${wrapperClassName}`}>
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
          <div className={`pt-1 text-[11px] leading-relaxed font-semibold ${cautionClassName}`}>
            {dict.caution}
          </div>
        </div>
      </div>
    </div>
  );
}
