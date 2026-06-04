import { getTemplateFields } from './parser';
import type { TemplateFieldPart, TemplateFieldType } from './types';

export type TemplateValidationSeverity = 'error' | 'warning';

export type TemplateValidationIssue = {
  severity: TemplateValidationSeverity;
  fieldId?: string;
  message: string;
  code?: string;
  position?: number;
};

export type TemplateValidationResult = {
  ok: boolean;
  errors: TemplateValidationIssue[];
  warnings: TemplateValidationIssue[];
  fields: TemplateFieldPart[];
  summary: {
    fieldCount: number;
    errorCount: number;
    warningCount: number;
  };
};

const FIELD_NAME_REGEX = /^[a-z0-9_]+$/;
const CYRILLIC_REGEX = /[\u0400-\u04FF]/;
const FIELD_TYPES_WITH_OPTIONS: TemplateFieldType[] = ['select', 'radio', 'multiselect'];
const MAX_FIELD_ID_LENGTH = 48;

function addIssue(
  issues: TemplateValidationIssue[],
  severity: TemplateValidationSeverity,
  message: string,
  fieldId?: string,
  code?: string,
  position?: number,
) {
  issues.push({ severity, message, fieldId, code, position });
}

function findRawSyntaxIssues(content: string, issues: TemplateValidationIssue[]) {
  const openingMatches = content.match(/{{/g) || [];
  const closingMatches = content.match(/}}/g) || [];

  if (openingMatches.length !== closingMatches.length) {
    addIssue(
      issues,
      'error',
      'Template has unmatched {{ or }} markers.',
      undefined,
      'unmatched_markers',
    );
  }

  const emptyRegex = /{{\s*}}/g;
  let emptyMatch: RegExpExecArray | null;
  while ((emptyMatch = emptyRegex.exec(content)) !== null) {
    addIssue(
      issues,
      'error',
      'Template contains an empty field marker {{}}.',
      undefined,
      'empty_field_marker',
      emptyMatch.index,
    );
  }

  const nestedRegex = /{{[^{}]*{{|}}[^{}]*}}/g;
  let nestedMatch: RegExpExecArray | null;
  while ((nestedMatch = nestedRegex.exec(content)) !== null) {
    addIssue(
      issues,
      'error',
      'Template appears to contain nested or overlapping field markers.',
      undefined,
      'nested_markers',
      nestedMatch.index,
    );
  }
}

function validateRawFieldConfigs(content: string, issues: TemplateValidationIssue[]) {
  const regex = /{{(.*?)}}/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const rawConfig = match[1];
    const config = rawConfig.split(':').map((part) => part.trim());
    const id = config[0] || '';
    const lowerConfig = config.map((part) => part.toLowerCase());

    if (!id.trim()) {
      addIssue(issues, 'error', 'Field has an empty technical name.', undefined, 'empty_field_name', match.index);
    }

    const showIfLike = lowerConfig.filter((part) => part === 'showif' || part.startsWith('showif:'));
    if (showIfLike.length > 0) {
      const inline = config.find((part) => part.toLowerCase().startsWith('showif:'));
      const showIfIndex = lowerConfig.findIndex((part) => part === 'showif');
      const expression = inline ? inline.slice('showIf:'.length).trim() : showIfIndex >= 0 ? config[showIfIndex + 1]?.trim() : '';
      if (!expression || !expression.includes('=')) {
        addIssue(
          issues,
          'error',
          `Field "${id || '?'}" has invalid showIf syntax. Use showIf:parent=value.`,
          id.toLowerCase(),
          'invalid_showif',
          match.index,
        );
      }
    }

    const conditionKeys = ['showifany', 'showifnot', 'showifincludes'];
    conditionKeys.forEach((key) => {
      const inline = config.find((part) => part.toLowerCase().startsWith(`${key}:`));
      const keyIndex = lowerConfig.findIndex((part) => part === key);
      const expression = inline ? inline.slice(key.length + 1).trim() : keyIndex >= 0 ? config[keyIndex + 1]?.trim() : '';
      if ((inline || keyIndex >= 0) && (!expression || !expression.includes('='))) {
        addIssue(
          issues,
          'error',
          `Field "${id || '?'}" has invalid ${key} syntax. Use ${key}:parent=value.`,
          id.toLowerCase(),
          `invalid_${key}`,
          match.index,
        );
      }
    });
  }
}

function validateFieldName(field: TemplateFieldPart, issues: TemplateValidationIssue[]) {
  if (!field.id) {
    addIssue(issues, 'error', 'Field has an empty technical name.', field.id, 'empty_field_name');
    return;
  }

  if (CYRILLIC_REGEX.test(field.displayName) || CYRILLIC_REGEX.test(field.id)) {
    addIssue(
      issues,
      'error',
      `Field "${field.displayName}" contains Cyrillic characters in the technical field name. Use Latin technical names only.`,
      field.id,
      'cyrillic_field_name',
    );
  }

  if (!FIELD_NAME_REGEX.test(field.id)) {
    addIssue(
      issues,
      'error',
      `Field "${field.displayName}" has an invalid technical name. Use lowercase Latin letters, numbers and underscore only.`,
      field.id,
      'invalid_field_name',
    );
  }

  if (field.id.length > MAX_FIELD_ID_LENGTH) {
    addIssue(
      issues,
      'warning',
      `Field "${field.displayName}" has a long technical name (${field.id.length} characters). Prefer max ${MAX_FIELD_ID_LENGTH}.`,
      field.id,
      'long_field_name',
    );
  }

  if (field.id.includes('-')) {
    addIssue(
      issues,
      'warning',
      `Field "${field.displayName}" contains a dash. Prefer underscore for technical field names.`,
      field.id,
      'dash_in_field_name',
    );
  }
}

