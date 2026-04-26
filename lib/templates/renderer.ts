import { isTemplateFieldVisible } from './conditions';
import { parseTemplate } from './parser';
import type { TemplateValues } from './types';

export function cleanupRenderedTemplateText(text: string) {
  return text
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\s+\./g, '.')
    .trim();
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
      result += values[part.id] || `[${part.displayName}]`;
    }
  });

  return cleanupRenderedTemplateText(result);
}
