"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Baby, CheckCircle2, FlaskConical, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { getLocalizedVariant } from '../../../lib/i18n';
import { useI18n } from '../../../lib/useI18n';

type PcaDrug = { id: number; name: string; strength: number };
type PedsIndication = { id: number; name: string; _count?: { drugs: number } };
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

const emptyDrugForm: DrugFormState = {
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
    back: '← Takaisin laskureihin',
    title: 'Lääkekirjastot',
    subtitle: 'Hallitse PCA-laskurin ja painoperusteisen annoslaskurin omia lääkekirjastoja. Laskentalogiikkaa ei muuteta tällä sivulla.',
    refresh: 'Päivitä',
    allIndications: 'Kaikki indikaatiot',
    selectedIndication: 'Valittu indikaatio',
    loadFailed: 'Lataus epäonnistui',
    pcaLoadFailed: 'PCA-lääkkeiden lataus epäonnistui',
    indicationsLoadFailed: 'Indikaatioiden lataus epäonnistui',
    drugsLoadFailed: 'Lääkkeiden lataus epäonnistui',
    pcaTitle: 'PCA-lääkekirjasto',
    pcaSubtitle: 'Nämä lääkkeet näkyvät PCA-laskurin lääkevalikossa.',
    pcaNamePlaceholder: 'Lääkkeen nimi, esim. Morfiini',
    addPcaTitle: 'Lisää PCA-lääke',
    pcaRequired: 'Täytä PCA-lääkkeen nimi ja vahvuus mg/ml',
    pcaSaveFailed: 'PCA-lääkkeen tallennus epäonnistui',
    pcaSaved: 'PCA-lääke tallennettu',
    pcaDeleteFailed: 'PCA-lääkkeen poisto epäonnistui',
    pcaDeleted: 'PCA-lääke poistettu',
    noPcaDrugs: 'Ei vielä PCA-lääkkeitä.',
    pedsIndicationsTitle: 'Annoslaskurin käyttöaiheet / sairaudet',
    pedsIndicationsSubtitle: 'Luo oma ryhmä, esimerkiksi Korvatulehdus, Tonsilliitti tai Ihoinfektio.',
    newIndication: 'Uusi indikaatio',
    addIndicationTitle: 'Lisää indikaatio',
    indicationCreateFailed: 'Indikaation luonti epäonnistui',
    indicationSaved: 'Indikaatio tallennettu',
    indicationDeleteFailed: 'Indikaation poisto epäonnistui',
    indicationDeleted: 'Indikaatio poistettu',
    noIndications: 'Ei vielä indikaatioita.',
    drugCount: 'lääkettä',
    addDrugTitle: 'Lisää annoslaskurin lääke',
    addDrugSubtitle: 'Tallenna oletusannos. Kaikki arvot ovat myöhemmin muokattavissa laskurissa.',
    drugName: 'Lääkkeen nimi',
    strength: 'Vahvuus mg/IU/ml tai tab',
    dose: 'Annos mg/IU/kg/vrk',
    times: 'Antokerrat / vrk',
    days: 'Kesto pv',
    packageSize: 'Pakkaus ml/kpl',
    note: 'Huomio / ohje',
    indications: 'Indikaatiot',
    createIndicationFirst: 'Luo ensin indikaatio.',
    savePedsDrug: 'Tallenna annoslaskurin lääke',
    drugRequired: 'Täytä ainakin nimi, vahvuus, annos ja antokerrat',
    drugSaveFailed: 'Lääkkeen tallennus epäonnistui',
    drugSaved: 'Lääke tallennettu',
    drugDeleteFailed: 'Lääkkeen poisto epäonnistui',
    drugDeleted: 'Lääke poistettu',
    savedDrugsTitle: 'Tallennetut annoslaskurin lääkkeet',
    showing: 'Näytetään',
    noSavedDrugs: 'Ei tallennettuja lääkkeitä tällä rajauksella.',
    edit: 'Muokkaa',
    deleteDrugTitle: 'Poista lääke',
    strengthLabel: 'Vahvuus',
    doseLabel: 'Annos',
    timesLabel: 'Antokerrat',
    daysLabel: 'Kesto',
  },
  ru: {
    back: '← Назад к калькуляторам',
    title: 'Библиотеки препаратов',
    subtitle: 'Управление собственными библиотеками препаратов для PCA и калькулятора дозировок по весу. Логика расчётов на этой странице не меняется.',
    refresh: 'Обновить',
    allIndications: 'Все показания',
    selectedIndication: 'Выбранное показание',
    loadFailed: 'Не удалось загрузить данные',
    pcaLoadFailed: 'Не удалось загрузить PCA-препараты',
    indicationsLoadFailed: 'Не удалось загрузить показания',
    drugsLoadFailed: 'Не удалось загрузить препараты',
    pcaTitle: 'Библиотека PCA-препаратов',
    pcaSubtitle: 'Эти препараты отображаются в списке препаратов PCA-калькулятора.',
    pcaNamePlaceholder: 'Название препарата, например Morfiini',
    addPcaTitle: 'Добавить PCA-препарат',
    pcaRequired: 'Заполните название PCA-препарата и концентрацию mg/ml',
    pcaSaveFailed: 'Не удалось сохранить PCA-препарат',
    pcaSaved: 'PCA-препарат сохранён',
    pcaDeleteFailed: 'Не удалось удалить PCA-препарат',
    pcaDeleted: 'PCA-препарат удалён',
    noPcaDrugs: 'PCA-препаратов пока нет.',
    pedsIndicationsTitle: 'Показания / заболевания для калькулятора дозировок',
    pedsIndicationsSubtitle: 'Создайте собственную группу, например Korvatulehdus, Tonsilliitti или Ihoinfektio.',
    newIndication: 'Новое показание',
    addIndicationTitle: 'Добавить показание',
    indicationCreateFailed: 'Не удалось создать показание',
    indicationSaved: 'Показание сохранено',
    indicationDeleteFailed: 'Не удалось удалить показание',
    indicationDeleted: 'Показание удалено',
    noIndications: 'Показаний пока нет.',
    drugCount: 'препаратов',
    addDrugTitle: 'Добавить препарат для калькулятора дозировок',
    addDrugSubtitle: 'Сохраните дозу по умолчанию. Все значения позже можно изменить в калькуляторе.',
    drugName: 'Название препарата',
    strength: 'Концентрация mg/IU/ml или tab',
    dose: 'Доза mg/IU/kg/vrk',
    times: 'Приёмов / vrk',
    days: 'Длительность pv',
    packageSize: 'Упаковка ml/kpl',
    note: 'Примечание / инструкция',
    indications: 'Показания',
    createIndicationFirst: 'Сначала создайте показание.',
    savePedsDrug: 'Сохранить препарат для калькулятора дозировок',
    drugRequired: 'Заполните как минимум название, концентрацию, дозу и количество приёмов',
    drugSaveFailed: 'Не удалось сохранить препарат',
    drugSaved: 'Препарат сохранён',
    drugDeleteFailed: 'Не удалось удалить препарат',
    drugDeleted: 'Препарат удалён',
    savedDrugsTitle: 'Сохранённые препараты для калькулятора дозировок',
    showing: 'Показано',
    noSavedDrugs: 'Для этого фильтра сохранённых препаратов нет.',
    edit: 'Редактировать',
    deleteDrugTitle: 'Удалить препарат',
    strengthLabel: 'Концентрация',
    doseLabel: 'Доза',
    timesLabel: 'Приёмы',
    daysLabel: 'Длительность',
  },
  en: {
    back: '← Back to calculators',
    title: 'Drug libraries',
    subtitle: 'Manage your own drug libraries for PCA and the weight-based dose calculator. Calculator logic is not changed on this page.',
    refresh: 'Refresh',
    allIndications: 'All indications',
    selectedIndication: 'Selected indication',
    loadFailed: 'Could not load data',
    pcaLoadFailed: 'Could not load PCA drugs',
    indicationsLoadFailed: 'Could not load indications',
    drugsLoadFailed: 'Could not load drugs',
    pcaTitle: 'PCA drug library',
    pcaSubtitle: 'These drugs are shown in the PCA calculator drug menu.',
    pcaNamePlaceholder: 'Drug name, e.g. Morfiini',
    addPcaTitle: 'Add PCA drug',
    pcaRequired: 'Fill in PCA drug name and strength mg/ml',
    pcaSaveFailed: 'Could not save PCA drug',
    pcaSaved: 'PCA drug saved',
    pcaDeleteFailed: 'Could not delete PCA drug',
    pcaDeleted: 'PCA drug deleted',
    noPcaDrugs: 'No PCA drugs yet.',
    pedsIndicationsTitle: 'Dose-calculator indications / diseases',
    pedsIndicationsSubtitle: 'Create your own group, for example Korvatulehdus, Tonsilliitti or Ihoinfektio.',
    newIndication: 'New indication',
    addIndicationTitle: 'Add indication',
    indicationCreateFailed: 'Could not create indication',
    indicationSaved: 'Indication saved',
    indicationDeleteFailed: 'Could not delete indication',
    indicationDeleted: 'Indication deleted',
    noIndications: 'No indications yet.',
    drugCount: 'drugs',
    addDrugTitle: 'Add dose-calculator drug',
    addDrugSubtitle: 'Save the default dose. All values can later be edited in the calculator.',
    drugName: 'Drug name',
    strength: 'Strength mg/IU/ml or tab',
    dose: 'Dose mg/IU/kg/day',
    times: 'Doses / day',
    days: 'Duration days',
    packageSize: 'Package ml/pcs',
    note: 'Note / instruction',
    indications: 'Indications',
    createIndicationFirst: 'Create an indication first.',
    savePedsDrug: 'Save dose-calculator drug',
    drugRequired: 'Fill in at least name, strength, dose and dosing frequency',
    drugSaveFailed: 'Could not save drug',
    drugSaved: 'Drug saved',
    drugDeleteFailed: 'Could not delete drug',
    drugDeleted: 'Drug deleted',
    savedDrugsTitle: 'Saved dose-calculator drugs',
    showing: 'Showing',
    noSavedDrugs: 'No saved drugs with this filter.',
    edit: 'Edit',
    deleteDrugTitle: 'Delete drug',
    strengthLabel: 'Strength',
    doseLabel: 'Dose',
    timesLabel: 'Doses',
    daysLabel: 'Duration',
  },
  de: {
    back: '← Zurück zu den Rechnern',
    title: 'Arzneibibliotheken',
    subtitle: 'Eigene Arzneibibliotheken für den PCA-Rechner und den gewichtsbezogenen Dosisrechner verwalten. Die Rechenlogik der Rechner wird auf dieser Seite nicht verändert.',
    refresh: 'Aktualisieren',
    allIndications: 'Alle Indikationen',
    selectedIndication: 'Ausgewählte Indikation',
    loadFailed: 'Daten konnten nicht geladen werden',
    pcaLoadFailed: 'PCA-Arzneimittel konnten nicht geladen werden',
    indicationsLoadFailed: 'Indikationen konnten nicht geladen werden',
    drugsLoadFailed: 'Arzneimittel konnten nicht geladen werden',
    pcaTitle: 'PCA-Arzneibibliothek',
    pcaSubtitle: 'Diese Arzneimittel werden im Arzneimittelmenü des PCA-Rechners angezeigt.',
    pcaNamePlaceholder: 'Arzneimittelname, z. B. Morfiini',
    addPcaTitle: 'PCA-Arzneimittel hinzufügen',
    pcaRequired: 'Bitte Name und Stärke des PCA-Arzneimittels in mg/ml eingeben',
    pcaSaveFailed: 'PCA-Arzneimittel konnte nicht gespeichert werden',
    pcaSaved: 'PCA-Arzneimittel gespeichert',
    pcaDeleteFailed: 'PCA-Arzneimittel konnte nicht gelöscht werden',
    pcaDeleted: 'PCA-Arzneimittel gelöscht',
    noPcaDrugs: 'Noch keine PCA-Arzneimittel.',
    pedsIndicationsTitle: 'Indikationen / Krankheiten des Dosisrechners',
    pedsIndicationsSubtitle: 'Eine eigene Gruppe anlegen, zum Beispiel Korvatulehdus, Tonsilliitti oder Ihoinfektio.',
    newIndication: 'Neue Indikation',
    addIndicationTitle: 'Indikation hinzufügen',
    indicationCreateFailed: 'Indikation konnte nicht erstellt werden',
    indicationSaved: 'Indikation gespeichert',
    indicationDeleteFailed: 'Indikation konnte nicht gelöscht werden',
    indicationDeleted: 'Indikation gelöscht',
    noIndications: 'Noch keine Indikationen.',
    drugCount: 'Arzneimittel',
    addDrugTitle: 'Arznei für den Dosisrechner hinzufügen',
    addDrugSubtitle: 'Standarddosis speichern. Alle Werte können später im Rechner geändert werden.',
    drugName: 'Arzneimittelname',
    strength: 'Stärke mg/IU/ml oder Tablette',
    dose: 'Dosis mg/IU/kg/Tag',
    times: 'Gaben / Tag',
    days: 'Dauer Tage',
    packageSize: 'Packung ml/Stk.',
    note: 'Hinweis / Anleitung',
    indications: 'Indikationen',
    createIndicationFirst: 'Bitte zuerst eine Indikation anlegen.',
    savePedsDrug: 'Arznei für den Dosisrechner speichern',
    drugRequired: 'Bitte mindestens Name, Stärke, Dosis und Häufigkeit eingeben',
    drugSaveFailed: 'Arzneimittel konnte nicht gespeichert werden',
    drugSaved: 'Arzneimittel gespeichert',
    drugDeleteFailed: 'Arzneimittel konnte nicht gelöscht werden',
    drugDeleted: 'Arzneimittel gelöscht',
    savedDrugsTitle: 'Gespeicherte Arzneien des Dosisrechners',
    showing: 'Angezeigt',
    noSavedDrugs: 'Für diesen Filter sind keine Arzneimittel gespeichert.',
    edit: 'Bearbeiten',
    deleteDrugTitle: 'Arzneimittel löschen',
    strengthLabel: 'Stärke',
    doseLabel: 'Dosis',
    timesLabel: 'Gaben',
    daysLabel: 'Dauer',
  },
} as const;

