"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, RefreshCw, Save } from 'lucide-react';
import { getLocalizedVariant } from '../../../../lib/i18n';
import { useI18n } from '../../../../lib/useI18n';

type PedsIndication = { id: number; name: string };
type PedsDrug = {
  id: number;
  name: string;
  form: 'LIQUID' | 'TABLET';
  unit: 'MG' | 'IU';
  strength: number;
  dosePerKgDay: number;
  timesPerDay: number;
  defaultDays: number | null;
  packageSize: number | null;
  note: string | null;
  indications: { id: number; name: string }[];
};
type DrugFormState = {
  name: string;
  form: 'LIQUID' | 'TABLET';
  unit: 'MG' | 'IU';
  strength: string;
  dosePerKgDay: string;
  timesPerDay: string;
  defaultDays: string;
  packageSize: string;
  note: string;
  indicationIds: number[];
};

const emptyForm: DrugFormState = {
  name: '',
  form: 'LIQUID',
  unit: 'MG',
  strength: '',
  dosePerKgDay: '',
  timesPerDay: '3',
  defaultDays: '',
  packageSize: '',
  note: '',
  indicationIds: [],
};

const copy = {
  fi: {
    back: '← Takaisin lääkekirjastoihin',
    title: 'Muokkaa PEDS-lääkettä',
    subtitle: 'Päivitä oletusannos, vahvuus, lääkemuoto ja indikaatiot.',
    refresh: 'Päivitä',
    invalidId: 'Virheellinen lääke-ID',
    indicationsLoadFailed: 'Indikaatioiden lataus epäonnistui',
    drugsLoadFailed: 'Lääkkeiden lataus epäonnistui',
    notFound: 'Lääkettä ei löytynyt',
    loadFailed: 'Lataus epäonnistui',
    requiredFields: 'Täytä ainakin nimi, vahvuus, annos ja antokerrat',
    saveFailed: 'Tallennus epäonnistui',
    saved: 'Lääke päivitetty',
    drugName: 'Lääkkeen nimi',
    strength: 'Vahvuus mg/IU/ml tai tab',
    dose: 'Annos mg/IU/kg/vrk',
    times: 'Antokerrat / vrk',
    days: 'Kesto pv',
    packageSize: 'Pakkaus ml/kpl',
    note: 'Huomio / ohje',
    indications: 'Indikaatiot',
    noIndications: 'Ei indikaatioita.',
    selected: 'Valittu',
    saveChanges: 'Tallenna muutokset',
  },
  ru: {
    back: '← Назад к библиотекам препаратов',
    title: 'Редактировать PEDS-препарат',
    subtitle: 'Обновите дозу по умолчанию, концентрацию, форму препарата и показания.',
    refresh: 'Обновить',
    invalidId: 'Некорректный ID препарата',
    indicationsLoadFailed: 'Не удалось загрузить показания',
    drugsLoadFailed: 'Не удалось загрузить препараты',
    notFound: 'Препарат не найден',
    loadFailed: 'Не удалось загрузить данные',
    requiredFields: 'Заполните как минимум название, концентрацию, дозу и количество приёмов',
    saveFailed: 'Не удалось сохранить',
    saved: 'Препарат обновлён',
    drugName: 'Название препарата',
    strength: 'Концентрация mg/IU/ml или tab',
    dose: 'Доза mg/IU/kg/vrk',
    times: 'Приёмов / vrk',
    days: 'Длительность pv',
    packageSize: 'Упаковка ml/kpl',
    note: 'Примечание / инструкция',
    indications: 'Показания',
    noIndications: 'Показаний нет.',
    selected: 'Выбрано',
    saveChanges: 'Сохранить изменения',
  },
  en: {
    back: '← Back to drug libraries',
    title: 'Edit PEDS drug',
    subtitle: 'Update default dose, strength, drug form and indications.',
    refresh: 'Refresh',
    invalidId: 'Invalid drug ID',
    indicationsLoadFailed: 'Could not load indications',
    drugsLoadFailed: 'Could not load drugs',
    notFound: 'Drug not found',
    loadFailed: 'Could not load data',
    requiredFields: 'Fill in at least name, strength, dose and dosing frequency',
    saveFailed: 'Could not save',
    saved: 'Drug updated',
    drugName: 'Drug name',
    strength: 'Strength mg/IU/ml or tab',
    dose: 'Dose mg/IU/kg/day',
    times: 'Doses / day',
    days: 'Duration days',
    packageSize: 'Package ml/pcs',
    note: 'Note / instruction',
    indications: 'Indications',
    noIndications: 'No indications.',
    selected: 'Selected',
    saveChanges: 'Save changes',
  },
  de: {
    back: '← Zurück zu den Arzneibibliotheken',
    title: 'PEDS-Arzneimittel bearbeiten',
    subtitle: 'Standarddosis, Stärke, Darreichungsform und Indikationen aktualisieren.',
    refresh: 'Aktualisieren',
    invalidId: 'Ungültige Arzneimittel-ID',
    indicationsLoadFailed: 'Indikationen konnten nicht geladen werden',
    drugsLoadFailed: 'Arzneimittel konnten nicht geladen werden',
    notFound: 'Arzneimittel nicht gefunden',
    loadFailed: 'Daten konnten nicht geladen werden',
    requiredFields: 'Bitte mindestens Name, Stärke, Dosis und Häufigkeit eingeben',
    saveFailed: 'Speichern fehlgeschlagen',
    saved: 'Arzneimittel aktualisiert',
    drugName: 'Arzneimittelname',
    strength: 'Stärke mg/IU/ml oder Tablette',
    dose: 'Dosis mg/IU/kg/Tag',
    times: 'Gaben / Tag',
    days: 'Dauer Tage',
    packageSize: 'Packung ml/Stk.',
    note: 'Hinweis / Anleitung',
    indications: 'Indikationen',
    noIndications: 'Keine Indikationen.',
    selected: 'Ausgewählt',
    saveChanges: 'Änderungen speichern',
  },
} as const;

