"use client";

import { useState } from 'react';
import { Edit2, Loader2, Plus, Trash2, X } from 'lucide-react';
import type { TemplateCategory } from '../../lib/templates';

type CategoryManagerDialogProps = {
  categories: TemplateCategory[];
  onClose: () => void;
  onChanged: () => Promise<void>;
};

export default function CategoryManagerDialog({ categories, onClose, onChanged }: CategoryManagerDialogProps) {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const createCategory = async () => {
    if (!newName.trim() || loading) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/templates/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Osion luonti epäonnistui');
      setNewName('');
      await onChanged();
    } catch (err: any) {
      setErrorMsg(err.message || 'Osion luonti epäonnistui');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (category: TemplateCategory) => {
    setEditingId(category.id);
    setEditingName(category.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const renameCategory = async () => {
    if (!editingId || !editingName.trim() || loading) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/templates/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, name: editingName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Osion päivitys epäonnistui');
      cancelEdit();
      await onChanged();
    } catch (err: any) {
      setErrorMsg(err.message || 'Osion päivitys epäonnistui');
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (category: TemplateCategory) => {
    const templateCount = category.templates?.length || 0;
    const message = templateCount > 0
      ? `Haluatko varmasti poistaa osion "${category.name}" ja sen ${templateCount} mallia? Tätä ei voi perua.`
      : `Haluatko varmasti poistaa osion "${category.name}"?`;

    if (!confirm(message) || loading) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/templates/categories?id=${category.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Osion poisto epäonnistui');
      await onChanged();
    } catch (err: any) {
      setErrorMsg(err.message || 'Osion poisto epäonnistui');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[85vh] bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Osiot</div>
            <h2 className="text-2xl font-black text-slate-900">Hallinnoi osioita</h2>
          </div>
          <button onClick={onClose} className="p-3 rounded-2xl hover:bg-slate-50 text-slate-400 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {errorMsg && (
          <div className="m-6 mb-0 p-4 bg-red-50 border border-red-100 rounded-2xl text-sm font-bold text-red-700">
            {errorMsg}
          </div>
        )}

        <div className="p-6 border-b border-slate-100 bg-slate-50/60">
          <div className="flex gap-3">
            <input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') createCategory(); }}
              placeholder="Uuden osion nimi"
              className="flex-1 p-4 bg-white border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 font-bold"
            />
            <button
              onClick={createCategory}
              disabled={loading || !newName.trim()}
              className="px-5 py-3 rounded-2xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Luo
            </button>
          </div>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-3">
          {categories.length === 0 ? (
            <div className="text-center py-10 text-slate-300 font-black uppercase tracking-widest text-[10px]">Ei osioita</div>
          ) : categories.map((category) => (
            <div key={category.id} className="p-4 rounded-2xl border border-slate-100 bg-white shadow-sm flex items-center gap-3">
              {editingId === category.id ? (
                <>
                  <input
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                    onKeyDown={(event) => { if (event.key === 'Enter') renameCategory(); }}
                    className="flex-1 p-3 bg-slate-50 border-none rounded-xl outline-none focus:ring-4 focus:ring-blue-500/5 font-bold text-sm"
                    autoFocus
                  />
                  <button onClick={renameCategory} disabled={loading || !editingName.trim()} className="px-4 py-3 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest disabled:opacity-50">
                    Tallenna
                  </button>
                  <button onClick={cancelEdit} className="p-3 text-slate-300 hover:text-slate-600">
                    <X size={16} />
                  </button>
                </>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-slate-800 truncate">{category.name}</div>
                    <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{category.templates?.length || 0} mallia</div>
                  </div>
                  <button onClick={() => startEdit(category)} className="p-3 text-slate-300 hover:text-blue-600 rounded-xl hover:bg-blue-50">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => deleteCategory(category)} className="p-3 text-slate-300 hover:text-red-600 rounded-xl hover:bg-red-50">
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
