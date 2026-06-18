"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Clipboard, Copy, FilePlus2, Plus, Trash2, Wand2 } from 'lucide-react';
import { normalizeUiLanguage, type UiLanguage } from '../../../lib/i18n';
import { useI18n } from '../../../lib/useI18n';

type FieldType = 'input' | 'textarea' | 'select';

type FieldDraft = {
  id: number;
  name: string;
  type: FieldType;
  options: string;
  showIfParent: string;
  showIfValue: string;
};

const copy = {
  fi: {
    title: 'Mallipohjan kenttärakentaja',
    subtitle: 'Input-, textarea-, select- ja showIf-kentät ilman käsin kirjoitettua syntaksia',
    important:
      'Tärkeää: kentän nimi on tekninen tunniste. Kirjoita se latinalla ilman kyrillisiä merkkejä ja ilman välilyöntejä. Esimerkiksi:',
    field: 'Kenttä',
    unnamedField: 'Nimeämätön kenttä',
    deleteField: 'Poista kenttä',
    technicalName: 'Kentän tekninen nimi',
    technicalNamePlaceholder: 'esim. kipu',
    technicalNameHelp: 'Latinalla. Esimerkiksi: kipu, oire, yleistila.',
    fieldType: 'Kenttätyyppi',
    shortText: 'Lyhyt tekstikenttä',
    longText: 'Pitkä tekstikenttä',
    selectField: 'Valintakenttä',
    optionsLabel: 'Valintavaihtoehdot pilkuilla',
    optionsPlaceholder: 'ei,kyllä',
    optionsHelp: 'Esimerkiksi: ei,kyllä tai lievä,kohtalainen,voimakas.',
    textareaHelp: 'Pitkä tekstikenttä sopii kuvauksiin: oirekuvaus, statuskuvaus, suunnitelma, lisätiedot.',
    conditionalTitle: 'Ehdollinen näyttö',
    conditionalText: 'Täytä vain, jos kentän pitää näkyä toisen kentän tietyn arvon perusteella.',
    showWhenField: 'Näytä kun kenttä',
    showWhenFieldPlaceholder: 'esim. kipu',
    showWhenValue: 'on arvoltaan',
    showWhenValuePlaceholder: 'esim. kyllä',
    fillTechnicalName: 'Täytä tekninen kentänimi latinalla',
    addField: 'Lisää kenttä',
    readySyntax: 'Valmis syntaksi',
    readySyntaxHelp: 'Kopioi tämä mallin sisältöön',
    addAtLeastOneField: 'Lisää vähintään yksi kenttä, jolla on latinankielinen tekninen nimi.',
    copied: 'Kopioitu',
    copySyntax: 'Kopioi syntaksi',
    createTemplate: 'Luo tästä uusi malli',
    howToUse: 'Näin käytät tätä',
    usageLine1: 'Rakenna kentät tässä näkymässä, kopioi valmis syntaksi tai avaa suoraan uuden mallin luonti tällä sisällöllä.',
    usageLine2: 'Suomenkielinen lääketieteellinen teksti kirjoitetaan itse malliin. Kentät lisätään tekstin sisään oikeisiin kohtiin.',
    usageExample: 'Esimerkki:',
  },
  ru: {
    title: 'Конструктор полей шаблона',
    subtitle: 'Поля input, textarea, select и showIf без ручного написания синтаксиса',
    important:
      'Важно: имя поля — это технический идентификатор. Пишите его латиницей, без кириллицы и без пробелов. Например:',
    field: 'Поле',
    unnamedField: 'Поле без имени',
    deleteField: 'Удалить поле',
    technicalName: 'Техническое имя поля',
    technicalNamePlaceholder: 'например kipu',
    technicalNameHelp: 'Латиница. Например: kipu, oire, yleistila.',
    fieldType: 'Тип поля',
    shortText: 'Короткое текстовое поле',
    longText: 'Длинное текстовое поле',
    selectField: 'Поле выбора',
    optionsLabel: 'Варианты выбора через запятую',
    optionsPlaceholder: 'ei,kyllä',
    optionsHelp: 'Например: ei,kyllä или lievä,kohtalainen,voimakas.',
    textareaHelp: 'Длинное текстовое поле удобно для описаний: oirekuvaus, statuskuvaus, suunnitelma, lisatiedot.',
    conditionalTitle: 'Условное отображение',
    conditionalText: 'Заполняйте только если поле должно появляться при определённом значении другого поля.',
    showWhenField: 'Показывать, когда поле',
    showWhenFieldPlaceholder: 'например kipu',
    showWhenValue: 'имеет значение',
    showWhenValuePlaceholder: 'например kyllä',
    fillTechnicalName: 'Заполни техническое имя поля латиницей',
    addField: 'Добавить поле',
    readySyntax: 'Готовый синтаксис',
    readySyntaxHelp: 'Скопируй это в содержимое шаблона',
    addAtLeastOneField: 'Добавь хотя бы одно поле с латинским техническим именем.',
    copied: 'Скопировано',
    copySyntax: 'Скопировать синтаксис',
    createTemplate: 'Создать шаблон из этого',
    howToUse: 'Как пользоваться',
    usageLine1: 'Собери поля в этом окне, затем скопируй готовый синтаксис или сразу открой создание нового шаблона с этим содержимым.',
    usageLine2: 'Финский медицинский текст пишется в самом шаблоне. Поля вставляются внутрь текста в нужных местах.',
    usageExample: 'Пример:',
  },
  en: {
    title: 'Template field builder',
    subtitle: 'Input, textarea, select and showIf fields without writing syntax by hand',
    important:
      'Important: the field name is a technical identifier. Write it in Latin characters, without Cyrillic and without spaces. For example:',
    field: 'Field',
    unnamedField: 'Unnamed field',
    deleteField: 'Delete field',
    technicalName: 'Technical field name',
    technicalNamePlaceholder: 'for example kipu',
    technicalNameHelp: 'Latin characters only. For example: kipu, oire, yleistila.',
    fieldType: 'Field type',
    shortText: 'Short text field',
    longText: 'Long text field',
    selectField: 'Select field',
    optionsLabel: 'Select options separated by commas',
    optionsPlaceholder: 'ei,kyllä',
    optionsHelp: 'For example: ei,kyllä or lievä,kohtalainen,voimakas.',
    textareaHelp: 'Long text fields are useful for descriptions: oirekuvaus, statuskuvaus, suunnitelma, lisatiedot.',
    conditionalTitle: 'Conditional visibility',
    conditionalText: 'Fill this only if the field should appear for a specific value of another field.',
    showWhenField: 'Show when field',
    showWhenFieldPlaceholder: 'for example kipu',
    showWhenValue: 'has value',
    showWhenValuePlaceholder: 'for example kyllä',
    fillTechnicalName: 'Enter the technical field name in Latin characters',
    addField: 'Add field',
    readySyntax: 'Ready syntax',
    readySyntaxHelp: 'Copy this into the template content',
    addAtLeastOneField: 'Add at least one field with a Latin technical name.',
    copied: 'Copied',
    copySyntax: 'Copy syntax',
    createTemplate: 'Create template from this',
    howToUse: 'How to use this',
    usageLine1: 'Build fields in this view, then copy the ready syntax or open a new template directly with this content.',
    usageLine2: 'Finnish medical text is written in the template itself. Fields are inserted into the text where needed.',
    usageExample: 'Example:',
  },
  de: {
    title: 'Feld-Builder für Vorlagen',
    subtitle: 'Input-, Textarea-, Select- und ShowIf-Felder ohne manuell geschriebenen Syntax',
    important:
      'Wichtig: Der Feldname ist eine technische Kennung. Schreibe ihn in lateinischen Zeichen, ohne Kyrillisch und ohne Leerzeichen. Zum Beispiel:',
    field: 'Feld',
    unnamedField: 'Unbenanntes Feld',
    deleteField: 'Feld löschen',
    technicalName: 'Technischer Feldname',
    technicalNamePlaceholder: 'z. B. kipu',
    technicalNameHelp: 'Nur lateinische Zeichen. Zum Beispiel: kipu, oire, yleistila.',
    fieldType: 'Feldtyp',
    shortText: 'Kurzes Textfeld',
    longText: 'Langes Textfeld',
    selectField: 'Auswahlfeld',
    optionsLabel: 'Auswahloptionen durch Kommas getrennt',
    optionsPlaceholder: 'ei,kyllä',
    optionsHelp: 'Zum Beispiel: ei,kyllä oder lievä,kohtalainen,voimakas.',
    textareaHelp: 'Lange Textfelder eignen sich für Beschreibungen: oirekuvaus, statuskuvaus, suunnitelma, lisätiedot.',
    conditionalTitle: 'Bedingte Anzeige',
    conditionalText: 'Nur ausfüllen, wenn das Feld bei einem bestimmten Wert eines anderen Feldes sichtbar sein soll.',
    showWhenField: 'Anzeigen, wenn Feld',
    showWhenFieldPlaceholder: 'z. B. kipu',
    showWhenValue: 'den Wert hat',
    showWhenValuePlaceholder: 'z. B. kyllä',
    fillTechnicalName: 'Technischen Feldnamen in lateinischen Zeichen eingeben',
    addField: 'Feld hinzufügen',
    readySyntax: 'Fertiger Syntax',
    readySyntaxHelp: 'Diesen in den Vorlageninhalt kopieren',
    addAtLeastOneField: 'Mindestens ein Feld mit lateinischem technischem Namen hinzufügen.',
    copied: 'Kopiert',
    copySyntax: 'Syntax kopieren',
    createTemplate: 'Daraus Vorlage erstellen',
    howToUse: 'So verwendest du das',
    usageLine1: 'Felder in dieser Ansicht erstellen, dann den fertigen Syntax kopieren oder direkt eine neue Vorlage mit diesem Inhalt öffnen.',
    usageLine2: 'Der finnische medizinische Text wird in der Vorlage selbst geschrieben. Felder werden an den passenden Stellen in den Text eingefügt.',
    usageExample: 'Beispiel:',
  },
} as const;

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
  } else if (field.type === 'textarea') {
    parts.push('textarea');
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
  const { language } = useI18n();
  const lang = normalizeUiLanguage(language);
  const c = copy[lang] ?? copy.en;
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
            <h1 className="text-2xl font-black tracking-tight">{c.title}</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{c.subtitle}</p>
          </div>
        </div>
        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
          <Wand2 size={22} />
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-[2rem] p-6 text-sm leading-relaxed text-amber-900 font-semibold">
        {c.important}{' '}
        <code className="font-mono bg-white px-2 py-1 rounded-lg">kipu</code>,{' '}
        <code className="font-mono bg-white px-2 py-1 rounded-lg">kipukuvaus</code>,{' '}
        <code className="font-mono bg-white px-2 py-1 rounded-lg">infektion_lahde</code>.{' '}
        {lang === 'fi'
          ? 'Valinta-arvot ja varsinainen lääketieteellinen teksti kannattaa pitää suomeksi.'
          : lang === 'ru'
            ? 'Значения выбора и сам медицинский текст лучше оставлять на финском.'
            : lang === 'de'
              ? 'Auswahlwerte und der eigentliche medizinische Text sollten auf Finnisch bleiben.'
            : 'Selection values and the actual medical text should stay in Finnish.'}
      </div>

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="bg-white border shadow-sm rounded-[2rem] p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{c.field} {index + 1}</div>
                  <div className="font-black text-slate-800">{field.name || c.unnamedField}</div>
                </div>
                <button
                  onClick={() => removeField(field.id)}
                  disabled={fields.length === 1}
                  className="p-3 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-30"
                  title={c.deleteField}
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">{c.technicalName}</label>
                  <input
                    value={field.name}
                    onChange={(event) => updateField(field.id, { name: event.target.value })}
                    placeholder={c.technicalNamePlaceholder}
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 font-bold"
                  />
                  <p className="text-xs text-slate-400 font-semibold ml-3">{c.technicalNameHelp}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">{c.fieldType}</label>
                  <select
                    value={field.type}
                    onChange={(event) => updateField(field.id, { type: event.target.value as FieldType })}
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 font-bold"
                  >
                    <option value="input">{c.shortText}</option>
                    <option value="textarea">{c.longText}</option>
                    <option value="select">{c.selectField}</option>
                  </select>
                </div>
              </div>

              {field.type === 'select' && (
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">{c.optionsLabel}</label>
                  <input
                    value={field.options}
                    onChange={(event) => updateField(field.id, { options: event.target.value })}
                    placeholder={c.optionsPlaceholder}
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 font-bold"
                  />
                  <p className="text-xs text-slate-400 font-semibold ml-3">{c.optionsHelp}</p>
                </div>
              )}

              {field.type === 'textarea' && (
                <div className="bg-blue-50 border border-blue-100 rounded-[1.5rem] p-4 text-xs text-blue-900 font-semibold leading-relaxed">
                  {c.textareaHelp}
                </div>
              )}

              <div className="bg-slate-50 rounded-[1.5rem] p-5 space-y-4">
                <div>
                  <div className="font-black text-slate-700 text-sm">{c.conditionalTitle}</div>
                  <div className="text-xs text-slate-400 font-semibold">{c.conditionalText}</div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">{c.showWhenField}</label>
                    <input
                      value={field.showIfParent}
                      onChange={(event) => updateField(field.id, { showIfParent: event.target.value })}
                      placeholder={c.showWhenFieldPlaceholder}
                      className="w-full p-4 bg-white border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">{c.showWhenValue}</label>
                    <input
                      value={field.showIfValue}
                      onChange={(event) => updateField(field.id, { showIfValue: event.target.value })}
                      placeholder={c.showWhenValuePlaceholder}
                      className="w-full p-4 bg-white border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="text-xs font-mono bg-slate-950 text-slate-50 rounded-2xl p-4 overflow-x-auto">
                {buildFieldSyntax(field) || c.fillTechnicalName}
              </div>
            </div>
          ))}

          <button
            onClick={addField}
            className="w-full p-5 bg-white border border-dashed border-blue-200 text-blue-600 rounded-[2rem] font-black uppercase tracking-widest text-[10px] hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={16} /> {c.addField}
          </button>
        </div>

        <div className="lg:col-span-5 sticky top-6 space-y-4">
          <div className="bg-white border shadow-sm rounded-[2rem] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{c.readySyntax}</div>
                <div className="font-black text-slate-800">{c.readySyntaxHelp}</div>
              </div>
              <Clipboard size={18} className="text-slate-300" />
            </div>
            <pre className="min-h-[220px] bg-slate-950 text-slate-50 rounded-2xl p-4 text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap">
              <code>{generatedSyntax || c.addAtLeastOneField}</code>
            </pre>
            <div className="grid gap-3">
              <button
                onClick={copySyntax}
                disabled={!generatedSyntax}
                className="w-full px-6 py-4 bg-white text-blue-600 ring-1 ring-blue-100 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-50 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
              >
                <Copy size={14} />
                {copied ? c.copied : c.copySyntax}
              </button>
              <button
                onClick={createTemplateFromSyntax}
                disabled={!generatedSyntax}
                className="w-full px-6 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
              >
                <FilePlus2 size={14} />
                {c.createTemplate}
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-[2rem] p-6 text-sm text-blue-900 font-semibold leading-relaxed space-y-2">
            <div className="font-black">{c.howToUse}</div>
            <p>{c.usageLine1}</p>
            <p>{c.usageLine2}</p>
            <p>{c.usageExample} <code className="font-mono bg-white px-2 py-1 rounded-lg">Kipu: {'{{kipu:select:ei,kyllä}}'}.</code></p>
          </div>
        </div>
      </div>
    </div>
  );
}
