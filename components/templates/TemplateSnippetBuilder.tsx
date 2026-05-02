"use client";

import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useI18n } from '../../lib/useI18n';

type FieldType = 'input' | 'textarea' | 'select' | 'radio' | 'multiselect' | 'checkbox' | 'date' | 'number';
type ConditionType = 'none' | 'showIf' | 'showIfAny' | 'showIfNot' | 'showIfIncludes' | 'showIfEmpty' | 'showIfNotEmpty';

type TemplateSnippetBuilderProps = {
  onInsert: (snippet: string) => void;
};

const snippetBuilderCopy = {
  fi: {
    title: 'Lisää kenttä',
    description: 'Luo kentän syntaksi ja lisää se mallin sisältöön.',
    add: 'Lisää',
    fieldNamePlaceholder: 'kentän nimi, esim. kipu',
    labelPlaceholder: 'otsikko, esim. Kivun voimakkuus',
    optionsPlaceholder: 'ei kipua | lievä kipu | kohtalainen kipu',
    defaultPlaceholder: 'oletusarvo',
    placeholderPlaceholder: 'kentän ohjeteksti',
    showIfFieldPlaceholder: 'ehdon kenttä, esim. kipu',
    showIfValuePlaceholder: 'ehdon arvo, esim. kyllä',
    emptySnippet: 'Täytä kentän nimi latinalla',
    required: 'Pakollinen kenttä',
    fieldTypes: {
      input: 'Lyhyt teksti',
      textarea: 'Pitkä teksti',
      select: 'Pudotusvalikko',
      radio: 'Yksi valinta',
      multiselect: 'Useita valintoja',
      checkbox: 'Kyllä/ei-valinta',
      date: 'Päivämäärä',
      number: 'Numero',
    },
    conditions: {
      none: 'Näytä aina',
      showIf: 'Näytä, jos arvo on',
      showIfAny: 'Näytä, jos jokin arvoista on',
      showIfNot: 'Näytä, jos arvo ei ole',
      showIfIncludes: 'Näytä, jos monivalinta sisältää',
      showIfEmpty: 'Näytä, jos kenttä on tyhjä',
      showIfNotEmpty: 'Näytä, jos kenttä ei ole tyhjä',
    },
  },
  ru: {
    title: 'Добавить поле',
    description: 'Создайте синтаксис поля и добавьте его в содержание шаблона.',
    add: 'Добавить',
    fieldNamePlaceholder: 'имя поля, например kipu',
    labelPlaceholder: 'заголовок, например Kivun voimakkuus',
    optionsPlaceholder: 'ei kipua | lievä kipu | kohtalainen kipu',
    defaultPlaceholder: 'значение по умолчанию',
    placeholderPlaceholder: 'подсказка поля',
    showIfFieldPlaceholder: 'поле условия, например kipu',
    showIfValuePlaceholder: 'значение условия, например kyllä',
    emptySnippet: 'Заполните имя поля латиницей',
    required: 'Обязательное поле',
    fieldTypes: {
      input: 'Короткий текст',
      textarea: 'Длинный текст',
      select: 'Выпадающий список',
      radio: 'Один вариант',
      multiselect: 'Несколько вариантов',
      checkbox: 'Галочка да/нет',
      date: 'Дата',
      number: 'Число',
    },
    conditions: {
      none: 'Показывать всегда',
      showIf: 'Показать, если значение равно',
      showIfAny: 'Показать, если есть один из вариантов',
      showIfNot: 'Показать, если значение не равно',
      showIfIncludes: 'Показать, если выбрано значение',
      showIfEmpty: 'Показать, если поле пустое',
      showIfNotEmpty: 'Показать, если поле заполнено',
    },
  },
  en: {
    title: 'Add field',
    description: 'Create field syntax and add it to the template content.',
    add: 'Add',
    fieldNamePlaceholder: 'field name, e.g. kipu',
    labelPlaceholder: 'label, e.g. Pain severity',
    optionsPlaceholder: 'ei kipua | lievä kipu | kohtalainen kipu',
    defaultPlaceholder: 'default value',
    placeholderPlaceholder: 'field hint',
    showIfFieldPlaceholder: 'condition field, e.g. kipu',
    showIfValuePlaceholder: 'condition value, e.g. kyllä',
    emptySnippet: 'Fill in the field name using Latin characters',
    required: 'Required field',
    fieldTypes: {
      input: 'Short text',
      textarea: 'Long text',
      select: 'Dropdown list',
      radio: 'Single choice',
      multiselect: 'Multiple choices',
      checkbox: 'Yes/no checkbox',
      date: 'Date',
      number: 'Number',
    },
    conditions: {
      none: 'Always show',
      showIf: 'Show if value is',
      showIfAny: 'Show if any value is',
      showIfNot: 'Show if value is not',
      showIfIncludes: 'Show if multiple choice includes',
      showIfEmpty: 'Show if field is empty',
      showIfNotEmpty: 'Show if field is not empty',
    },
  },
} as const;