export default function EditPedsDrugPage({ params }: { params: { id: string } }) {
  const { language } = useI18n();
  const c = getLocalizedVariant(copy, language) ?? copy.en;
  const drugId = Number(params.id);
  const [indications, setIndications] = useState<PedsIndication[]>([]);
  const [form, setForm] = useState<DrugFormState>(emptyForm);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isValidId = Number.isInteger(drugId) && drugId > 0;

  const selectedIndicationNames = useMemo(() => {
    return indications.filter((item) => form.indicationIds.includes(item.id)).map((item) => item.name).join(', ');
  }, [form.indicationIds, indications]);

  const loadData = async () => {
    if (!isValidId) {
      setError(c.invalidId);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [indicationResponse, drugResponse] = await Promise.all([fetch('/api/peds/indications'), fetch('/api/peds/drugs')]);
      if (!indicationResponse.ok) throw new Error(c.indicationsLoadFailed);
      if (!drugResponse.ok) throw new Error(c.drugsLoadFailed);
      const indicationData = await indicationResponse.json();
      const drugData = await drugResponse.json();
      const loadedIndications: PedsIndication[] = indicationData.indications ?? [];
      const drugs: PedsDrug[] = drugData.drugs ?? [];
      const drug = drugs.find((item) => item.id === drugId);
      if (!drug) throw new Error(c.notFound);
      setIndications(loadedIndications);
      setForm({
        name: drug.name,
        form: drug.form,
        unit: drug.unit,
        strength: String(drug.strength),
        dosePerKgDay: String(drug.dosePerKgDay),
        timesPerDay: String(drug.timesPerDay),
        defaultDays: drug.defaultDays ? String(drug.defaultDays) : '',
        packageSize: drug.packageSize ? String(drug.packageSize) : '',
        note: drug.note ?? '',
        indicationIds: drug.indications.map((item) => item.id),
      });
    } catch (err: any) {
      setError(err?.message ?? c.loadFailed);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const toggleIndication = (id: number) => {
    setForm((prev) => {
      const exists = prev.indicationIds.includes(id);
      return { ...prev, indicationIds: exists ? prev.indicationIds.filter((item) => item !== id) : [...prev.indicationIds, id] };
    });
  };

  const saveDrug = async () => {
    const payload = {
      name: form.name.trim(),
      form: form.form,
      unit: form.unit,
      strength: Number(form.strength),
      dosePerKgDay: Number(form.dosePerKgDay),
      timesPerDay: Number(form.timesPerDay),
      defaultDays: form.defaultDays ? Number(form.defaultDays) : null,
      packageSize: form.packageSize ? Number(form.packageSize) : null,
      note: form.note.trim() || null,
      indicationIds: form.indicationIds,
    };
    if (!payload.name || !payload.strength || !payload.dosePerKgDay || !payload.timesPerDay) {
      setError(c.requiredFields);
      return;
    }
    setIsLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/peds/drugs?id=${drugId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? c.saveFailed);
      }
      setMessage(c.saved);
      setTimeout(() => setMessage(null), 2200);
    } catch (err: any) {
      setError(err?.message ?? c.saveFailed);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-[900px] mx-auto space-y-5 pb-10 text-slate-900 p-2 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Link href="/calculators/peds-library" className="text-xs font-bold text-blue-600 hover:text-blue-700">{c.back}</Link>
          <h1 className="mt-2 text-2xl font-black text-slate-800">{c.title}</h1>
          <p className="text-sm text-slate-500 mt-1">{c.subtitle}</p>
        </div>
        <button onClick={loadData} disabled={isLoading} className="px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> {c.refresh}
        </button>
      </div>
      {message && <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-sm font-bold text-emerald-700 flex items-center gap-2"><CheckCircle2 size={16} /> {message}</div>}
      {error && <div className="p-3 bg-red-50 border border-red-100 rounded-2xl text-sm font-bold text-red-700">{error}</div>}
      <section className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder={c.drugName} className="sm:col-span-2 p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:bg-white" />
          <select value={form.form} onChange={(event) => setForm({ ...form, form: event.target.value as DrugFormState['form'] })} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:bg-white"><option value="LIQUID">Neste</option><option value="TABLET">Tabletti</option></select>
          <select value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value as DrugFormState['unit'] })} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:bg-white"><option value="MG">mg</option><option value="IU">IU</option></select>
          <input type="number" value={form.strength} onChange={(event) => setForm({ ...form, strength: event.target.value })} placeholder={c.strength} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:bg-white" />
          <input type="number" value={form.dosePerKgDay} onChange={(event) => setForm({ ...form, dosePerKgDay: event.target.value })} placeholder={c.dose} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:bg-white" />
          <input type="number" value={form.timesPerDay} onChange={(event) => setForm({ ...form, timesPerDay: event.target.value })} placeholder={c.times} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:bg-white" />
          <input type="number" value={form.defaultDays} onChange={(event) => setForm({ ...form, defaultDays: event.target.value })} placeholder={c.days} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:bg-white" />
          <input type="number" value={form.packageSize} onChange={(event) => setForm({ ...form, packageSize: event.target.value })} placeholder={c.packageSize} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:bg-white" />
          <textarea value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder={c.note} className="sm:col-span-2 min-h-[100px] p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:bg-white resize-none" />
        </div>
        <div className="space-y-2">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{c.indications}</div>
          <div className="flex flex-wrap gap-2">
            {indications.length === 0 ? <span className="text-xs text-slate-400 font-bold">{c.noIndications}</span> : indications.map((item) => <button key={item.id} onClick={() => toggleIndication(item.id)} className={`px-3 py-2 rounded-xl text-[11px] font-black border transition-all ${form.indicationIds.includes(item.id) ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-slate-50 text-slate-500 border-slate-100 hover:border-blue-200'}`}>{item.name}</button>)}
          </div>
          {selectedIndicationNames && <p className="text-xs text-slate-500 font-bold">{c.selected}: {selectedIndicationNames}</p>}
        </div>
        <button onClick={saveDrug} disabled={isLoading} className="w-full py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase hover:bg-blue-700 disabled:bg-slate-200 transition-all flex items-center justify-center gap-2"><Save size={16} /> {c.saveChanges}</button>
      </section>
    </div>
  );
}
