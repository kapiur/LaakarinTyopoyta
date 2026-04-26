import Link from 'next/link';
import { ArrowLeft, Braces, CheckCircle2 } from 'lucide-react';

const examples = [
  {
    title: 'Tavallinen tekstikenttä',
    code: 'Potilas kertoo: {{oire}}',
    description: 'Luo vapaan tekstikentän nimellä oire.',
  },
  {
    title: 'Valintakenttä',
    code: 'Yleistila on {{yleistila:select:hyvä,kohtalainen,heikko}}.',
    description: 'Luo valintapainikkeet: hyvä, kohtalainen ja heikko.',
  },
  {
    title: 'Ehdollinen tekstikenttä',
    code: 'Kipu: {{kipu:select:ei,kyllä}}.\n{{kipukuvaus:input:showIf:kipu=kyllä}}',
    description: 'Kenttä kipukuvaus näkyy vain, jos kipu-kentässä valitaan kyllä.',
  },
  {
    title: 'Ehdollinen valintakenttä',
    code: '{{infektio:select:ei,kyllä}}\n{{infektion_lahde:select:virtsatie,keuhko,iho,muu:showIf:infektio=kyllä}}',
    description: 'Kenttä infektion_lahde näkyy vain, jos infektio on kyllä.',
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
            <h1 className="text-2xl font-black tracking-tight">Interaktiiviset tekstimallit</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kentät, valinnat ja showIf-logiikka</p>
          </div>
        </div>
        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
          <Braces size={22} />
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-[2rem] p-6 text-sm leading-relaxed text-blue-900 font-semibold">
        Interaktiivinen malli rakennetaan lisäämällä tekstin sisään kenttiä muodossa <code className="font-mono bg-white px-2 py-1 rounded-lg">{'{{kentta}}'}</code>. Ehdolliset kentät näkyvät vain, kun toinen valintakenttä saa määritellyn arvon.
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
        <h2 className="font-black text-slate-800">Suositukset</h2>
        <ul className="space-y-2 text-sm text-slate-500 font-semibold leading-relaxed">
          <li>• Käytä teknisissä kenttänimissä lyhyitä nimiä ilman välilyöntejä.</li>
          <li>• Vältä ääkkösiä kenttien tunnisteissa: esimerkiksi <code className="font-mono bg-slate-100 px-2 py-1 rounded-lg">infektion_lahde</code>.</li>
          <li>• <code className="font-mono bg-slate-100 px-2 py-1 rounded-lg">showIf</code>-ehto ei huomioi kirjainkokoa.</li>
          <li>• Jos ehdollisen kentän ehto ei täyty, kenttää ei näytetä eikä sen arvoa lisätä lopulliseen tekstiin.</li>
        </ul>
      </div>
    </div>
  );
}
