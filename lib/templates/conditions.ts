import type { TemplateCondition, TemplateValues } from './types';

export function isTemplateFieldVisible(
  condition: TemplateCondition | null | undefined,
  values: TemplateValues,
) {
  if (!condition) return true;

  const currentValue = (values[condition.parentId] || '').toLowerCase().trim();
  return currentValue === condition.value;
}
