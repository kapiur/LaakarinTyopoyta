export type CalculatorCategory =
  | 'analgesia'
  | 'pediatrics'
  | 'thrombosis'
  | 'cardiology'
  | 'general';

export type CalculatorDefinition = {
  key: string;
  title: string;
  description: string;
  route: string;
  icon: 'Zap' | 'Baby' | 'ShieldAlert' | 'Wind' | 'Stethoscope' | 'Heart' | 'Activity' | 'Calculator';
  category: CalculatorCategory;
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
    defaultEnabled: true,
    sortOrder: 20,
    tags: ['pediatrics', 'dose'],
  },
  {
    key: 'vte',
    title: 'VTE',
    description: 'Deep vein thrombosis probability support with a standalone Wells-style calculator.',
    route: '/calculators/vte',
    icon: 'ShieldAlert',
    category: 'thrombosis',
    defaultEnabled: true,
    sortOrder: 30,
    tags: ['dvt', 'wells'],
  },
  {
    key: 'pe',
    title: 'PE',
    description: 'Pulmonary embolism probability support with a standalone Wells-style calculator.',
    route: '/calculators/pe',
    icon: 'Wind',
    category: 'thrombosis',
    defaultEnabled: true,
    sortOrder: 40,
    tags: ['embolism', 'wells'],
  },
  {
    key: 'cad',
    title: 'CAD risk',
    description: 'Pre-test coronary artery disease probability support in a standalone structured view.',
    route: '/calculators/cad',
    icon: 'Stethoscope',
    category: 'cardiology',
    defaultEnabled: true,
    sortOrder: 50,
    tags: ['cardiology', 'angina'],
  },
  {
    key: 'chads',
    title: 'CHADS / HAS-BLED',
    description: 'Atrial fibrillation stroke and bleeding risk support in a standalone dual-score view.',
    route: '/calculators/chads',
    icon: 'Heart',
    category: 'cardiology',
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
    defaultEnabled: true,
    sortOrder: 80,
    tags: ['renal', 'creatinine'],
  },
];

export const CALCULATOR_KEYS = new Set(CALCULATOR_DEFINITIONS.map((calculator) => calculator.key));
export const CALCULATOR_DEFINITION_MAP = new Map(CALCULATOR_DEFINITIONS.map((calculator) => [calculator.key, calculator]));

export function isCalculatorKey(value: unknown): value is string {
  return typeof value === 'string' && CALCULATOR_KEYS.has(value);
}

export function getCalculatorDefinition(key: string) {
  return CALCULATOR_DEFINITION_MAP.get(key);
}

export function getSortedCalculatorDefinitions() {
  return [...CALCULATOR_DEFINITIONS].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, 'fi'));
}
