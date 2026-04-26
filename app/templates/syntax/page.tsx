import Link from 'next/link';
import { ArrowLeft, Braces, CheckCircle2 } from 'lucide-react';

const examples = [
  {
    title: 'Обычное текстовое поле',
    code: 'Potilas kertoo: {{oire}}',
    description: 'Создаёт свободное текстовое поле с техническим именем oire.',
  },
  {
    title: 'Поле выбора',
    code: 'Yleistila on {{yleistila:select:hyvä,kohtalainen,heikko}}.',
    description: 'Создаёт варианты выбора: hyvä, kohtalainen, heikko.',
  },
  {
    title: 'Условное текстовое поле',
    code: 'Kipu: {{kipu:select:ei,kyllä}}.\n{{kipukuvaus:input:showIf:kipu=kyllä}}',
    description: 'Поле kipukuvaus появляется только если в поле kipu выбрано kyllä.',
  },
  {
    title: 'Условное поле выбора',
    code: '{{infektio:select:ei,kyllä}}\n{{infektion_lahde:select:virtsatie,keuhko,iho,muu:showIf:infektio=kyllä}}',
    description: 'Поле infektion_lahde появляется только если infektio равно kyllä.',
  },
];

export default function TemplateSyntaxPage() {
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 text-slate-900">
      <div className="flex items-center justify-between bg-white border shadow-sm rounded-[2rem] p-6">
        <div className="flex items-center gap-4">
          <Link href="/templates" className="w-11 h-11 rounded-2xl border border-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Интерактивные текстовые шаблоны</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Поля, варианты выбора и логика showIf</p>
          </div>
        </div>
        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
          <Braces size={22} />
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-[2rem] p-6 text-sm leading-relaxed text-blue-900 font-semibold">
        Интерактивный шаблон строится добавлением полей внутрь финского текста. Базовый формат: <code className="font-mono bg-white px-2 py-1 rounded-lg">{'{{kentta}}'}</code>. Условные поля появляются только тогда, когда другое поле имеет заданное значение.
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-[2rem] p-6 text-sm leading-relaxed text-amber-900 font-semibold">
        Важно: технические имена полей пишем латиницей, без кириллицы и без пробелов. Хорошо: <code className="font-mono bg-white px-2 py-1 rounded-lg">kipu</code>, <code className="font-mono bg-white px-2 py-1 rounded-lg">kipukuvaus</code>, <code className="font-mono bg-white px-2 py-1 rounded-lg">infektion_lahde</code>. Сам медицинский текст и варианты выбора остаются на финском.
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {examples.map((example) => (
          <div key={example.title} className="bg-white border shadow-sm rounded-[2rem] p-6 space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <h2 className="font-black text-slate-800">{example.title}</h2>
            </div>
            <pre className="bg-slate-950 text-slate-50 rounded-2xl p-4 text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap">
              <code>{example.code}</code>
            </pre>
            <p className="text-sm text-slate-500 font-semibold leading-relaxed">{example.description}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border shadow-sm rounded-[2rem] p-6 space-y-3">
        <h2 className="font-black text-slate-800">Рекомендации</h2>
        <ul className="space-y-2 text-sm text-slate-500 font-semibold leading-relaxed">
          <li>• Используй короткие технические имена полей латиницей: <code className="font-mono bg-slate-100 px-2 py-1 rounded-lg">kipu</code>, <code className="font-mono bg-slate-100 px-2 py-1 rounded-lg">yleistila</code>.</li>
          <li>• Не используй кириллицу, пробелы и сложные символы в имени поля.</li>
          <li>• Для сложных имён используй подчёркивание: <code className="font-mono bg-slate-100 px-2 py-1 rounded-lg">infektion_lahde</code>.</li>
          <li>• Значения select можно писать по-фински: <code className="font-mono bg-slate-100 px-2 py-1 rounded-lg">ei,kyllä</code>, <code className="font-mono bg-slate-100 px-2 py-1 rounded-lg">lievä,kohtalainen,voimakas</code>.</li>
          <li>• Условие <code className="font-mono bg-slate-100 px-2 py-1 rounded-lg">showIf</code> не учитывает регистр букв.</li>
          <li>• Если условие не выполнено, поле не показывается и его значение не попадает в итоговый текст.</li>
        </ul>
      </div>
    </div>
  );
}
