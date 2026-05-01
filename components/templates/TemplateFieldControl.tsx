"use client";

import type { TemplateFieldPart, TemplateValues } from '../../lib/templates';

type TemplateFieldControlProps = {
  field: TemplateFieldPart;
  values: TemplateValues;
  onChange: (fieldId: string, value: string) => void;
};

export default function TemplateFieldControl({ field, values, onChange }: TemplateFieldControlProps) {
  const value = values[field.id] || '';

  if (field.type === 'select') {
    return (
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
    );
  }

  if (field.type === 'textarea') {
    return (
      <textarea
        value={value}
        onChange={(event) => onChange(field.id, event.target.value)}
        className="w-full min-h-[150px] p-4 bg-slate-50 border-none rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 font-bold text-sm transition-all shadow-inner leading-relaxed resize-y"
      />
    );
  }

  return (
    <input
      value={value}
      onChange={(event) => onChange(field.id, event.target.value)}
      className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 font-bold text-sm transition-all shadow-inner"
    />
  );
}
