export type CalculatorCategory =
  | 'analgesia'
  | 'pediatrics'
  | 'thrombosis'
  | 'cardiology'
  | 'general';

export type CalculatorStatus = 'active' | 'legacy';

export type CalculatorDefinition = {
  key: string;
  title: string;
  description: string;
  route: string;
  icon: 'Zap' | 'Baby' | 'ShieldAlert' | 'Wind' | 'Stethoscope' | 'Heart' | 'Activity' | 'Calculator';
  category: CalculatorCategory;
  status: CalculatorStatus;
  defaultEnabled: boolean;
  sortOrder: number;
  tags?: string[];
};

export const CALCULATOR_DEFINITIONS: CalculatorDefinition[] = [
  {
    key: 'pca',
    title: 'PCA',
    description: 'Patient-controlled analgesia dose planning with user drug library support.',
    route: '/calculators/pca',
    icon: 'Zap',
    category: 'analgesia',
    status: 'active',
    defaultEnabled: true,
    sortOrder: 10,
    tags: ['analgesia', 'infusion'],
  },
  {
    key: 'peds',
    title: 'PEDS',
    description: 'Pediatric dose calculator with user-specific indications and drug library defaults.',
    route: '/calculators/peds',
    icon: 'Baby',
    category: 'pediatrics',
    status: 'active',
    defaultEnabled: true,
    sortOrder: 20,
    tags: ['pediatrics', 'dose'],
  },
  {
    key: 'vte',
    title: 'VTE',
    description: 'DVT probability support using the current legacy scoring view.',
    route: '/calculators/legacy?tab=vte',
    icon: 'ShieldAlert',
    category: 'thrombosis',
    status: 'legacy',
    defaultEnabled: true,
    sortOrder: 30,
    tags: ['dvt', 'wells'],
  },
  {
    key: 'pe',
    title: 'PE',
    description: 'Pulmonary embolism probability support using the current legacy scoring view.',
    route: '/calculators/legacy?tab=pe',
    icon: 'Wind',
    category: 'thrombosis',
    status: 'legacy',
    defaultEnabled: true,
    sortOrder: 40,
    tags: ['embolism', 'wells'],
  },
  {
    key: 'cad',
    title: 'CAD risk',
    description: 'Pre-test coronary artery disease probability support.',
    route: '/calculators/legacy?tab=cad',
    icon: 'Stethoscope',
    category: 'cardiology',
    status: 'legacy',
    defaultEnabled: true,
    sortOrder: 50,
    tags: ['cardiology', 'angina'],
  },
  {
    key: 'chads',
    title: 'CHADS / HAS-BLED',
    description: 'Stroke and bleeding risk support in atrial fibrillation.',
    route: '/calculators/legacy?tab=chads',
    icon: 'Heart',
    category: 'cardiology',
    status: 'legacy',
    defaultEnabled: true,
    sortOrder: 60,
    tags: ['atrial fibrillation', 'risk'],
  },
  {
    key: 'bmi',
    title: 'BMI',
    description: 'Body mass index calculator.',
    route: '/calculators/bmi',
    icon: 'Activity',
    category: 'general',
    status: 'active',
    defaultEnabled: true,
    sortOrder: 70,
    tags: ['weight', 'screening'],
  },
  {
    key: 'gfr',
    title: 'GFR',
    description: 'Cockcroft-Gault style renal function estimate.',
    route: '/calculators/gfr',
    icon: 'Calculator',
    category: 'general',
    status: 'active',
    defaultEnabled: true,
    sortOrder: 80,
    tags: ['renal', 'creatinine'],
  },
];

export const CALCULATOR_KEYS = new Set(CALCULATOR_DEFINITIONS.map((calculator) => calculator.key));

export function isCalculatorKey(value: unknown): value is string {
  return typeof value === 'string' && CALCULATOR_KEYS.has(value);
}

export function getSortedCalculatorDefinitions() {
  return [...CALCULATOR_DEFINITIONS].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, 'fi'));
}