export default function PedsLibraryPage() {
  const { language } = useI18n();
  const c = getLocalizedVariant(copy, language) ?? copy.en;
  const [pcaDrugs, setPcaDrugs] = useState<PcaDrug[]>([]);
  const [newPcaDrug, setNewPcaDrug] = useState({ name: '', strength: '' });
  const [indications, setIndications] = useState<PedsIndication[]>([]);
  const [drugs, setDrugs] = useState<PedsDrug[]>([]);
  const [selectedIndicationId, setSelectedIndicationId] = useState<string>('all');
  const [newIndicationName, setNewIndicationName] = useState('');
  const [drugForm, setDrugForm] = useState<DrugFormState>(emptyDrugForm);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedIndicationName = useMemo(() => {
    if (selectedIndicationId === 'all') return c.allIndications;
    return indications.find((item) => item.id === Number(selectedIndicationId))?.name ?? c.selectedIndication;
  }, [c.allIndications, c.selectedIndication, indications, selectedIndicationId]);

  const loadPcaDrugs = async () => {
    const response = await fetch('/api/pca-library');
    if (!response.ok) throw new Error(c.pcaLoadFailed);
    const data = await response.json();
    setPcaDrugs(Array.isArray(data) ? data : []);
  };

  const loadIndications = async () => {
    const response = await fetch('/api/peds/indications');
    if (!response.ok) throw new Error(c.indicationsLoadFailed);
    const data = await response.json();
    setIndications(data.indications ?? []);
  };

  const loadDrugs = async (indicationId = selectedIndicationId) => {
    const query = indicationId !== 'all' ? `?indicationId=${encodeURIComponent(indicationId)}` : '';
    const response = await fetch(`/api/peds/drugs${query}`);
    if (!response.ok) throw new Error(c.drugsLoadFailed);
    const data = await response.json();
    setDrugs(data.drugs ?? []);
  };

  const refreshAll = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await Promise.all([loadPcaDrugs(), loadIndications(), loadDrugs()]);
    } catch (err: any) {
      setError(err?.message ?? c.loadFailed);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showMessage = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(null), 2200);
  };

  const createPcaDrug = async () => {
    const name = newPcaDrug.name.trim();
    const strength = Number(newPcaDrug.strength);
    if (!name || !Number.isFinite(strength) || strength <= 0) {
      setError(c.pcaRequired);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/pca-library', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, strength }) });
      if (!response.ok) throw new Error(c.pcaSaveFailed);
      setNewPcaDrug({ name: '', strength: '' });
      await loadPcaDrugs();
      showMessage(c.pcaSaved);
    } catch (err: any) {
      setError(err?.message ?? c.pcaSaveFailed);
    } finally {
      setIsLoading(false);
    }
  };

  const deletePcaDrug = async (id: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/pca-library?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(c.pcaDeleteFailed);
      await loadPcaDrugs();
      showMessage(c.pcaDeleted);
    } catch (err: any) {
      setError(err?.message ?? c.pcaDeleteFailed);
    } finally {
      setIsLoading(false);
    }
  };

  const createIndication = async () => {
    const name = newIndicationName.trim();
    if (!name) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/peds/indications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
      if (!response.ok) throw new Error(c.indicationCreateFailed);
      setNewIndicationName('');
      await loadIndications();
      showMessage(c.indicationSaved);
    } catch (err: any) {
      setError(err?.message ?? c.indicationCreateFailed);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteIndication = async (id: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/peds/indications?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(c.indicationDeleteFailed);
      if (selectedIndicationId === String(id)) setSelectedIndicationId('all');
      await loadIndications();
      await loadDrugs('all');
      showMessage(c.indicationDeleted);
    } catch (err: any) {
      setError(err?.message ?? c.indicationDeleteFailed);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDrugIndication = (id: number) => {
    setDrugForm((prev) => {
      const exists = prev.indicationIds.includes(id);
      return { ...prev, indicationIds: exists ? prev.indicationIds.filter((item) => item !== id) : [...prev.indicationIds, id] };
    });
  };

  const createDrug = async () => {
    const payload = {
      name: drugForm.name.trim(), form: drugForm.form, unit: drugForm.unit,
      strength: Number(drugForm.strength), dosePerKgDay: Number(drugForm.dosePerKgDay), timesPerDay: Number(drugForm.timesPerDay),
      defaultDays: drugForm.defaultDays ? Number(drugForm.defaultDays) : null,
      packageSize: drugForm.packageSize ? Number(drugForm.packageSize) : null,
      note: drugForm.note.trim() || null, indicationIds: drugForm.indicationIds,
    };
    if (!payload.name || !payload.strength || !payload.dosePerKgDay || !payload.timesPerDay) {
      setError(c.drugRequired);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/peds/drugs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? c.drugSaveFailed);
      }
      setDrugForm(emptyDrugForm);
      await loadIndications();
      await loadDrugs();
      showMessage(c.drugSaved);
    } catch (err: any) {
      setError(err?.message ?? c.drugSaveFailed);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteDrug = async (id: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/peds/drugs?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(c.drugDeleteFailed);
      await loadIndications();
      await loadDrugs();
      showMessage(c.drugDeleted);
    } catch (err: any) {
      setError(err?.message ?? c.drugDeleteFailed);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = async (value: string) => {
    setSelectedIndicationId(value);
    setIsLoading(true);
    setError(null);
    try { await loadDrugs(value); } catch (err: any) { setError(err?.message ?? c.drugsLoadFailed); } finally { setIsLoading(false); }
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-5 pb-10 text-slate-900 p-2 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Link href="/calculators" className="text-xs font-bold text-blue-600 hover:text-blue-700">{c.back}</Link>
          <h1 className="mt-2 text-2xl font-black text-slate-800 flex items-center gap-2"><FlaskConical className="text-blue-600" size={26} /> {c.title}</h1>
          <p className="text-sm text-slate-500 mt-1">{c.subtitle}</p>
        </div>
        <button onClick={refreshAll} disabled={isLoading} className="px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> {c.refresh}
        </button>
      </div>

      {message && <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-sm font-bold text-emerald-700 flex items-center gap-2"><CheckCircle2 size={16} /> {message}</div>}
      {error && <div className="p-3 bg-red-50 border border-red-100 rounded-2xl text-sm font-bold text-red-700">{error}</div>}

      <section className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex items-start gap-3"><div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shrink-0"><FlaskConical size={20} /></div><div><h2 className="text-lg font-black text-slate-800">{c.pcaTitle}</h2><p className="text-xs text-slate-500 mt-1">{c.pcaSubtitle}</p></div></div>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_auto] gap-2">
          <input value={newPcaDrug.name} onChange={(event) => setNewPcaDrug({ ...newPcaDrug, name: event.target.value })} onKeyDown={(event) => event.key === 'Enter' && createPcaDrug()} placeholder={c.pcaNamePlaceholder} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:bg-white" />
          <input type="number" value={newPcaDrug.strength} onChange={(event) => setNewPcaDrug({ ...newPcaDrug, strength: event.target.value })} onKeyDown={(event) => event.key === 'Enter' && createPcaDrug()} placeholder="mg/ml" className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:bg-white" />
          <button onClick={createPcaDrug} disabled={isLoading || !newPcaDrug.name.trim() || !newPcaDrug.strength} className="px-4 py-3 bg-blue-600 text-white rounded-2xl disabled:bg-slate-200 transition-all flex items-center justify-center" title={c.addPcaTitle}><Plus size={18} /></button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {pcaDrugs.length === 0 ? <div className="md:col-span-2 xl:col-span-3 p-5 bg-slate-50 rounded-2xl text-sm text-slate-400 font-bold text-center">{c.noPcaDrugs}</div> : pcaDrugs.map((drug) => <div key={drug.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-3"><div><div className="text-sm font-black text-slate-800">{drug.name}</div><div className="text-[11px] font-bold text-slate-500">{drug.strength} mg/ml</div></div><button onClick={() => deletePcaDrug(drug.id)} disabled={isLoading} className="p-2 text-slate-300 hover:text-red-500 transition-colors" title={c.pcaDeleteFailed}><Trash2 size={15} /></button></div>)}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 space-y-5">
          <div><h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><Baby size={20} className="text-blue-600" /> {c.pedsIndicationsTitle}</h2><p className="text-xs text-slate-500 mt-1">{c.pedsIndicationsSubtitle}</p></div>
          <div className="flex gap-2"><input value={newIndicationName} onChange={(event) => setNewIndicationName(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && createIndication()} placeholder={c.newIndication} className="flex-1 p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:bg-white" /><button onClick={createIndication} disabled={isLoading || !newIndicationName.trim()} className="px-4 bg-blue-600 text-white rounded-2xl disabled:bg-slate-200 transition-all" title={c.addIndicationTitle}><Plus size={18} /></button></div>
          <div className="space-y-2 max-h-[360px] overflow-y-auto no-scrollbar">{indications.length === 0 ? <div className="p-4 bg-slate-50 rounded-2xl text-sm text-slate-400 font-bold text-center">{c.noIndications}</div> : indications.map((item) => <div key={item.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-3"><div><div className="text-sm font-black text-slate-800">{item.name}</div><div className="text-[10px] font-bold text-slate-400 uppercase">{item._count?.drugs ?? 0} {c.drugCount}</div></div><button onClick={() => deleteIndication(item.id)} disabled={isLoading} className="p-2 text-slate-300 hover:text-red-500 transition-colors" title={c.indicationDeleteFailed}><Trash2 size={15} /></button></div>)}</div>
        </section>

        <section className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 space-y-5">
          <div><h2 className="text-lg font-black text-slate-800">{c.addDrugTitle}</h2><p className="text-xs text-slate-500 mt-1">{c.addDrugSubtitle}</p></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={drugForm.name} onChange={(event) => setDrugForm({ ...drugForm, name: event.target.value })} placeholder={c.drugName} className="sm:col-span-2 p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:bg-white" />
            <select value={drugForm.form} onChange={(event) => setDrugForm({ ...drugForm, form: event.target.value as DrugFormState['form'] })} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:bg-white"><option value="LIQUID">Neste</option><option value="TABLET">Tabletti</option></select>
            <select value={drugForm.unit} onChange={(event) => setDrugForm({ ...drugForm, unit: event.target.value as DrugFormState['unit'] })} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:bg-white"><option value="MG">mg</option><option value="IU">IU</option></select>
            <input type="number" value={drugForm.strength} onChange={(event) => setDrugForm({ ...drugForm, strength: event.target.value })} placeholder={c.strength} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:bg-white" />
            <input type="number" value={drugForm.dosePerKgDay} onChange={(event) => setDrugForm({ ...drugForm, dosePerKgDay: event.target.value })} placeholder={c.dose} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:bg-white" />
            <input type="number" value={drugForm.timesPerDay} onChange={(event) => setDrugForm({ ...drugForm, timesPerDay: event.target.value })} placeholder={c.times} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:bg-white" />
            <input type="number" value={drugForm.defaultDays} onChange={(event) => setDrugForm({ ...drugForm, defaultDays: event.target.value })} placeholder={c.days} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:bg-white" />
            <input type="number" value={drugForm.packageSize} onChange={(event) => setDrugForm({ ...drugForm, packageSize: event.target.value })} placeholder={c.packageSize} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:bg-white" />
            <textarea value={drugForm.note} onChange={(event) => setDrugForm({ ...drugForm, note: event.target.value })} placeholder={c.note} className="sm:col-span-2 min-h-[80px] p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:bg-white resize-none" />
          </div>
          <div className="space-y-2"><div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{c.indications}</div><div className="flex flex-wrap gap-2">{indications.length === 0 ? <span className="text-xs text-slate-400 font-bold">{c.createIndicationFirst}</span> : indications.map((item) => <button key={item.id} onClick={() => toggleDrugIndication(item.id)} className={`px-3 py-2 rounded-xl text-[11px] font-black border transition-all ${drugForm.indicationIds.includes(item.id) ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-slate-50 text-slate-500 border-slate-100 hover:border-blue-200'}`}>{item.name}</button>)}</div></div>
          <button onClick={createDrug} disabled={isLoading} className="w-full py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase hover:bg-blue-700 disabled:bg-slate-200 transition-all flex items-center justify-center gap-2"><Plus size={16} /> {c.savePedsDrug}</button>
        </section>
      </div>

      <section className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><div><h2 className="text-lg font-black text-slate-800">{c.savedDrugsTitle}</h2><p className="text-xs text-slate-500 mt-1">{c.showing}: {selectedIndicationName}</p></div><select value={selectedIndicationId} onChange={(event) => handleFilterChange(event.target.value)} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:bg-white"><option value="all">{c.allIndications}</option>{indications.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {drugs.length === 0 ? <div className="md:col-span-2 xl:col-span-3 p-6 bg-slate-50 rounded-2xl text-sm text-slate-400 font-bold text-center">{c.noSavedDrugs}</div> : drugs.map((drug) => <div key={drug.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3"><div className="flex items-start justify-between gap-3"><div><div className="text-sm font-black text-slate-800">{drug.name}</div><div className="text-[10px] font-black text-blue-600 uppercase">{drug.form === 'LIQUID' ? 'Neste' : 'Tabletti'} · {drug.unit.toLowerCase()}</div></div><div className="flex items-center gap-1"><Link href={`/calculators/peds-library/${drug.id}`} className="px-3 py-2 bg-white border border-slate-100 rounded-xl text-[10px] font-black uppercase text-blue-600 hover:bg-blue-50 transition-all">{c.edit}</Link><button onClick={() => deleteDrug(drug.id)} disabled={isLoading} className="p-2 text-slate-300 hover:text-red-500 transition-colors" title={c.deleteDrugTitle}><Trash2 size={15} /></button></div></div><div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-500"><div className="p-2 bg-white rounded-xl">{c.strengthLabel}<br/><span className="text-slate-900">{drug.strength} {drug.unit.toLowerCase()}/{drug.form === 'LIQUID' ? 'ml' : 'tab'}</span></div><div className="p-2 bg-white rounded-xl">{c.doseLabel}<br/><span className="text-slate-900">{drug.dosePerKgDay} {drug.unit.toLowerCase()}/kg/vrk</span></div><div className="p-2 bg-white rounded-xl">{c.timesLabel}<br/><span className="text-slate-900">{drug.timesPerDay}x/vrk</span></div><div className="p-2 bg-white rounded-xl">{c.daysLabel}<br/><span className="text-slate-900">{drug.defaultDays ?? '—'} pv</span></div></div>{drug.indications.length > 0 && <div className="flex flex-wrap gap-1">{drug.indications.map((item) => <span key={item.id} className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-black">{item.name}</span>)}</div>}{drug.note && <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{drug.note}</p>}</div>)}
        </div>
      </section>
    </div>
  );
}
