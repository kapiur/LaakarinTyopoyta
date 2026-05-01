"use client";

import type { TemplateFieldPart, TemplateValues } from '../../lib/templates';

type TemplateFieldInputProps = {
  field: TemplateFieldPart;
  values: TemplateValues;
  onChange: (fieldId: string, value: string) => void;
};

export default function TemplateFieldInput({ field, values, onChange }: TemplateFieldInputProps) {
  const value = values[field.id] || '';

  if (field.type === 'select') {
    return (
      <div className="flex flex-wrap gap-2">
        {field.options.map((option) => (
          <button
            key={option}
            onClick={() => onChange(field.id, option)}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase border transition-all ${
              value === option
                ? 'bg-slate-900 text-white border-slate-900 shadow-lg'
                : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-blue-300 hover:bg-white'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    );
  }

  if (field.type === 'textarea') {
    return (
      <textarea
        className="min-h-[140px] p-4 bg-slate-50 border-none rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 font-bold text-sm transition-all shadow-inner leading-relaxed resize-y"
        value={value}
        onChange={(event) => onChange(field.id, event.target.value)}
      />
    );
  }

  return (
    <input
      className="p-4 bg-slate-50 border-none rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 font-bold text-sm transition-all shadow-inner"
      value={value}
      onChange={(event) => onChange(field.id, event.target.value)}
    />
  );
}
