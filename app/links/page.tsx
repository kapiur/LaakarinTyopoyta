"use client";

import { useState, useEffect } from "react";
import { 
  Plus, ExternalLink, Trash2, Globe, Lock, 
  FolderPlus, Loader2, Link as LinkIcon, X, 
  MoveHorizontal
} from "lucide-react";
import { useI18n } from "../../lib/useI18n";

const copy = {
  fi: {
    title: "Linkit ja Ohjeet",
    subtitle: "Tärkeät resurssit ja omat suosikit.",
    newCategory: "Uusi kategoria",
    addLink: "Lisää linkki",
    own: "Oma",
    common: "Yleinen",
    practiceDefault: "Työskentelymaan oletus",
    move: "Siirrä",
    emptyCategory: "Tyhjä kategoria",
    addNewLink: "Lisää uusi linkki",
    description: "Kuvaus",
    url: "URL (https://...)",
    categoryName: "Kategorian nimi",
    personalOnly: "Vain minun käytössäni",
    cancel: "Peruuta",
    save: "Tallenna",
    deleteLinkConfirm: "Haluatko varmasti poistaa linkin?",
    deleteCategoryConfirm: "Poistetaanko tämä kategoria? Se onnistuu vain, jos kategoria on tyhjä.",
    deleteCategoryFailed: "Kategoriaa ei voitu poistaa. Varmista, että se on tyhjä.",
    errorPrefix: "Virhe:",
  },
  ru: {
    title: "Ссылки и инструкции",
    subtitle: "Важные ресурсы и личные избранные ссылки.",
    newCategory: "Новая категория",
    addLink: "Добавить ссылку",
    own: "Личное",
    common: "Общее",
    practiceDefault: "Дефолт для страны работы",
    move: "Перенести",
    emptyCategory: "Пустая категория",
    addNewLink: "Добавить новую ссылку",
    description: "Описание",
    url: "URL (https://...)",
    categoryName: "Название категории",
    personalOnly: "Только для меня",
    cancel: "Отмена",
    save: "Сохранить",
    deleteLinkConfirm: "Вы действительно хотите удалить ссылку?",
    deleteCategoryConfirm: "Удалить эту категорию? Это возможно только если категория пустая.",
    deleteCategoryFailed: "Категорию не удалось удалить. Убедитесь, что она пустая.",
    errorPrefix: "Ошибка:",
  },
  en: {
    title: "Links and guides",
    subtitle: "Important resources and personal favourites.",
    newCategory: "New category",
    addLink: "Add link",
    own: "Personal",
    common: "Shared",
    practiceDefault: "Practice-country default",
    move: "Move",
    emptyCategory: "Empty category",
    addNewLink: "Add new link",
    description: "Description",
    url: "URL (https://...)",
    categoryName: "Category name",
    personalOnly: "Only for me",
    cancel: "Cancel",
    save: "Save",
    deleteLinkConfirm: "Do you really want to delete this link?",
    deleteCategoryConfirm: "Delete this category? This only works if the category is empty.",
    deleteCategoryFailed: "Could not delete the category. Make sure it is empty.",
    errorPrefix: "Error:",
  },
} as const;