function validateOptions(field: TemplateFieldPart, issues: TemplateValidationIssue[]) {
  if (!FIELD_TYPES_WITH_OPTIONS.includes(field.type)) return;

  if (field.options.length === 0) {
    addIssue(
      issues,
      'error',
      `Field "${field.id}" is ${field.type} but has no options.`,
      field.id,
      'missing_options',
    );
    return;
  }

  const emptyOptions = field.options.filter((option) => option.trim().length === 0);
  if (emptyOptions.length > 0) {
    addIssue(
      issues,
      'error',
      `Field "${field.id}" contains empty options.`,
      field.id,
      'empty_options',
    );
  }

  const normalizedOptions = field.options.map((option) => option.trim().toLowerCase());
  const duplicateOptions = normalizedOptions.filter((option, index) => normalizedOptions.indexOf(option) !== index);
  if (duplicateOptions.length > 0) {
    addIssue(
      issues,
      'warning',
      `Field "${field.id}" has duplicate options: ${Array.from(new Set(duplicateOptions)).join(', ')}.`,
      field.id,
      'duplicate_options',
    );
  }
}

function validateDuplicateFields(fields: TemplateFieldPart[], issues: TemplateValidationIssue[]) {
  const byId = new Map<string, TemplateFieldPart[]>();

  fields.forEach((field) => {
    byId.set(field.id, [...(byId.get(field.id) || []), field]);
  });

  byId.forEach((items, fieldId) => {
    if (items.length <= 1) return;

    const signatures = new Set(
      items.map((field) => JSON.stringify({
        type: field.type,
        options: field.options,
        condition: field.condition,
      })),
    );

    if (signatures.size > 1) {
      addIssue(
        issues,
        'warning',
        `Field "${fieldId}" is defined multiple times with different configuration.`,
        fieldId,
        'duplicate_field_different_config',
      );
    } else {
      addIssue(
        issues,
        'warning',
        `Field "${fieldId}" is repeated. This is allowed, but verify it is intentional.`,
        fieldId,
        'duplicate_field',
      );
    }
  });
}

function validateConditions(fields: TemplateFieldPart[], issues: TemplateValidationIssue[]) {
  const fieldIds = new Set(fields.map((field) => field.id));
  const fieldById = new Map(fields.map((field) => [field.id, field]));

  fields.forEach((field) => {
    const condition = field.condition;
    if (!condition) return;

    if (!fieldIds.has(condition.parentId)) {
      addIssue(
        issues,
        'error',
        `Field "${field.id}" has a condition referring to missing field "${condition.parentId}".`,
        field.id,
        'missing_showif_parent',
      );
      return;
    }

    const parent = fieldById.get(condition.parentId);
    if (condition.operator === 'includes' && parent && parent.type !== 'multiselect') {
      addIssue(
        issues,
        'warning',
        `Field "${field.id}" uses showIfIncludes with "${condition.parentId}", but the parent field is not multiselect.`,
        field.id,
        'showifincludes_non_multiselect_parent',
      );
    }

    if (condition.operator === 'in' && (!condition.values || condition.values.length < 2)) {
      addIssue(
        issues,
        'warning',
        `Field "${field.id}" uses showIfAny with less than two values. showIf may be clearer.`,
        field.id,
        'showifany_single_value',
      );
    }

    if (['equals', 'notEquals', 'includes', 'in'].includes(condition.operator) && parent && FIELD_TYPES_WITH_OPTIONS.includes(parent.type)) {
      const referencedValues = condition.operator === 'in' || condition.operator === 'includes'
        ? condition.values || []
        : condition.value ? [condition.value] : [];
      const parentOptions = parent.options.map((option) => option.toLowerCase());
      const missingValues = referencedValues.filter((value) => !parentOptions.includes(value.toLowerCase()));
      if (missingValues.length > 0) {
        addIssue(
          issues,
          'warning',
          `Field "${field.id}" condition references value(s) not present in parent "${parent.id}" options: ${missingValues.join(', ')}.`,
          field.id,
          'showif_value_not_in_parent_options',
        );
      }
    }
  });
}

function validateDefaults(fields: TemplateFieldPart[], issues: TemplateValidationIssue[]) {
  fields.forEach((field) => {
    if (!field.defaultValue) return;
    if (!FIELD_TYPES_WITH_OPTIONS.includes(field.type)) return;

    const validDefaults = field.defaultValue
      .split(/[,|]/)
      .map((item) => item.trim())
      .filter(Boolean);

    const missingDefaults = validDefaults.filter((item) => !field.options.includes(item));
    if (missingDefaults.length > 0) {
      addIssue(
        issues,
        'warning',
        `Field "${field.id}" has default value outside its options: ${missingDefaults.join(', ')}.`,
        field.id,
        'default_outside_options',
      );
    }
  });
}

export function validateTemplate(content: string): TemplateValidationResult {
  const issues: TemplateValidationIssue[] = [];
  findRawSyntaxIssues(content, issues);
  validateRawFieldConfigs(content, issues);

  const fields = getTemplateFields(content);

  fields.forEach((field) => {
    validateFieldName(field, issues);
    validateOptions(field, issues);
  });

  validateDuplicateFields(fields, issues);
  validateConditions(fields, issues);
  validateDefaults(fields, issues);

  const errors = issues.filter((issue) => issue.severity === 'error');
  const warnings = issues.filter((issue) => issue.severity === 'warning');

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    fields,
    summary: {
      fieldCount: fields.length,
      errorCount: errors.length,
      warningCount: warnings.length,
    },
  };
}
