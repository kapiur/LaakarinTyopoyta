export type TemplateFieldType =
  | 'input'
  | 'textarea'
  | 'select'
  | 'radio'
  | 'multiselect'
  | 'checkbox'
  | 'date'
  | 'number';

export type TemplateConditionOperator =
  | 'equals'
  | 'notEquals'
  | 'in'
  | 'includes'
  | 'empty'
  | 'notEmpty';

export type TemplateCondition = {
  parentId: string;
  operator: TemplateConditionOperator;
  value?: string;
  values?: string[];
};

export type TemplateTextPart = {
  type: 'text';
  value: string;
};

export type TemplateFieldPart = {
  type: TemplateFieldType;
  id: string;
  displayName: string;
  label?: string;
  options: string[];
  condition: TemplateCondition | null;
  raw: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
};

export type TemplatePart = TemplateTextPart | TemplateFieldPart;

export type TemplateValues = Record<string, string>;

export type TemplateCategory = {
  id: number;
  name: string;
  templates?: TemplateItem[];
};

export type TemplateItem = {
  id: number;
  title: string;
  content: string;
  author?: string | null;
  categoryId: number;
  userId?: number | null;
  createdAt?: string;
};

export type TemplateFormData = {
  id: number | null;
  title: string;
  content: string;
  categoryName: string;
  author: string;
};
