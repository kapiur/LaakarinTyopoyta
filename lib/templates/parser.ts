import type { TemplateCondition, TemplateFieldPart, TemplatePart } from './types';

function parseShowIfCondition(config: string[]): TemplateCondition | null {
  const showIfIndex = config.findIndex((item) => item.toLowerCase() === 'showif');
  const inlineShowIfCond = config.find((item) => item.toLowerCase().startsWith('showif:'));

  const conditionSource = inlineShowIfCond
    ? inlineShowIfCond.replace(/showif:/i, '').trim()
    : showIfIndex >= 0
      ? config[showIfIndex + 1]?.trim()
      : '';

  if (!conditionSource) return null;

  const [parentId, value] = conditionSource.split('=');

  if (!parentId || !value) return null;

  return {
    parentId: parentId.trim().toLowerCase(),
    value: value.trim().toLowerCase(),
  };
}

function getTemplateFieldType(config: string[]): TemplateFieldPart['type'] {
  return config.some((part) => part.toLowerCase() === 'select') ? 'select' : 'input';
}

function getTemplateFieldOptions(config: string[]): string[] {
  const optionsSource = config.find((part) => part.includes(',') && !part.toLowerCase().startsWith('showif'));
  return optionsSource?.split(',').map((option) => option.trim()).filter(Boolean) || [];
}

function isTemplateFieldPart(part: TemplatePart): part is TemplateFieldPart {
  return part.type !== 'text';
}

export function parseTemplate(content: string): TemplatePart[] {
  const parts: TemplatePart[] = [];
  const regex = /{{(.*?)}}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: content.slice(lastIndex, match.index) });
    }

    const rawConfig = match[1];
    const config = rawConfig.split(':').map((part) => part.trim()).filter(Boolean);
    const id = config[0];

    parts.push({
      id: id.toLowerCase(),
      displayName: id,
      type: getTemplateFieldType(config),
      options: getTemplateFieldOptions(config),
      condition: parseShowIfCondition(config),
      raw: rawConfig,
    });

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < content.length) {
    parts.push({ type: 'text', value: content.slice(lastIndex) });
  }

  return parts;
}

export function getTemplateFields(content: string): TemplateFieldPart[] {
  return parseTemplate(content).filter(isTemplateFieldPart);
}
