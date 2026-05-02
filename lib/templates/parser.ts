import type {
  TemplateCondition,
  TemplateConditionOperator,
  TemplateFieldPart,
  TemplateFieldType,
  TemplatePart,
} from './types';

const FIELD_TYPES: TemplateFieldType[] = [
  'input',
  'textarea',
  'select',
  'radio',
  'multiselect',
  'checkbox',
  'date',
  'number',
];

const PARAMETER_KEYS = new Set([
  'label',
  'default',
  'placeholder',
  'required',
  'showif',
  'showifany',
  'showifnot',
  'showifincludes',
  'showifempty',
  'showifnotempty',
]);

function normalizeFieldId(value: string) {
  return value.trim().toLowerCase();
}

function splitOptionSource(value: string) {
  const delimiter = value.includes('|') ? '|' : ',';
  return value
    .split(delimiter)
    .map((option) => option.trim())
    .filter(Boolean);
}

function getParameterValue(config: string[], key: string): string | undefined {
  const normalizedKey = key.toLowerCase();
  const inline = config.find((item) => item.toLowerCase().startsWith(`${normalizedKey}:`));
  if (inline) return inline.slice(key.length + 1).trim();

  const index = config.findIndex((item) => item.toLowerCase() === normalizedKey);
  if (index >= 0) return config[index + 1]?.trim();

  return undefined;
}

function createCondition(
  parentId: string | undefined,
  operator: TemplateConditionOperator,
  value?: string,
): TemplateCondition | null {
  if (!parentId) return null;

  const normalizedParentId = normalizeFieldId(parentId);
  if (!normalizedParentId) return null;

  if (operator === 'empty' || operator === 'notEmpty') {
    return { parentId: normalizedParentId, operator };
  }

  if (!value) return null;

  const values = splitOptionSource(value).map((item) => item.toLowerCase());
  if (operator === 'in') {
    return { parentId: normalizedParentId, operator, values };
  }

  return {
    parentId: normalizedParentId,
    operator,
    value: value.trim().toLowerCase(),
    values: operator === 'includes' ? values : undefined,
  };
}

function parseConditionExpression(
  expression: string | undefined,
  operator: TemplateConditionOperator,
): TemplateCondition | null {
  if (!expression) return null;

  if (operator === 'empty' || operator === 'notEmpty') {
    return createCondition(expression.trim(), operator);
  }

  const [parentId, ...valueParts] = expression.split('=');
  const value = valueParts.join('=').trim();
  return createCondition(parentId, operator, value);
}

function parseShowIfCondition(config: string[]): TemplateCondition | null {
  const showIfAny = parseConditionExpression(getParameterValue(config, 'showIfAny'), 'in');
  if (showIfAny) return showIfAny;

  const showIfIncludes = parseConditionExpression(getParameterValue(config, 'showIfIncludes'), 'includes');
  if (showIfIncludes) return showIfIncludes;

  const showIfNot = parseConditionExpression(getParameterValue(config, 'showIfNot'), 'notEquals');
  if (showIfNot) return showIfNot;

  const showIfEmpty = parseConditionExpression(getParameterValue(config, 'showIfEmpty'), 'empty');
  if (showIfEmpty) return showIfEmpty;

  const showIfNotEmpty = parseConditionExpression(getParameterValue(config, 'showIfNotEmpty'), 'notEmpty');
  if (showIfNotEmpty) return showIfNotEmpty;

  return parseConditionExpression(getParameterValue(config, 'showIf'), 'equals');
}

function getTemplateFieldType(config: string[]): TemplateFieldPart['type'] {
  const explicitType = config
    .map((part) => part.toLowerCase())
    .find((part): part is TemplateFieldType => FIELD_TYPES.includes(part as TemplateFieldType));

  return explicitType || 'input';
}

function getTemplateFieldOptions(config: string[], fieldType: TemplateFieldType): string[] {
  if (!['select', 'radio', 'multiselect'].includes(fieldType)) return [];

  const typeIndex = config.findIndex((part) => part.toLowerCase() === fieldType);
  const afterType = typeIndex >= 0 ? config[typeIndex + 1] : undefined;

  if (afterType && !PARAMETER_KEYS.has(afterType.toLowerCase())) {
    return splitOptionSource(afterType);
  }

  const fallback = config.find((part) => {
    const lower = part.toLowerCase();
    return (
      (part.includes(',') || part.includes('|')) &&
      !Array.from(PARAMETER_KEYS).some((key) => lower.startsWith(`${key}:`) || lower === key)
    );
  });

  return fallback ? splitOptionSource(fallback) : [];
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
    const fieldType = getTemplateFieldType(config);

    parts.push({
      id: normalizeFieldId(id),
      displayName: id,
      label: getParameterValue(config, 'label'),
      type: fieldType,
      options: getTemplateFieldOptions(config, fieldType),
      condition: parseShowIfCondition(config),
      raw: rawConfig,
      defaultValue: getParameterValue(config, 'default'),
      placeholder: getParameterValue(config, 'placeholder'),
      required: config.some((item) => item.toLowerCase() === 'required'),
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
