export type PrivacyLocaleKey = 'fi' | 'ru' | 'en' | 'de';

export type PrivacyLocalePack = {
  locale: PrivacyLocaleKey;
  personContextWords: string[];
  dateOfBirthLabels: string[];
  explicitNameLabels: string[];
  patientIdLabels: string[];
  phoneLabels: string[];
  phoneValuePatterns: string[];
  notes?: string;
};
