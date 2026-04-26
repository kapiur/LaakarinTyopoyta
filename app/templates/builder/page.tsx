"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Clipboard, Copy, FilePlus2, Plus, Trash2, Wand2 } from 'lucide-react';

type FieldType = 'input' | 'select';

type FieldDraft = {
  id: number;
  name: string;
  type: FieldType;
  options: string;
  showIfParent: string;
  showIfValue: string;
};

const emptyField = (id: number): FieldDraft => ({
  id,
  name: '',
  type: 'input',
  options: '',
  showIfParent: '',
  showIfValue: '',
});

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

function buildFieldSyntax(field: FieldDraft) {
  const name = normalizeFieldName(field.name);
  if (!name) return '';

  const parts = [name];

  if (field.type === 'select') {
    const options = normalizeOptions(field.options);
    parts.push('select');
    if (options) parts.push(options);
  } else {
    parts.push('input');
  }

  const parent = normalizeFieldName(field.showIfParent);
  const value = field.showIfValue.trim();

  if (parent && value) {
    parts.push('showIf');
    parts.push(`${parent}=${value}`);
  }

  return `{{${parts.join(':')}}}`;
}

export default function TemplateBuilderPage() {
  const router = useRouter();
  const [fields, setFields] = useState<FieldDraft[]>([emptyField(1)]);
  const [copied, setCopied] = useState(false);

  const generatedSyntax = useMemo(() => {
    return fields
      .map(buildFieldSyntax)
      .filter(Boolean)
      .join('\n');
  }, [fields]);

  const updateField = (id: number, patch: Partial<FieldDraft>) => {
    setFields((current) => current.map((field) => field.id === id ? { ...field, ...patch } : field));
  };

  const addField = () => {
    const nextId = Math.max(0, ...fields.map((field) => field.id)) + 1;
    setFields((current) => [...current, emptyField(nextId)]);
  };

  const removeField = (id: number) => {
    setFields((current) => current.length === 1 ? current : current.filter((field) => field.id !== id));
  };

  const copySyntax = async () => {
    if (!generatedSyntax) return;
    await navigator.clipboard.writeText(generatedSyntax);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const createTemplateFromSyntax = () => {
    if (!generatedSyntax) return;
    const encodedContent = encodeURIComponent(generatedSyntax);
    router.push(`/templates/new?content=${encodedContent}`);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6 text-slate-900">
      <div className="flex items-center justify-between bg-white border shadow-sm rounded-[2rem] p-6">
        <div className="flex items-center gap-4">
          <Link href="/templates" className="w-11 h-11 rounded-2xl border border-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Конструктор полей шаблона</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Input, select и showIf без ручного написания синтаксиса</p>
          </div>
        </div>
        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
          <Wand2 size={22} />
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-[2rem] p-6 text-sm leading-relaxed text-amber-900 font-semibold">
        Важно: имя поля — это технический идентификатор. Пиши его латиницей, без кириллицы и без пробелов. Например: <code className="font-mono bg-white px-2 py-1 rounded-lg">kipu</code>, <code className="font-mono bg-white px-2 py-1 rounded-lg">kipukuvaus</code>, <code className="font-mono bg-white px-2 py-1 rounded-lg">infektion_lahde</code>. Значения выбора и сам медицинский текст должны быть на финском.
      </div>

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="bg-white border shadow-sm rounded-[2rem] p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Поле {index + 1}</div>
                  <div className="font-black text-slate-800">{field.name || 'Поле без имени'}</div>
                </div>
                <button
                  onClick={() => removeField(field.id)}
                  disabled={fields.length === 1}
                  className="p-3 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-30"
                  title="Удалить поле"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Техническое имя поля</label>
                  <input
                    value={field.name}
                    onChange={(event) => updateField(field.id, { name: event.target.value })}
                    placeholder="например kipu"
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 font-bold"
                  />
                  <p className="text-xs text-slate-400 font-semibold ml-3">Латиница. Например: kipu, oire, yleistila.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Тип поля</label>
                  <select
                    value={field.type}
                    onChange={(event) => updateField(field.id, { type: event.target.value as FieldType })}
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 font-bold"
                  >
                    <option value="input">Свободное текстовое поле</option>
                    <option value="select">Поле выбора</option>
                  </select>
                </div>
              </div>

              {field.type === 'select' && (
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Варианты выбора через запятую</label>
                  <input
                    value={field.options}
                    onChange={(event) => updateField(field.id, { options: event.target.value })}
                    placeholder="ei,kyllä"
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 font-bold"
                  />
                  <p className="text-xs text-slate-400 font-semibold ml-3">Например: ei,kyllä или lievä,kohtalainen,voimakas.</p>
                </div>
              )}

              <div className="bg-slate-50 rounded-[1.5rem] p-5 space-y-4">
                <div>
                  <div className="font-black text-slate-700 text-sm">Условное отображение</div>
                  <div className="text-xs text-slate-400 font-semibold">Заполняй только если это поле должно появляться при определённом значении другого поля.</div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Показывать, когда поле</label>
                    <input
                      value={field.showIfParent}
                      onChange={(event) => updateField(field.id, { showIfParent: event.target.value })}
                      placeholder="например kipu"
                      className="w-full p-4 bg-white border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">имеет значение</label>
                    <input
                      value={field.showIfValue}
                      onChange={(event) => updateField(field.id, { showIfValue: event.target.value })}
                      placeholder="например kyllä"
                      className="w-full p-4 bg-white border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="text-xs font-mono bg-slate-950 text-slate-50 rounded-2xl p-4 overflow-x-auto">
                {buildFieldSyntax(field) || 'Заполни техническое имя поля латиницей'}
              </div>
            </div>
          ))}

          <button
            onClick={addField}
            className="w-full p-5 bg-white border border-dashed border-blue-200 text-blue-600 rounded-[2rem] font-black uppercase tracking-widest text-[10px] hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Добавить поле
          </button>
        </div>

        <div className="lg:col-span-5 sticky top-6 space-y-4">
          <div className="bg-white border shadow-sm rounded-[2rem] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Готовый синтаксис</div>
                <div className="font-black text-slate-800">Скопируй это в содержимое шаблона</div>
              </div>
              <Clipboard size={18} className="text-slate-300" />
            </div>
            <pre className="min-h-[220px] bg-slate-950 text-slate-50 rounded-2xl p-4 text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap">
              <code>{generatedSyntax || 'Добавь хотя бы одно поле с латинским техническим именем.'}</code>
            </pre>
            <div className="grid gap-3">
              <button
                onClick={copySyntax}
                disabled={!generatedSyntax}
                className="w-full px-6 py-4 bg-white text-blue-600 ring-1 ring-blue-100 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-50 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
              >
                <Copy size={14} />
                {copied ? 'Скопировано' : 'Скопировать синтаксис'}
              </button>
              <button
                onClick={createTemplateFromSyntax}
                disabled={!generatedSyntax}
                className="w-full px-6 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
              >
                <FilePlus2 size={14} />
                Создать шаблон из этого
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-[2rem] p-6 text-sm text-blue-900 font-semibold leading-relaxed space-y-2">
            <div className="font-black">Как пользоваться</div>
            <p>Собери поля в этом окне, затем скопируй готовый синтаксис или сразу открой создание нового шаблона с этим содержимым.</p>
            <p>Финский медицинский текст пишется в самом шаблоне. Поля вставляются внутрь текста в нужных местах.</p>
            <p>Пример: <code className="font-mono bg-white px-2 py-1 rounded-lg">Kipu: {'{{kipu:select:ei,kyllä}}'}.</code></p>
          </div>
        </div>
      </div>
    </div>
  );
}
