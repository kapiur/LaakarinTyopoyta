"use client";

import Link from 'next/link';
import { ArrowLeft, Braces, CheckCircle2 } from 'lucide-react';
import { normalizeUiLanguage, type UiLanguage } from '../../../lib/i18n';
import { useI18n } from '../../../lib/useI18n';

const copy = {
  fi: {
    title: 'Interaktiiviset tekstimallit',
    subtitle: 'Kentät, valinnat ja showIf-logiikka',
    intro:
      'Interaktiivinen malli rakentuu lisäämällä kenttiä suomenkielisen tekstin sisään. Perusmuoto on',
    introTail:
      'Ehdolliset kentät näytetään vain silloin, kun toinen kenttä saa määritellyn arvon.',
    warning:
      'Tärkeää: tekniset kenttänimet kirjoitetaan latinalla ilman kyrillisiä merkkejä ja ilman välilyöntejä. Varsinainen lääketieteellinen teksti ja valintavaihtoehdot pysyvät suomeksi.',
    recommendations: 'Suosituksia',
    recommendationItems: [
      'Käytä lyhyitä teknisiä nimiä latinalla: kipu, yleistila.',
      'Pitkiin kuvauksiin sopii textarea, esimerkiksi {{statuskuvaus:textarea}}.',
      'Älä käytä kyrillisiä merkkejä, välilyöntejä tai erikoismerkkejä kentän nimessä.',
      'Moniosaisiin nimiin käytä alaviivaa: infektion_lahde.',
      'Select-arvot voi kirjoittaa suomeksi: ei,kyllä tai lievä,kohtalainen,voimakas.',
      'showIf-ehto ei huomioi kirjainkokoa.',
      'Jos ehto ei täyty, kenttä ei näy eikä sen arvoa lisätä lopulliseen tekstiin.',
    ],
    examples: [
      {
        title: 'Lyhyt tekstikenttä',
        description: 'Luo lyhyen vapaan tekstikentän teknisellä nimellä oire.',
      },
      {
        title: 'Pitkä tekstikenttä',
        description: 'Luo pitkän monirivisen kentän. Sopii kuvauksiin kuten statuskuvaus, oirekuvaus ja suunnitelma.',
      },
      {
        title: 'Valintakenttä',
        description: 'Luo valintavaihtoehdot: hyvä, kohtalainen, heikko.',
      },
      {
        title: 'Ehdollinen tekstikenttä',
        description: 'Kenttä kipukuvaus näkyy vain, jos kentässä kipu on valittu kyllä.',
      },
      {
        title: 'Ehdollinen valintakenttä',
        description: 'Kenttä infektion_lahde näkyy vain, jos infektio on kyllä.',
      },
    ],
  },
  ru: {
    title: 'Интерактивные текстовые шаблоны',
    subtitle: 'Поля, варианты выбора и логика showIf',
    intro:
      'Интерактивный шаблон строится добавлением полей внутрь финского текста. Базовый формат:',
    introTail:
      'Условные поля появляются только тогда, когда другое поле имеет заданное значение.',
    warning:
      'Важно: технические имена полей пишем латиницей, без кириллицы и без пробелов. Сам медицинский текст и варианты выбора остаются на финском.',
    recommendations: 'Рекомендации',
    recommendationItems: [
      'Используй короткие технические имена полей латиницей: kipu, yleistila.',
      'Для длинных описаний используй textarea, например {{statuskuvaus:textarea}}.',
      'Не используй кириллицу, пробелы и сложные символы в имени поля.',
      'Для составных имён используй подчёркивание: infektion_lahde.',
      'Значения select можно писать по-фински: ei,kyllä или lievä,kohtalainen,voimakas.',
      'Условие showIf не учитывает регистр букв.',
      'Если условие не выполнено, поле не показывается и его значение не попадает в итоговый текст.',
    ],
    examples: [
      {
        title: 'Короткое текстовое поле',
        description: 'Создаёт короткое свободное текстовое поле с техническим именем oire.',
      },
      {
        title: 'Длинное текстовое поле',
        description: 'Создаёт длинное многострочное поле. Подходит для описаний: statuskuvaus, oirekuvaus, suunnitelma.',
      },
      {
        title: 'Поле выбора',
        description: 'Создаёт варианты выбора: hyvä, kohtalainen, heikko.',
      },
      {
        title: 'Условное текстовое поле',
        description: 'Поле kipukuvaus появляется только если в поле kipu выбрано kyllä.',
      },
      {
        title: 'Условное поле выбора',
        description: 'Поле infektion_lahde появляется только если infektio равно kyllä.',
      },
    ],
  },
  en: {
    title: 'Interactive text templates',
    subtitle: 'Fields, choices, and showIf logic',
    intro:
      'An interactive template is built by inserting fields into Finnish source text. The basic format is',
    introTail:
      'Conditional fields appear only when another field has the specified value.',
    warning:
      'Important: write technical field names in Latin characters, without Cyrillic and without spaces. The actual medical text and the choice values stay in Finnish.',
    recommendations: 'Recommendations',
    recommendationItems: [
      'Use short technical field names in Latin characters: kipu, yleistila.',
      'Use textarea for longer descriptions, for example {{statuskuvaus:textarea}}.',
      'Do not use Cyrillic, spaces, or complex symbols in a field name.',
      'Use underscores for compound names: infektion_lahde.',
      'Select values can stay in Finnish: ei,kyllä or lievä,kohtalainen,voimakas.',
      'The showIf condition is case-insensitive.',
      'If the condition is not met, the field stays hidden and its value is not added to the final text.',
    ],
    examples: [
      {
        title: 'Short text field',
        description: 'Creates a short free-text field with the technical name oire.',
      },
      {
        title: 'Long text field',
        description: 'Creates a long multiline field. Good for descriptions such as statuskuvaus, oirekuvaus, and suunnitelma.',
      },
      {
        title: 'Select field',
        description: 'Creates choice values: hyvä, kohtalainen, heikko.',
      },
      {
        title: 'Conditional text field',
        description: 'The field kipukuvaus appears only when the field kipu is set to kyllä.',
      },
      {
        title: 'Conditional select field',
        description: 'The field infektion_lahde appears only when infektio equals kyllä.',
      },
    ],
  },
  de: {
    title: 'Interaktive Textvorlagen',
    subtitle: 'Felder, Auswahlwerte und ShowIf-Logik',
    intro:
      'Eine interaktive Vorlage wird aufgebaut, indem Felder in finnischen Ausgangstext eingefügt werden. Das Grundformat ist',
    introTail:
      'Bedingte Felder erscheinen nur dann, wenn ein anderes Feld den festgelegten Wert hat.',
    warning:
      'Wichtig: Technische Feldnamen werden in lateinischen Zeichen, ohne Kyrillisch und ohne Leerzeichen geschrieben. Der eigentliche medizinische Text und die Auswahlwerte bleiben auf Finnisch.',
    recommendations: 'Empfehlungen',
    recommendationItems: [
      'Kurze technische Feldnamen in lateinischen Zeichen verwenden: kipu, yleistila.',
      'Für längere Beschreibungen textarea verwenden, zum Beispiel {{statuskuvaus:textarea}}.',
      'Keine kyrillischen Zeichen, Leerzeichen oder Sonderzeichen im Feldnamen verwenden.',
      'Für zusammengesetzte Namen Unterstriche verwenden: infektion_lahde.',
      'Select-Werte können auf Finnisch bleiben: ei,kyllä oder lievä,kohtalainen,voimakas.',
      'Die showIf-Bedingung ist nicht groß-/kleinschreibungssensitiv.',
      'Wenn die Bedingung nicht erfüllt ist, bleibt das Feld verborgen und sein Wert wird nicht in den Endtext übernommen.',
    ],
    examples: [
      {
        title: 'Kurzes Textfeld',
        description: 'Erstellt ein kurzes Freitextfeld mit dem technischen Namen oire.',
      },
      {
        title: 'Langes Textfeld',
        description: 'Erstellt ein langes mehrzeiliges Feld. Gut geeignet für Beschreibungen wie statuskuvaus, oirekuvaus und suunnitelma.',
      },
      {
        title: 'Auswahlfeld',
        description: 'Erstellt Auswahlwerte: hyvä, kohtalainen, heikko.',
      },
      {
        title: 'Bedingtes Textfeld',
        description: 'Das Feld kipukuvaus erscheint nur, wenn im Feld kipu der Wert kyllä gewählt ist.',
      },
      {
        title: 'Bedingtes Auswahlfeld',
        description: 'Das Feld infektion_lahde erscheint nur, wenn infektio gleich kyllä ist.',
      },
    ],
  },
} as const;

