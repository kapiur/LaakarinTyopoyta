"use client";

import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';

type FieldType = 'input' | 'textarea' | 'select';

type TemplateSnippetBuilderProps = {
  onInsert: (snippet: string) => void;
};

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
    .split(',')
    .map((option) => option.trim())
    .filter(Boolean)
    .join(',');
}

export default function TemplateSnippetBuilder({ onInsert }: TemplateSnippetBuilderProps) {
  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState<FieldType>('input');
  const [options, setOptions] = useState('');
  const [showIfParent, setShowIfParent] = useState('');
  const [showIfValue, setShowIfValue] = useState('');

  const snippet = useMemo(() => {
    const name = normalizeFieldName(fieldName);
    if (!name) return '';

    const parts = [name];

    if (fieldType === 'select') {
      const normalizedOptions = normalizeOptions(options);
      parts.push('select');
      if (normalizedOptions) parts.push(normalizedOptions);
    } else if (fieldType === 'textarea') {
      parts.push('textarea');
    } else {
      parts.push('input');
    }

    const parent = normalizeFieldName(showIfParent);
    const value = showIfValue.trim();

    if (parent && value) {
      parts.push('showIf');
      parts.push(`${parent}=${value}`);
    }

    return `{{${parts.join(':')}}}`;
  }, [fieldName, fieldType, options, showIfParent, showIfValue]);

  const handleInsert = () => {
    if (!snippet) return;
    onInsert(snippet);
    setFieldName('');
    setOptions('');
    setShowIfParent('');
    setShowIfValue('');
  };

  return (
    <div className="rounded-[1.5rem] border border-blue-100 bg-blue-50/60 p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-blue-700">Lisää kenttä</div>
          <div className="text-xs font-semibold text-blue-900/70">Luo kentän syntaksi ja lisää se mallin sisältöön.</div>
        </div>
        <button
          type="button"
          onClick={handleInsert}
          disabled={!snippet}
          className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 disabled:opacity-40 flex items-center gap-2"
        >
          <Plus size={13} /> Lisää
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <input
          value={fieldName}
          onChange={(event) => setFieldName(event.target.value)}
          placeholder="kentän nimi, esim. kipu"
          className="p-3 rounded-xl bg-white border border-blue-100 outline-none focus:ring-4 focus:ring-blue-500/5 font-bold text-sm"
        />
        <select
          value={fieldType}
          onChange={(event) => setFieldType(event.target.value as FieldType)}
          className="p-3 rounded-xl bg-white border border-blue-100 outline-none focus:ring-4 focus:ring-blue-500/5 font-bold text-sm"
        >
          <option value="input">input</option>
          <option value="textarea">textarea</option>
          <option value="select">select</option>
        </select>
        <input
          value={options}
          onChange={(event) => setOptions(event.target.value)}
          disabled={fieldType !== 'select'}
          placeholder="ei,kyllä"
          className="p-3 rounded-xl bg-white border border-blue-100 outline-none focus:ring-4 focus:ring-blue-500/5 font-bold text-sm disabled:opacity-40"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <input
          value={showIfParent}
          onChange={(event) => setShowIfParent(event.target.value)}
          placeholder="showIf kenttä, esim. kipu"
          className="p-3 rounded-xl bg-white border border-blue-100 outline-none focus:ring-4 focus:ring-blue-500/5 font-bold text-sm"
        />
        <input
          value={showIfValue}
          onChange={(event) => setShowIfValue(event.target.value)}
          placeholder="showIf arvo, esim. kyllä"
          className="p-3 rounded-xl bg-white border border-blue-100 outline-none focus:ring-4 focus:ring-blue-500/5 font-bold text-sm"
        />
      </div>

      <div className="rounded-xl bg-slate-950 p-3 font-mono text-xs text-white min-h-[42px]">
        {snippet || 'Täytä kentän nimi latinalla'}
      </div>
    </div>
  );
}