export default function LinksPage() {
  const { language } = useI18n();
  const c = copy[language] ?? copy.fi;
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"link" | "category">("link");

  const [newLink, setNewLink] = useState({ title: "", url: "", categoryId: "", isPersonal: true });
  const [newCat, setNewCat] = useState({ name: "", isPersonal: true });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const res = await fetch("/api/links");
      const data = await res.json();
      const nextCategories = Array.isArray(data) ? data : [];
      setCategories(nextCategories);
      const firstWritableCategory = nextCategories.find((category: any) => typeof category.id === "number");
      if (firstWritableCategory && !newLink.categoryId) {
        setNewLink(prev => ({ ...prev, categoryId: firstWritableCategory.id.toString() }));
      }
    } catch (err) {
      console.error(c.errorPrefix, err);
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
    if (!confirm(c.deleteLinkConfirm)) return;
    await fetch(`/api/links/${id}`, { method: "DELETE" });
    loadData();
  }

  async function handleDeleteCategory(id: number) {
    if (!confirm(c.deleteCategoryConfirm)) return;
    const res = await fetch(`/api/links/${id}?type=category`, { method: "DELETE" });
    if (!res.ok) alert(c.deleteCategoryFailed);
    loadData();
  }

  async function handleMoveLink(linkId: number, newCategoryId: string) {
    await fetch("/api/links", {
      method: "PATCH",
      body: JSON.stringify({ linkId, newCategoryId }),
    });
    loadData();
  }

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin text-blue-600" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{c.title}</h1>
            <p className="text-slate-500 mt-1 font-medium">{c.subtitle}</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => { setModalType("category"); setIsModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all shadow-sm font-semibold text-sm"
            >
              <FolderPlus size={18} /> {c.newCategory}
            </button>
            <button 
              onClick={() => { setModalType("link"); setIsModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-200 font-semibold text-sm"
            >
              <Plus size={18} /> {c.addLink}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat: any) => (
            <div key={cat.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 truncate">
                  {cat.name}
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-bold">
                    {cat.links.length}
                  </span>
                </h3>
                <div className="flex items-center gap-2">
                  {cat.links.length === 0 && typeof cat.id === "number" && (
                    <button onClick={() => handleDeleteCategory(cat.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  )}
                  {cat.source === "practice-country-default" ? (
                    <div className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-md text-[10px] font-bold uppercase">
                      <Globe size={10} /> {c.practiceDefault}
                    </div>
                  ) : cat.userId ? (
                    <div className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-md text-[10px] font-bold uppercase">
                      <Lock size={10} /> {c.own}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-slate-500 bg-slate-100 px-2 py-1 rounded-md text-[10px] font-bold uppercase">
                      <Globe size={10} /> {c.common}
                    </div>
                  )}
                </div>
              </div>
              
              <ul className="p-4 space-y-2 flex-grow">
                {cat.links.map((link: any) => (
                  <li key={link.id} className="group flex flex-col p-2 rounded-xl hover:bg-blue-50/50 transition-all border border-transparent hover:border-blue-100">
                    <div className="flex items-center justify-between">
                      <a 
                        href={link.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 text-slate-700 group-hover:text-blue-700 truncate transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors flex-shrink-0">
                          <LinkIcon size={14} className="text-slate-400 group-hover:text-blue-600" />
                        </div>
                        <span className="text-sm font-semibold truncate">{link.title}</span>
                      </a>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        {typeof link.id === "number" && (
                          <button 
                            onClick={() => handleDelete(link.id)}
                            className="p-1.5 text-slate-300 hover:text-red-500 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {typeof link.id === "number" && (
                      <div className="mt-2 pl-11 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1.5">
                        <MoveHorizontal size={10} className="text-slate-300" />
                        <select 
                          className="text-[10px] bg-transparent text-slate-400 border-none p-0 focus:ring-0 cursor-pointer hover:text-blue-600 font-medium"
                          value={cat.id}
                          onChange={(e) => handleMoveLink(link.id, e.target.value)}
                        >
                          {categories.filter((targetCategory: any) => typeof targetCategory.id === "number").map((targetCategory: any) => (
                            <option key={targetCategory.id} value={targetCategory.id}>{c.move}: {targetCategory.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </li>
                ))}
                {cat.links.length === 0 && (
                  <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-xl">
                    <p className="text-xs text-slate-400 italic font-medium">{c.emptyCategory}</p>
                  </div>
                )}
              </ul>
            </div>
          ))}
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-900">
                  {modalType === "link" ? c.addNewLink : c.newCategory}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={modalType === "link" ? handleAddLink : handleAddCategory} className="p-6 space-y-4">
                {modalType === "link" ? (
                  <>
                    <input 
                      required placeholder={c.description}
                      className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                      value={newLink.title}
                      onChange={e => setNewLink({...newLink, title: e.target.value})}
                    />
                    <input 
                      required type="url" placeholder={c.url}
                      className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                      value={newLink.url}
                      onChange={e => setNewLink({...newLink, url: e.target.value})}
                    />
                    <select 
                      className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                      value={newLink.categoryId}
                      onChange={e => setNewLink({...newLink, categoryId: e.target.value})}
                    >
                      {categories.filter((targetCategory: any) => typeof targetCategory.id === "number").map((targetCategory: any) => <option key={targetCategory.id} value={targetCategory.id}>{targetCategory.name}</option>)}
                    </select>
                  </>
                ) : (
                  <input 
                    required placeholder={c.categoryName}
                    className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    value={newCat.name}
                    onChange={e => setNewCat({...newCat, name: e.target.value})}
                  />
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
                      <span className="text-sm font-bold text-slate-700">{c.personalOnly}</span>
                    </div>
                  </label>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-bold transition">{c.cancel}</button>
                  <button type="submit" className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold transition">{c.save}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
