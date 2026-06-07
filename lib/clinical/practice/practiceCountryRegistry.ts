import type { UiLanguage } from '../../i18n/config';
import { getClinicalCountryConfig, normalizeClinicalCountry, type ClinicalCountryCode } from '../countries/countryRegistry';

export type PracticeCountryCode = ClinicalCountryCode;

export type PracticeCountryDefaults = {
  code: PracticeCountryCode;
  name: Record<'fi' | 'ru' | 'en', string>;
  defaultUiLanguage: UiLanguage;
  defaultClinicalCountry: ClinicalCountryCode;
  defaultClinicalOutputLanguage: string;
  defaultEvidenceStrictness: 'strict' | 'balanced' | 'local-aware';
};

export const DEFAULT_PRACTICE_COUNTRY: PracticeCountryCode = 'FI';

export const PRACTICE_COUNTRIES: PracticeCountryDefaults[] = [
  {
    code: 'FI',
    name: {
      fi: 'Suomi',
      ru: 'Финляндия',
      en: 'Finland',
    },
    defaultUiLanguage: 'fi',
    defaultClinicalCountry: 'FI',
    defaultClinicalOutputLanguage: 'fi',
    defaultEvidenceStrictness: 'strict',
  },
  {
    code: 'RU',
    name: {
      fi: 'Venäjä',
      ru: 'Россия',
      en: 'Russia',
    },
    defaultUiLanguage: 'ru',
    defaultClinicalCountry: 'RU',
    defaultClinicalOutputLanguage: 'ru',
    defaultEvidenceStrictness: 'strict',
  },
];

export function normalizePracticeCountry(value: unknown): PracticeCountryCode {
  return normalizeClinicalCountry(value);
}

export function getPracticeCountryDefaults(value: unknown): PracticeCountryDefaults {
  const code = normalizePracticeCountry(value);
  const configured = PRACTICE_COUNTRIES.find((country) => country.code === code);
  if (configured) return configured;

  const clinical = getClinicalCountryConfig(code);
  return {
    code: clinical.code,
    name: clinical.name,
    defaultUiLanguage: clinical.defaultClinicalOutputLanguage === 'ru' ? 'ru' : 'fi',
    defaultClinicalCountry: clinical.code,
    defaultClinicalOutputLanguage: clinical.defaultClinicalOutputLanguage,
    defaultEvidenceStrictness: clinical.defaultEvidenceStrictness,
  };
}