const fieldTypes: FieldType[] = ['input', 'textarea', 'select', 'radio', 'multiselect', 'checkbox', 'date', 'number'];
const conditionTypes: ConditionType[] = ['none', 'showIf', 'showIfAny', 'showIfNot', 'showIfIncludes', 'showIfEmpty', 'showIfNotEmpty'];

function normalizeFieldName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[åä]/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/[^a-z0-9_\-\s]/g, '')
    .replace(/\s+/g, '_');
}

function normalizeOptions(value: string) {
  return value
    .split(/[|,]/)
    .map((option) => option.trim())
    .filter(Boolean)
    .join('|');
}

function shouldShowOptions(fieldType: FieldType) {
  return fieldType === 'select' || fieldType === 'radio' || fieldType === 'multiselect';
}

export default function TemplateSnippetBuilder({ onInsert }: TemplateSnippetBuilderProps) {
  const { language } = useI18n();
  const c = snippetBuilderCopy[language] ?? snippetBuilderCopy.fi;
  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState<FieldType>('input');
  const [options, setOptions] = useState('');
  const [label, setLabel] = useState('');
  const [defaultValue, setDefaultValue] = useState('');
  const [placeholder, setPlaceholder] = useState('');
  const [required, setRequired] = useState(false);
  const [conditionType, setConditionType] = useState<ConditionType>('none');
  const [conditionParent, setConditionParent] = useState('');
  const [conditionValue, setConditionValue] = useState('');

  const snippet = useMemo(() => {
    const name = normalizeFieldName(fieldName);
    if (!name) return '';

    const parts = [name, fieldType];

    if (shouldShowOptions(fieldType)) {
      const normalizedOptions = normalizeOptions(options);
      if (normalizedOptions) parts.push(normalizedOptions);
    }

    if (label.trim()) parts.push('label', label.trim());
    if (defaultValue.trim()) parts.push('default', defaultValue.trim());
    if (placeholder.trim()) parts.push('placeholder', placeholder.trim());
    if (required) parts.push('required');

    const parent = normalizeFieldName(conditionParent);
    const value = conditionValue.trim();

    if (conditionType !== 'none' && parent) {
      parts.push(conditionType);
      if (conditionType === 'showIfEmpty' || conditionType === 'showIfNotEmpty') {
        parts.push(parent);
      } else if (value) {
        parts.push(`${parent}=${value}`);
      }
    }

    return `{{${parts.join(':')}}}`;
  }, [fieldName, fieldType, options, label, defaultValue, placeholder, required, conditionType, conditionParent, conditionValue]);

  const handleInsert = () => {
    if (!snippet) return;
    onInsert(snippet);
    setFieldName('');
    setOptions('');
    setLabel('');
    setDefaultValue('');
    setPlaceholder('');
    setRequired(false);
    setConditionType('none');
    setConditionParent('');
    setConditionValue('');
  };

  const conditionNeedsValue = !['none', 'showIfEmpty', 'showIfNotEmpty'].includes(conditionType);

  return (
    <div className="rounded-[1.5rem] border border-blue-100 bg-blue-50/60 p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-blue-700">{c.title}</div>
          <div className="text-xs font-semibold text-blue-900/70">{c.description}</div>
        </div>
        <button
          type="button"
          onClick={handleInsert}
          disabled={!snippet}
          className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 disabled:opacity-40 flex items-center gap-2"
        >
          <Plus size={13} /> {c.add}
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <input
          value={fieldName}
          onChange={(event) => setFieldName(event.target.value)}
          placeholder={c.fieldNamePlaceholder}
          className="p-3 rounded-xl bg-white border border-blue-100 outline-none focus:ring-4 focus:ring-blue-500/5 font-bold text-sm"
        />
        <select
          value={fieldType}
          onChange={(event) => setFieldType(event.target.value as FieldType)}
          className="p-3 rounded-xl bg-white border border-blue-100 outline-none focus:ring-4 focus:ring-blue-500/5 font-bold text-sm"
        >
          {fieldTypes.map((type) => (
            <option key={type} value={type}>{c.fieldTypes[type]}</option>
          ))}
        </select>
        <input
          value={options}
          onChange={(event) => setOptions(event.target.value)}
          disabled={!shouldShowOptions(fieldType)}
          placeholder={c.optionsPlaceholder}
          className="p-3 rounded-xl bg-white border border-blue-100 outline-none focus:ring-4 focus:ring-blue-500/5 font-bold text-sm disabled:opacity-40"
        />
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder={c.labelPlaceholder}
          className="p-3 rounded-xl bg-white border border-blue-100 outline-none focus:ring-4 focus:ring-blue-500/5 font-bold text-sm"
        />
        <input
          value={defaultValue}
          onChange={(event) => setDefaultValue(event.target.value)}
          placeholder={c.defaultPlaceholder}
          className="p-3 rounded-xl bg-white border border-blue-100 outline-none focus:ring-4 focus:ring-blue-500/5 font-bold text-sm"
        />
        <input
          value={placeholder}
          onChange={(event) => setPlaceholder(event.target.value)}
          placeholder={c.placeholderPlaceholder}
          className="p-3 rounded-xl bg-white border border-blue-100 outline-none focus:ring-4 focus:ring-blue-500/5 font-bold text-sm"
        />
      </div>

      <label className="flex items-center gap-2 text-xs font-black text-blue-900/70">
        <input
          type="checkbox"
          checked={required}
          onChange={(event) => setRequired(event.target.checked)}
          className="h-4 w-4 rounded border-blue-200"
        />
        {c.required}
      </label>

      <div className="grid md:grid-cols-3 gap-3">
        <select
          value={conditionType}
          onChange={(event) => setConditionType(event.target.value as ConditionType)}
          className="p-3 rounded-xl bg-white border border-blue-100 outline-none focus:ring-4 focus:ring-blue-500/5 font-bold text-sm"
        >
          {conditionTypes.map((type) => (
            <option key={type} value={type}>{c.conditions[type]}</option>
          ))}
        </select>
        <input
          value={conditionParent}
          onChange={(event) => setConditionParent(event.target.value)}
          disabled={conditionType === 'none'}
          placeholder={c.showIfFieldPlaceholder}
          className="p-3 rounded-xl bg-white border border-blue-100 outline-none focus:ring-4 focus:ring-blue-500/5 font-bold text-sm disabled:opacity-40"
        />
        <input
          value={conditionValue}
          onChange={(event) => setConditionValue(event.target.value)}
          disabled={!conditionNeedsValue}
          placeholder={c.showIfValuePlaceholder}
          className="p-3 rounded-xl bg-white border border-blue-100 outline-none focus:ring-4 focus:ring-blue-500/5 font-bold text-sm disabled:opacity-40"
        />
      </div>

      <div className="rounded-xl bg-slate-950 p-3 font-mono text-xs text-white min-h-[42px] break-all">
        {snippet || c.emptySnippet}
      </div>
    </div>
  );
}
