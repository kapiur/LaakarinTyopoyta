export type PrivacyLocaleKey = 'fi' | 'ru' | 'en';

export type PrivacyLocalePack = {
  locale: PrivacyLocaleKey;
  personContextWords: string[];
  dateOfBirthLabels: string[];
  explicitNameLabels: string[];
  patientIdLabels: string[];
  notes?: string;
};
