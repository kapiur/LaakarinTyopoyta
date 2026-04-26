import type { TemplateCondition, TemplateFieldPart, TemplatePart } from './types';

function parseShowIfCondition(config: string[]): TemplateCondition | null {
  const showIfCond = config.find((item) => item.toLowerCase().startsWith('showif:'));
  if (!showIfCond) return null;

  const cleanCond = showIfCond.replace(/showif:/i, '').trim();
  const [parentId, value] = cleanCond.split('=');

  if (!parentId || !value) return null;

  return {
    parentId: parentId.trim().toLowerCase(),
    value: value.trim().toLowerCase(),
  };
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
    const config = rawConfig.split(':').map((part) => part.trim());
    const id = config[0];

    parts.push({
      id: id.toLowerCase(),
      displayName: id,
      type: config.includes('select') ? 'select' : 'input',
      options: config.find((part) => part.includes(','))?.split(',').map((option) => option.trim()) || [],
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
