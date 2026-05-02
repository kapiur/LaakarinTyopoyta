import { getTemplateFields } from './parser';
import type { TemplateFieldPart, TemplateFieldType } from './types';

export type TemplateValidationSeverity = 'error' | 'warning';

export type TemplateValidationIssue = {
  severity: TemplateValidationSeverity;
  fieldId?: string;
  message: string;
};

export type TemplateValidationResult = {
  ok: boolean;
  errors: TemplateValidationIssue[];
  warnings: TemplateValidationIssue[];
  fields: TemplateFieldPart[];
};

const FIELD_NAME_REGEX = /^[a-z0-9_]+$/;
const FIELD_TYPES_WITH_OPTIONS: TemplateFieldType[] = ['select', 'radio', 'multiselect'];

function addIssue(
  issues: TemplateValidationIssue[],
  severity: TemplateValidationSeverity,
  message: string,
  fieldId?: string,
) {
  issues.push({ severity, message, fieldId });
}

function findRawSyntaxIssues(content: string, issues: TemplateValidationIssue[]) {
  const openingMatches = content.match(/{{/g) || [];
  const closingMatches = content.match(/}}/g) || [];

  if (openingMatches.length !== closingMatches.length) {
    addIssue(
      issues,
      'error',
      'Template has unmatched {{ or }} markers.',
    );
  }

  const emptyFields = content.match(/{{\s*}}/g) || [];
  if (emptyFields.length > 0) {
    addIssue(issues, 'error', 'Template contains an empty field marker {{}}.');
  }
}

function validateFieldName(field: TemplateFieldPart, issues: TemplateValidationIssue[]) {
  if (!field.id) {
    addIssue(issues, 'error', 'Field has an empty technical name.', field.id);
    return;
  }

  if (!FIELD_NAME_REGEX.test(field.id)) {
    addIssue(
      issues,
      'error',
      `Field "${field.displayName}" has an invalid technical name. Use lowercase Latin letters, numbers and underscore only.`,
      field.id,
    );
  }

  if (field.id.includes('-')) {
    addIssue(
      issues,
      'warning',
      `Field "${field.displayName}" contains a dash. Prefer underscore for technical field names.`,
      field.id,
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
    );
    return;
  }

  const duplicateOptions = field.options.filter((option, index) => field.options.indexOf(option) !== index);
  if (duplicateOptions.length > 0) {
    addIssue(
      issues,
      'warning',
      `Field "${field.id}" has duplicate options: ${Array.from(new Set(duplicateOptions)).join(', ')}.`,
      field.id,
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
      );
      return;
    }

    if (condition.operator === 'includes') {
      const parent = fieldById.get(condition.parentId);
      if (parent && parent.type !== 'multiselect') {
        addIssue(
          issues,
          'warning',
          `Field "${field.id}" uses showIfIncludes with "${condition.parentId}", but the parent field is not multiselect.`,
          field.id,
        );
      }
    }

    if (condition.operator === 'in' && (!condition.values || condition.values.length < 2)) {
      addIssue(
        issues,
        'warning',
        `Field "${field.id}" uses showIfAny with less than two values. showIf may be clearer.`,
        field.id,
      );
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
      );
    }
  });
}

export function validateTemplate(content: string): TemplateValidationResult {
  const issues: TemplateValidationIssue[] = [];
  findRawSyntaxIssues(content, issues);

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
  };
}
