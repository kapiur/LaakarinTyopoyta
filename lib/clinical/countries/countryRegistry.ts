import type { LocalizedText } from "../../i18n/config";

export type ClinicalCountryCode = 'FI' | 'RU' | 'DE';

export type ClinicalCountryConfig = {
  code: ClinicalCountryCode;
  name: LocalizedText;
  defaultClinicalOutputLanguage: string;
  supportedClinicalOutputLanguages: string[];
  defaultEvidenceStrictness: 'strict' | 'balanced' | 'local-aware';
  defaultSourceIds: string[];
};

export const DEFAULT_CLINICAL_COUNTRY: ClinicalCountryCode = 'FI';

export const CLINICAL_COUNTRIES: ClinicalCountryConfig[] = [
  {
    code: 'FI',
    name: {
      fi: 'Suomi',
      ru: 'Финляндия',
      en: 'Finland',
      de: 'Finnland',
    },
    defaultClinicalOutputLanguage: 'fi',
    supportedClinicalOutputLanguages: ['fi', 'sv'],
    defaultEvidenceStrictness: 'strict',
    defaultSourceIds: ['fi-kaypa-hoito', 'fi-terveyskirjasto', 'fi-thl'],
  },
  {
    code: 'RU',
    name: {
      fi: 'Venäjä',
      ru: 'Россия',
      en: 'Russia',
      de: 'Russland',
    },
    defaultClinicalOutputLanguage: 'ru',
    supportedClinicalOutputLanguages: ['ru'],
    defaultEvidenceStrictness: 'strict',
    defaultSourceIds: ['ru-minzdrav-clinical-recommendations', 'ru-grls', 'ru-rospotrebnadzor'],
  },
  {
    code: 'DE',
    name: {
      fi: 'Saksa',
      ru: 'Германия',
      en: 'Germany',
      de: 'Deutschland',
    },
    defaultClinicalOutputLanguage: 'de',
    supportedClinicalOutputLanguages: ['de'],
    defaultEvidenceStrictness: 'strict',
    defaultSourceIds: ['de-awmf-guidelines', 'de-bfarm-pharmnet', 'de-rki'],
  },
];

export function normalizeClinicalCountry(value: unknown): ClinicalCountryCode {
  if (value === 'FI' || value === 'RU' || value === 'DE') return value;
  return DEFAULT_CLINICAL_COUNTRY;
}

export function getClinicalCountryConfig(value: unknown): ClinicalCountryConfig {
  const code = normalizeClinicalCountry(value);
  return CLINICAL_COUNTRIES.find((country) => country.code === code) ?? CLINICAL_COUNTRIES[0];
}

export function normalizeClinicalOutputLanguage(countryValue: unknown, languageValue: unknown): string {
  const country = getClinicalCountryConfig(countryValue);
  if (typeof languageValue === 'string' && country.supportedClinicalOutputLanguages.includes(languageValue)) return languageValue;
  return country.defaultClinicalOutputLanguage;
}

export function normalizeEvidenceStrictness(value: unknown): ClinicalCountryConfig['defaultEvidenceStrictness'] {
  if (value === 'strict' || value === 'balanced' || value === 'local-aware') return value;
  return 'strict';
}
