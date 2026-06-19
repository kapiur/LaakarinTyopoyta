import type { ClinicalCountryCode } from "../countries/countryRegistry";

export type ClinicalSourceType =
  | 'national_guideline'
  | 'medical_reference'
  | 'public_health_authority'
  | 'local_instruction'
  | 'hospital_instruction'
  | 'drug_database'
  | 'custom_url'
  | 'uploaded_document';

export type ClinicalSourceTrustLevel =
  | 'primary_guideline'
  | 'official_reference'
  | 'authority_instruction'
  | 'local_instruction'
  | 'supplementary'
  | 'not_for_clinical_recommendations';

export type ClinicalSourceSeed = {
  id: string;
  country: ClinicalCountryCode;
  name: string;
  description?: string;
  sourceType: ClinicalSourceType;
  trustLevel: ClinicalSourceTrustLevel;
  priority: number;
  baseUrl?: string;
  allowedDomains: string[];
  language: string[];
  isOfficial: boolean;
  specialty?: string;
};

export const CLINICAL_SOURCE_SEEDS: ClinicalSourceSeed[] = [
  {
    id: 'fi-kaypa-hoito',
    country: 'FI',
    name: 'Käypä hoito',
    description: 'Finnish national evidence-based Current Care Guidelines.',
    sourceType: 'national_guideline',
    trustLevel: 'primary_guideline',
    priority: 1,
    baseUrl: 'https://www.kaypahoito.fi',
    allowedDomains: ['kaypahoito.fi', 'www.kaypahoito.fi'],
    language: ['fi', 'sv', 'en'],
    isOfficial: true,
  },
  {
    id: 'fi-terveyskirjasto',
    country: 'FI',
    name: 'Terveyskirjasto / Lääkärikirja Duodecim',
    description: 'Finnish medical reference and patient information source.',
    sourceType: 'medical_reference',
    trustLevel: 'official_reference',
    priority: 2,
    baseUrl: 'https://www.terveyskirjasto.fi',
    allowedDomains: ['terveyskirjasto.fi', 'www.terveyskirjasto.fi'],
    language: ['fi'],
    isOfficial: true,
  },
  {
    id: 'fi-thl',
    country: 'FI',
    name: 'THL',
    description: 'Finnish Institute for Health and Welfare. Public health, infections, vaccination and screening guidance.',
    sourceType: 'public_health_authority',
    trustLevel: 'authority_instruction',
    priority: 3,
    baseUrl: 'https://thl.fi',
    allowedDomains: ['thl.fi', 'www.thl.fi'],
    language: ['fi', 'sv', 'en'],
    isOfficial: true,
  },
  {
    id: 'fi-hus',
    country: 'FI',
    name: 'HUS',
    description: 'Regional hospital district instructions. Use as local or regional context, not as national guideline replacement.',
    sourceType: 'hospital_instruction',
    trustLevel: 'local_instruction',
    priority: 20,
    baseUrl: 'https://www.hus.fi',
    allowedDomains: ['hus.fi', 'www.hus.fi'],
    language: ['fi', 'sv', 'en'],
    isOfficial: true,
  },
  {
    id: 'fi-keusote',
    country: 'FI',
    name: 'Keusote',
    description: 'Local wellbeing services county instructions. Use as local workflow context.',
    sourceType: 'local_instruction',
    trustLevel: 'local_instruction',
    priority: 30,
    baseUrl: 'https://www.keusote.fi',
    allowedDomains: ['keusote.fi', 'www.keusote.fi'],
    language: ['fi'],
    isOfficial: true,
  },
  {
    id: 'ru-minzdrav-clinical-recommendations',
    country: 'RU',
    name: 'Минздрав РФ — рубрикатор клинических рекомендаций',
    description: 'Russian national clinical recommendations registry.',
    sourceType: 'national_guideline',
    trustLevel: 'primary_guideline',
    priority: 1,
    baseUrl: 'https://cr.minzdrav.gov.ru',
    allowedDomains: ['cr.minzdrav.gov.ru', 'minzdrav.gov.ru'],
    language: ['ru'],
    isOfficial: true,
  },
  {
    id: 'ru-grls',
    country: 'RU',
    name: 'Государственный реестр лекарственных средств',
    description: 'Official Russian drug registry and medication instructions.',
    sourceType: 'drug_database',
    trustLevel: 'official_reference',
    priority: 2,
    baseUrl: 'https://grls.rosminzdrav.ru',
    allowedDomains: ['grls.rosminzdrav.ru', 'rosminzdrav.ru', 'minzdrav.gov.ru'],
    language: ['ru'],
    isOfficial: true,
  },
  {
    id: 'ru-rospotrebnadzor',
    country: 'RU',
    name: 'Роспотребнадзор',
    description: 'Russian public health and sanitary-epidemiological authority.',
    sourceType: 'public_health_authority',
    trustLevel: 'authority_instruction',
    priority: 3,
    baseUrl: 'https://www.rospotrebnadzor.ru',
    allowedDomains: ['rospotrebnadzor.ru', 'www.rospotrebnadzor.ru', 'rospotrebnadzor.gov.ru', 'pravo.gov.ru'],
    language: ['ru'],
    isOfficial: true,
  },
  {
    id: 'de-awmf-guidelines',
    country: 'DE',
    name: 'AWMF Leitlinienregister',
    description: 'Official German guideline register maintained by the Association of the Scientific Medical Societies in Germany (AWMF).',
    sourceType: 'national_guideline',
    trustLevel: 'primary_guideline',
    priority: 1,
    baseUrl: 'https://register.awmf.org/de/start',
    allowedDomains: ['register.awmf.org', 'awmf.org', 'www.awmf.org'],
    language: ['de'],
    isOfficial: true,
  },
  {
    id: 'de-bfarm-pharmnet',
    country: 'DE',
    name: 'BfArM / PharmNet.Bund',
    description: 'Official German medicinal product and regulatory reference information from BfArM and PharmNet.Bund.',
    sourceType: 'drug_database',
    trustLevel: 'official_reference',
    priority: 2,
    baseUrl: 'https://www.bfarm.de/EN/Medicinal-products/_node.html',
    allowedDomains: ['bfarm.de', 'www.bfarm.de', 'pharmnet-bund.de', 'www.pharmnet-bund.de'],
    language: ['de', 'en'],
    isOfficial: true,
  },
  {
    id: 'de-rki',
    country: 'DE',
    name: 'Robert Koch-Institut (RKI)',
    description: 'German federal public health authority for infection control, epidemiology, prevention, and population health guidance.',
    sourceType: 'public_health_authority',
    trustLevel: 'authority_instruction',
    priority: 3,
    baseUrl: 'https://www.rki.de',
    allowedDomains: ['rki.de', 'www.rki.de'],
    language: ['de', 'en'],
    isOfficial: true,
  },
];

export function getDefaultClinicalSources(country: ClinicalCountryCode) {
  return CLINICAL_SOURCE_SEEDS.filter((source) => source.country === country && source.isOfficial);
}
