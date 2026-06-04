export type ClinicalCountryCode = 'FI' | 'RU';

export type ClinicalCountryConfig = {
  code: ClinicalCountryCode;
  name: Record<'fi' | 'ru' | 'en', string>;
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
    },
    defaultClinicalOutputLanguage: 'ru',
    supportedClinicalOutputLanguages: ['ru'],
    defaultEvidenceStrictness: 'strict',
    defaultSourceIds: ['ru-minzdrav-clinical-recommendations', 'ru-grls', 'ru-rospotrebnadzor'],
  },
];

export function normalizeClinicalCountry(value: unknown): ClinicalCountryCode {
  if (value === 'FI' || value === 'RU') return value;
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
