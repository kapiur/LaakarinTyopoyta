"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Baby, CheckCircle2, FlaskConical, Plus, RefreshCw, Trash2 } from 'lucide-react';

type PcaDrug = {
  id: number;
  name: string;
  strength: number;
};

type PedsIndication = {
  id: number;
  name: string;
  _count?: { drugs: number };
};

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

export default function PedsLibraryPage() {
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
    if (selectedIndicationId === 'all') return 'Kaikki indikaatiot';
    return indications.find((item) => item.id === Number(selectedIndicationId))?.name ?? 'Valittu indikaatio';
  }, [indications, selectedIndicationId]);

  const loadPcaDrugs = async () => {
    const response = await fetch('/api/pca-library');
    if (!response.ok) throw new Error('PCA-lääkkeiden lataus epäonnistui');
    const data = await response.json();
    setPcaDrugs(Array.isArray(data) ? data : []);
  };

  const loadIndications = async () => {
    const response = await fetch('/api/peds/indications');
    if (!response.ok) throw new Error('Indikaatioiden lataus epäonnistui');
    const data = await response.json();
    setIndications(data.indications ?? []);
  };

  const loadDrugs = async (indicationId = selectedIndicationId) => {
    const query = indicationId !== 'all' ? `?indicationId=${encodeURIComponent(indicationId)}` : '';
    const response = await fetch(`/api/peds/drugs${query}`);
    if (!response.ok) throw new Error('Lääkkeiden lataus epäonnistui');
    const data = await response.json();
    setDrugs(data.drugs ?? []);
  };

  const refreshAll = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await Promise.all([
        loadPcaDrugs(),
        loadIndications(),
        loadDrugs(),
      ]);
    } catch (err: any) {
      setError(err?.message ?? 'Lataus epäonnistui');
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
      setError('Täytä PCA-lääkkeen nimi ja vahvuus mg/ml');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/pca-library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, strength }),
      });

      if (!response.ok) throw new Error('PCA-lääkkeen tallennus epäonnistui');
      setNewPcaDrug({ name: '', strength: '' });
      await loadPcaDrugs();
      showMessage('PCA-lääke tallennettu');
    } catch (err: any) {
      setError(err?.message ?? 'PCA-lääkkeen tallennus epäonnistui');
    } finally {
      setIsLoading(false);
    }
  };

  const deletePcaDrug = async (id: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/pca-library?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('PCA-lääkkeen poisto epäonnistui');
      await loadPcaDrugs();
      showMessage('PCA-lääke poistettu');
    } catch (err: any) {
      setError(err?.message ?? 'PCA-lääkkeen poisto epäonnistui');
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
      const response = await fetch('/api/peds/indications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) throw new Error('Indikaation luonti epäonnistui');
      setNewIndicationName('');
      await loadIndications();
      showMessage('Indikaatio tallennettu');
    } catch (err: any) {
      setError(err?.message ?? 'Indikaation luonti epäonnistui');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteIndication = async (id: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/peds/indications?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Indikaation poisto epäonnistui');
      if (selectedIndicationId === String(id)) setSelectedIndicationId('all');
      await loadIndications();
      await loadDrugs('all');
      showMessage('Indikaatio poistettu');
    } catch (err: any) {
      setError(err?.message ?? 'Indikaation poisto epäonnistui');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDrugIndication = (id: number) => {
    setDrugForm((prev) => {
      const exists = prev.indicationIds.includes(id);
      return {
        ...prev,
        indicationIds: exists
          ? prev.indicationIds.filter((item) => item !== id)
          : [...prev.indicationIds, id],
      };
    });
  };

  const createDrug = async () => {
    const payload = {
      name: drugForm.name.trim(),
      form: drugForm.form,
      unit: drugForm.unit,
      strength: Number(drugForm.strength),
      dosePerKgDay: Number(drugForm.dosePerKgDay),
      timesPerDay: Number(drugForm.timesPerDay),
      defaultDays: drugForm.defaultDays ? Number(drugForm.defaultDays) : null,
      packageSize: drugForm.packageSize ? Number(drugForm.packageSize) : null,
      note: drugForm.note.trim() || null,
      indicationIds: drugForm.indicationIds,
    };

    if (!payload.name || !payload.strength || !payload.dosePerKgDay || !payload.timesPerDay) {
      setError('Täytä ainakin nimi, vahvuus, annos ja antokerrat');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/peds/drugs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? 'Lääkkeen tallennus epäonnistui');
      }

      setDrugForm(emptyDrugForm);
      await loadIndications();
      await loadDrugs();
      showMessage('Lääke tallennettu');
    } catch (err: any) {
      setError(err?.message ?? 'Lääkkeen tallennus epäonnistui');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteDrug = async (id: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/peds/drugs?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Lääkkeen poisto epäonnistui');
      await loadIndications();
      await loadDrugs();
      showMessage('Lääke poistettu');
    } catch (err: any) {
      setError(err?.message ?? 'Lääkkeen poisto epäonnistui');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = async (value: string) => {
    setSelectedIndicationId(value);
    setIsLoading(true);
    setError(null);
    try {
      await loadDrugs(value);
    } catch (err: any) {
      setError(err?.message ?? 'Lääkkeiden lataus epäonnistui');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-5 pb-10 text-slate-900 p-2 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Link href="/calculators" className="text-xs font-bold text-blue-600 hover:text-blue-700">
            ← Takaisin laskureihin
          </Link>
          <h1 className="mt-2 text-2xl font-black text-slate-800 flex items-center gap-2">
            <FlaskConical className="text-blue-600" size={26} /> Lääkekirjastot
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Hallitse PCA- ja PEDS-laskureiden omia lääkekirjastoja. Laskureiden laskentalogiikkaa ei muuteta tällä sivulla.
          </p>
        </div>
        <button
          onClick={refreshAll}
          disabled={isLoading}
          className="px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Päivitä
        </button>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-sm font-bold text-emerald-700 flex items-center gap-2">
          <CheckCircle2 size={16} /> {message}
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-2xl text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      <section className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
            <FlaskConical size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800">PCA-lääkekirjasto</h2>
            <p className="text-xs text-slate-500 mt-1">Nämä lääkkeet näkyvät PCA-laskurin lääkevalikossa.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_auto] gap-2">
          <input
            value={newPcaDrug.name}
            onChange={(event) => setNewPcaDrug({ ...newPcaDrug, name: event.target.value })}
            onKeyDown={(event) => event.key === 'Enter' && createPcaDrug()}
            placeholder="Lääkkeen nimi, esim. Morfiini"
            className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:bg-white"
          />
          <input
            type="number"
            value={newPcaDrug.strength}
            onChange={(event) => setNewPcaDrug({ ...newPcaDrug, strength: event.target.value })}
            onKeyDown={(event) => event.key === 'Enter' && createPcaDrug()}
            placeholder="mg/ml"
            className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:bg-white"
          />
          <button
            onClick={createPcaDrug}
            disabled={isLoading || !newPcaDrug.name.trim() || !newPcaDrug.strength}
            className="px-4 py-3 bg-blue-600 text-white rounded-2xl disabled:bg-slate-200 transition-all flex items-center justify-center"
            title="Lisää PCA-lääke"
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {pcaDrugs.length === 0 ? (
            <div className="md:col-span-2 xl:col-span-3 p-5 bg-slate-50 rounded-2xl text-sm text-slate-400 font-bold text-center">
              Ei vielä PCA-lääkkeitä.
            </div>
          ) : pcaDrugs.map((drug) => (
            <div key={drug.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-black text-slate-800">{drug.name}</div>
                <div className="text-[11px] font-bold text-slate-500">{drug.strength} mg/ml</div>
              </div>
              <button
                onClick={() => deletePcaDrug(drug.id)}
                disabled={isLoading}
                className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                title="Poista PCA-lääke"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 space-y-5">
          <div>
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><Baby size={20} className="text-blue-600" /> PEDS-indikaatiot / sairaudet</h2>
            <p className="text-xs text-slate-500 mt-1">Luo oma ryhmä, esimerkiksi Korvatulehdus, Tonsilliitti tai Ihoinfektio.</p>
          </div>

          <div className="flex gap-2">
            <input
              value={newIndicationName}
              onChange={(event) => setNewIndicationName(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && createIndication()}
              placeholder="Uusi indikaatio"
              className="flex-1 p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:bg-white"
            />
            <button
              onClick={createIndication}
              disabled={isLoading || !newIndicationName.trim()}
              className="px-4 bg-blue-600 text-white rounded-2xl disabled:bg-slate-200 transition-all"
              title="Lisää indikaatio"
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="space-y-2 max-h-[360px] overflow-y-auto no-scrollbar">
            {indications.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-2xl text-sm text-slate-400 font-bold text-center">
                Ei vielä indikaatioita.
              </div>
            ) : indications.map((item) => (
              <div key={item.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-slate-800">{item.name}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">{item._count?.drugs ?? 0} lääkettä</div>
                </div>
                <button
                  onClick={() => deleteIndication(item.id)}
                  disabled={isLoading}
                  className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                  title="Poista indikaatio"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 space-y-5">
          <div>
            <h2 className="text-lg font-black text-slate-800">Lisää PEDS-lääke</h2>
            <p className="text-xs text-slate-500 mt-1">Tallenna oletusannos. Kaikki arvot ovat myöhemmin muokattavissa laskurissa.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              value={drugForm.name}
              onChange={(event) => setDrugForm({ ...drugForm, name: event.target.value })}
              placeholder="Lääkkeen nimi"
              className="sm:col-span-2 p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:bg-white"
            />
            <select
              value={drugForm.form}
              onChange={(event) => setDrugForm({ ...drugForm, form: event.target.value as DrugFormState['form'] })}
              className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:bg-white"
            >
              <option value="LIQUID">Neste</option>
              <option value="TABLET">Tabletti</option>
            </select>
            <select
              value={drugForm.unit}
              onChange={(event) => setDrugForm({ ...drugForm, unit: event.target.value as DrugFormState['unit'] })}
              className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:bg-white"
            >
              <option value="MG">mg</option>
              <option value="IU">IU</option>
            </select>
            <input
              type="number"
              value={drugForm.strength}
              onChange={(event) => setDrugForm({ ...drugForm, strength: event.target.value })}
              placeholder="Vahvuus mg/IU/ml tai tab"
              className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:bg-white"
            />
            <input
              type="number"
              value={drugForm.dosePerKgDay}
              onChange={(event) => setDrugForm({ ...drugForm, dosePerKgDay: event.target.value })}
              placeholder="Annos mg/IU/kg/vrk"
              className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:bg-white"
            />
            <input
              type="number"
              value={drugForm.timesPerDay}
              onChange={(event) => setDrugForm({ ...drugForm, timesPerDay: event.target.value })}
              placeholder="Antokerrat / vrk"
              className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:bg-white"
            />
            <input
              type="number"
              value={drugForm.defaultDays}
              onChange={(event) => setDrugForm({ ...drugForm, defaultDays: event.target.value })}
              placeholder="Kesto pv"
              className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:bg-white"
            />
            <input
              type="number"
              value={drugForm.packageSize}
              onChange={(event) => setDrugForm({ ...drugForm, packageSize: event.target.value })}
              placeholder="Pakkaus ml/kpl"
              className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:bg-white"
            />
            <textarea
              value={drugForm.note}
              onChange={(event) => setDrugForm({ ...drugForm, note: event.target.value })}
              placeholder="Huomio / ohje"
              className="sm:col-span-2 min-h-[80px] p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:bg-white resize-none"
            />
          </div>

          <div className="space-y-2">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Indikaatiot</div>
            <div className="flex flex-wrap gap-2">
              {indications.length === 0 ? (
                <span className="text-xs text-slate-400 font-bold">Luo ensin indikaatio.</span>
              ) : indications.map((item) => (
                <button
                  key={item.id}
                  onClick={() => toggleDrugIndication(item.id)}
                  className={`px-3 py-2 rounded-xl text-[11px] font-black border transition-all ${
                    drugForm.indicationIds.includes(item.id)
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-50 text-slate-500 border-slate-100 hover:border-blue-200'
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={createDrug}
            disabled={isLoading}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase hover:bg-blue-700 disabled:bg-slate-200 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Tallenna PEDS-lääke
          </button>
        </section>
      </div>

      <section className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-800">Tallennetut PEDS-lääkkeet</h2>
            <p className="text-xs text-slate-500 mt-1">Näytetään: {selectedIndicationName}</p>
          </div>
          <select
            value={selectedIndicationId}
            onChange={(event) => handleFilterChange(event.target.value)}
            className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:bg-white"
          >
            <option value="all">Kaikki indikaatiot</option>
            {indications.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {drugs.length === 0 ? (
            <div className="md:col-span-2 xl:col-span-3 p-6 bg-slate-50 rounded-2xl text-sm text-slate-400 font-bold text-center">
              Ei tallennettuja lääkkeitä tällä rajauksella.
            </div>
          ) : drugs.map((drug) => (
            <div key={drug.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-slate-800">{drug.name}</div>
                  <div className="text-[10px] font-black text-blue-600 uppercase">
                    {drug.form === 'LIQUID' ? 'Neste' : 'Tabletti'} · {drug.unit.toLowerCase()}
                  </div>
                </div>
                <button
                  onClick={() => deleteDrug(drug.id)}
                  disabled={isLoading}
                  className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                  title="Poista lääke"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-500">
                <div className="p-2 bg-white rounded-xl">Vahvuus<br/><span className="text-slate-900">{drug.strength} {drug.unit.toLowerCase()}/{drug.form === 'LIQUID' ? 'ml' : 'tab'}</span></div>
                <div className="p-2 bg-white rounded-xl">Annos<br/><span className="text-slate-900">{drug.dosePerKgDay} {drug.unit.toLowerCase()}/kg/vrk</span></div>
                <div className="p-2 bg-white rounded-xl">Antokerrat<br/><span className="text-slate-900">{drug.timesPerDay}x/vrk</span></div>
                <div className="p-2 bg-white rounded-xl">Kesto<br/><span className="text-slate-900">{drug.defaultDays ?? '—'} pv</span></div>
              </div>

              {drug.indications.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {drug.indications.map((item) => (
                    <span key={item.id} className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-black">
                      {item.name}
                    </span>
                  ))}
                </div>
              )}

              {drug.note && <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{drug.note}</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
