import { isTemplateFieldVisible } from './conditions';
import { parseTemplate } from './parser';
import type { TemplateFieldPart, TemplateValues } from './types';

export function cleanupRenderedTemplateText(text: string) {
  return text
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\s+\./g, '.')
    .trim();
}

function formatDateValue(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;

  const [, year, month, day] = match;
  return `${Number(day)}.${Number(month)}.${year}`;
}

function formatMultiselectValue(value: string) {
  return value
    .split(/[,|]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .join(', ');
}

function getRenderedFieldValue(field: TemplateFieldPart, values: TemplateValues) {
  const value = values[field.id] || field.defaultValue || '';

  if (!value) return `[${field.label || field.displayName}]`;

  if (field.type === 'date') return formatDateValue(value);
  if (field.type === 'multiselect') return formatMultiselectValue(value);

  return value;
}

export function renderTemplate(content: string, values: TemplateValues) {
  const parsed = parseTemplate(content);
  let result = '';

  parsed.forEach((part) => {
    if (part.type === 'text') {
      result += part.value;
      return;
    }

    if (isTemplateFieldVisible(part.condition, values)) {
      result += getRenderedFieldValue(part, values);
    }
  });

  return cleanupRenderedTemplateText(result);
}
