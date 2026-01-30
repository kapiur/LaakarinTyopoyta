"use client";

import { useState, useEffect } from "react";
import { 
  Plus, ExternalLink, Trash2, Globe, Lock, 
  FolderPlus, Loader2, Link as LinkIcon, X 
} from "lucide-react";

export default function LinksPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"link" | "category">("link");

  // Состояния для форм
  const [newLink, setNewLink] = useState({ title: "", url: "", categoryId: "", isPersonal: true });
  const [newCat, setNewCat] = useState({ name: "", isPersonal: true });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const res = await fetch("/api/links");
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
      if (data.length > 0 && !newLink.categoryId) {
        setNewLink(prev => ({ ...prev, categoryId: data[0].id.toString() }));
      }
    } catch (err) {
      console.error("Virhe ladattaessa linkkejä:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddLink(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/links", {
      method: "POST",
      body: JSON.stringify({ ...newLink, type: "link" }),
    });
    setNewLink({ ...newLink, title: "", url: "" });
    setIsModalOpen(false);
    loadData();
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/links", {
      method: "POST",
      body: JSON.stringify({ ...newCat, type: "category" }),
    });
    setNewCat({ name: "", isPersonal: true });
    setIsModalOpen(false);
    loadData();
  }

  async function handleDelete(id: number) {
    if (!confirm("Haluatko varmasti poistaa tämän linkin?")) return;
    await fetch(`/api/links/${id}`, { method: "DELETE" });
    loadData();
  }

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={40} />
        <p className="text-slate-500 font-medium">Ladataan linkkejä...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Linkit ja Ohjeet</h1>
            <p className="text-slate-500 mt-1 font-medium">Tärkeät resurssit ja omat suosikit yhdessä paikassa.</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => { setModalType("category"); setIsModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all shadow-sm font-semibold text-sm"
            >
              <FolderPlus size={18} /> Uusi kategoria
            </button>
            <button 
              onClick={() => { setModalType("link"); setIsModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-200 font-semibold text-sm"
            >
              <Plus size={18} /> Lisää linkki
            </button>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat: any) => (
            <div key={cat.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  {cat.name}
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-bold">
                    {cat.links.length}
                  </span>
                </h3>
                {cat.userId ? (
                  <div className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-md text-[10px] font-bold uppercase">
                    <Lock size={10} /> Oma
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-slate-500 bg-slate-100 px-2 py-1 rounded-md text-[10px] font-bold uppercase">
                    <Globe size={10} /> Yleinen
                  </div>
                )}
              </div>
              
              <ul className="p-4 space-y-1 flex-grow">
                {cat.links.map((link: any) => (
                  <li key={link.id} className="group flex items-center justify-between p-2 rounded-lg hover:bg-blue-50/50 transition-colors">
                    <a 
                      href={link.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-slate-700 group-hover:text-blue-700 truncate transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors flex-shrink-0">
                        <LinkIcon size={14} className="text-slate-400 group-hover:text-blue-600" />
                      </div>
                      <span className="text-sm font-medium truncate">{link.title}</span>
                    </a>
                    <div className="flex items-center gap-1">
                      <a href={link.url} target="_blank" className="p-1.5 text-slate-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all">
                        <ExternalLink size={14} />
                      </a>
                      <button 
                        onClick={() => handleDelete(link.id)}
                        className="p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                ))}
                {cat.links.length === 0 && (
                  <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-xl">
                    <p className="text-xs text-slate-400 italic font-medium">Ei vielä linkkejä</p>
                  </div>
                )}
              </ul>
            </div>
          ))}
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-900">
                  {modalType === "link" ? "Lisää uusi linkki" : "Uusi kategoria"}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={modalType === "link" ? handleAddLink : handleAddCategory} className="p-6 space-y-4">
                {modalType === "link" ? (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Kuvaus</label>
                      <input 
                        required placeholder="Esim. Käypä hoito: Verenpainetauti" 
                        className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                        value={newLink.title}
                        onChange={e => setNewLink({...newLink, title: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">URL-osoite</label>
                      <input 
                        required type="url" placeholder="https://..." 
                        className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition font-mono text-sm"
                        value={newLink.url}
                        onChange={e => setNewLink({...newLink, url: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Kategoria</label>
                      <select 
                        className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                        value={newLink.categoryId}
                        onChange={e => setNewLink({...newLink, categoryId: e.target.value})}
                      >
                        {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </>
                ) : (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Kategorian nimi</label>
                    <input 
                      required placeholder="Esim. Lomakkeet или Ohjeet" 
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                      value={newCat.name}
                      onChange={e => setNewCat({...newCat, name: e.target.value})}
                    />
                  </div>
                )}

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                      checked={modalType === "link" ? newLink.isPersonal : newCat.isPersonal}
                      onChange={e => modalType === "link" 
                        ? setNewLink({...newLink, isPersonal: e.target.checked})
                        : setNewCat({...newCat, isPersonal: e.target.checked})
                      }
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700">Vain minun käytössäni</span>
                      <span className="text-[11px] text-slate-500 leading-none">Yksityinen linkki/kategoria näkyy vain sinulle.</span>
                    </div>
                  </label>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button" onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-bold transition"
                  >
                    Peruuta
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold transition shadow-lg shadow-blue-100"
                  >
                    Tallenna
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
