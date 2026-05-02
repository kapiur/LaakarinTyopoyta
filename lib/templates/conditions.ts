import type { TemplateCondition, TemplateValues } from './types';

function normalizeValue(value: string | undefined) {
  return (value || '').toLowerCase().trim();
}

function splitStoredValues(value: string | undefined) {
  return normalizeValue(value)
    .split(/[,|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function isTemplateFieldVisible(
  condition: TemplateCondition | null | undefined,
  values: TemplateValues,
) {
  if (!condition) return true;

  const currentValue = normalizeValue(values[condition.parentId]);

  switch (condition.operator) {
    case 'equals':
      return currentValue === normalizeValue(condition.value);
    case 'notEquals':
      return currentValue !== normalizeValue(condition.value);
    case 'in':
      return Boolean(condition.values?.includes(currentValue));
    case 'includes': {
      const selectedValues = splitStoredValues(currentValue);
      const expectedValues = condition.values?.length
        ? condition.values
        : condition.value
          ? [normalizeValue(condition.value)]
          : [];
      return expectedValues.some((expected) => selectedValues.includes(expected));
    }
    case 'empty':
      return !currentValue;
    case 'notEmpty':
      return Boolean(currentValue);
    default:
      return true;
  }
}