const exampleCodes = [
  'Potilas kertoo: {{oire}}',
  'Status: {{statuskuvaus:textarea}}',
  'Yleistila on {{yleistila:select:hyvä,kohtalainen,heikko}}.',
  'Kipu: {{kipu:select:ei,kyllä}}.\n{{kipukuvaus:textarea:showIf:kipu=kyllä}}',
  '{{infektio:select:ei,kyllä}}\n{{infektion_lahde:select:virtsatie,keuhko,iho,muu:showIf:infektio=kyllä}}',
];

export default function TemplateSyntaxPage() {
  const { language } = useI18n();
  const lang = normalizeUiLanguage(language);
  const c = copy[lang] ?? copy.en;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 text-slate-900">
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
          <Braces size={22} />
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-[2rem] p-6 text-sm leading-relaxed text-blue-900 font-semibold">
        {c.intro} <code className="font-mono bg-white px-2 py-1 rounded-lg">{'{{kentta}}'}</code>. {c.introTail}
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-[2rem] p-6 text-sm leading-relaxed text-amber-900 font-semibold">
        {c.warning}{' '}
        <code className="font-mono bg-white px-2 py-1 rounded-lg">kipu</code>,{' '}
        <code className="font-mono bg-white px-2 py-1 rounded-lg">kipukuvaus</code>,{' '}
        <code className="font-mono bg-white px-2 py-1 rounded-lg">infektion_lahde</code>.
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {c.examples.map((example, index) => (
          <div key={example.title} className="bg-white border shadow-sm rounded-[2rem] p-6 space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <h2 className="font-black text-slate-800">{example.title}</h2>
            </div>
            <pre className="bg-slate-950 text-slate-50 rounded-2xl p-4 text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap">
              <code>{exampleCodes[index]}</code>
            </pre>
            <p className="text-sm text-slate-500 font-semibold leading-relaxed">{example.description}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border shadow-sm rounded-[2rem] p-6 space-y-3">
        <h2 className="font-black text-slate-800">{c.recommendations}</h2>
        <ul className="space-y-2 text-sm text-slate-500 font-semibold leading-relaxed">
          {c.recommendationItems.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
