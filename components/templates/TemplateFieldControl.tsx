"use client";

import type { TemplateFieldPart, TemplateValues } from '../../lib/templates';

type TemplateFieldControlProps = {
  field: TemplateFieldPart;
  values: TemplateValues;
  onChange: (fieldId: string, value: string) => void;
};

function getFieldValue(field: TemplateFieldPart, values: TemplateValues) {
  return values[field.id] || field.defaultValue || '';
}

function getMultiselectValues(value: string) {
  return value
    .split(/[,|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toggleMultiselectValue(currentValue: string, option: string) {
  const values = getMultiselectValues(currentValue);
  const exists = values.includes(option);
  const nextValues = exists ? values.filter((item) => item !== option) : [...values, option];
  return nextValues.join(',');
}

function FieldLabel({ field }: { field: TemplateFieldPart }) {
  if (!field.label) return null;

  return (
    <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
      {field.label}
      {field.required ? <span className="text-rose-500"> *</span> : null}
    </div>
  );
}

export default function TemplateFieldControl({ field, values, onChange }: TemplateFieldControlProps) {
  const value = getFieldValue(field, values);
  const placeholder = field.placeholder || '';

  if (field.type === 'select' || field.type === 'radio') {
    return (
      <div>
        <FieldLabel field={field} />
        <div className="flex flex-wrap gap-2">
          {field.options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onChange(field.id, option)}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase border transition-all ${
                value === option
                  ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200'
                  : 'bg-slate-50 border-slate-100 text-slate-500 hover:border-blue-300 hover:bg-white'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (field.type === 'multiselect') {
    const selectedValues = getMultiselectValues(value);

    return (
      <div>
        <FieldLabel field={field} />
        <div className="flex flex-wrap gap-2">
          {field.options.map((option) => {
            const selected = selectedValues.includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => onChange(field.id, toggleMultiselectValue(value, option))}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase border transition-all ${
                  selected
                    ? 'bg-blue-700 text-white border-blue-700 shadow-lg shadow-blue-100'
                    : 'bg-slate-50 border-slate-100 text-slate-500 hover:border-blue-300 hover:bg-white'
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (field.type === 'checkbox') {
    const checked = value === 'kyllä' || value === 'true' || value === '1';

    return (
      <label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 cursor-pointer hover:bg-white transition-all">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(field.id, event.target.checked ? 'kyllä' : 'ei')}
          className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-sm font-black text-slate-700">
          {field.label || field.displayName}
          {field.required ? <span className="text-rose-500"> *</span> : null}
        </span>
      </label>
    );
  }

  if (field.type === 'textarea') {
    return (
      <div>
        <FieldLabel field={field} />
        <textarea
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(field.id, event.target.value)}
          className="w-full min-h-[150px] p-4 bg-slate-50 border-none rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 font-bold text-sm transition-all shadow-inner leading-relaxed resize-y"
        />
      </div>
    );
  }

  if (field.type === 'date') {
    return (
      <div>
        <FieldLabel field={field} />
        <input
          type="date"
          value={value}
          onChange={(event) => onChange(field.id, event.target.value)}
          className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 font-bold text-sm transition-all shadow-inner"
        />
      </div>
    );
  }

  if (field.type === 'number') {
    return (
      <div>
        <FieldLabel field={field} />
        <input
          type="number"
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(field.id, event.target.value)}
          className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 font-bold text-sm transition-all shadow-inner"
        />
      </div>
    );
  }

  return (
    <div>
      <FieldLabel field={field} />
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(field.id, event.target.value)}
        className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 font-bold text-sm transition-all shadow-inner"
      />
    </div>
  );
}
