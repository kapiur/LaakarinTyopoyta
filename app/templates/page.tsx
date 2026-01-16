"use client";
import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, FileText, Trash2, ChevronRight, 
  Copy, Check, Clock, User, Share2, Loader2, X, RefreshCcw, Edit2
} from 'lucide-react';

export default function TemplatesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [templateValues, setTemplateValues] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    id: null as number | null,
    title: '',
    content: '',
    categoryName: '',
    author: ''
  });

  useEffect(() => { fetchTemplates(); }, []);
  useEffect(() => { setTemplateValues({}); }, [selectedTemplate]);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      const validData = Array.isArray(data) ? data : [];
      setCategories(validData);
      if (validData.length > 0 && !activeCategoryId) {
        setActiveCategoryId(validData[0].id);
      }
    } catch (err) {
      console.error("Latausvirhe:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- ЛОГИКА КОПИРОВАНИЯ (Исправленная) ---
  const fallbackCopy = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert("Kopiointi epäonnistui. Kopioi teksti manuaalisesti.");
    }
    document.body.removeChild(textArea);
  };

  const handleCopy = () => {
    if (!generateFinalText) return;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(generateFinalText)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => fallbackCopy(generateFinalText));
    } else {
      fallbackCopy(generateFinalText);
    }
  };

  // --- ОСТАЛЬНАЯ ЛОГИКА ---
  const handleSave = async () => {
    if (!formData.title || !formData.content || !formData.categoryName) {
      alert("Täytä kaikki pakolliset kentät");
      return;
    }
    try {
      const method = formData.id ? 'PUT' : 'POST';
      const res = await fetch('/api/templates', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setIsAdding(false);
        setIsEditing(false);
        setFormData({ id: null, title: '', content: '', categoryName: '', author: '' });
        fetchTemplates();
      }
    } catch (err) {
      alert("Tallennus epäonnistui");
    }
  };

  const deleteCategory = async (id: number, name: string) => {
    if (!confirm(`Haluatko varmasti poistaa osion "${name}" ja KAIKKI sen mallit?`)) return;
    try {
      await fetch(`/api/templates?id=${id}&type=category`, { method: 'DELETE' });
      fetchTemplates();
      setActiveCategoryId(null);
      setSelectedTemplate(null);
    } catch (err) {
      alert("Poisto epäonnistui");
    }
  };

  const startEditing = (template: any) => {
    const category = categories.find(c => c.id === template.categoryId);
    setFormData({
      id: template.id,
      title: template.title,
      content: template.content,
      categoryName: category?.name || '',
      author: template.author || ''
    });
    setIsEditing(true);
    setIsAdding(false);
  };

  const handleShare = async (templateId: number, title: string) => {
    const targetEmail = window.prompt(`Jaa malli "${title}"\nSyötä vastaanottajan sähköposti:`);
    if (!targetEmail) return;
    try {
      const res = await fetch('/api/templates/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, targetEmail: targetEmail.toLowerCase().trim() })
      });
      const data = await res.json();
      if (data.success) alert("Malli kopioitu kollegalle!");
      else alert("Virhe: " + (data.error || "Epäonnistui"));
    } catch (err) {
      alert("Yhteysvirhe.");
    }
  };

  const parseTemplate = (content: string) => {
    const parts = [];
    const regex = /{{(.*?)}}/g;
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', value: content.slice(lastIndex, match.index) });
      }
      const config = match[1].split(':');
      parts.push({ 
        type: config[1] || 'input', 
        id: config[0], 
        options: config[2] ? config[2].split(',') : [] 
      });
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < content.length) parts.push({ type: 'text', value: content.slice(lastIndex) });
    return parts;
  };

  const generateFinalText = useMemo(() => {
    if (!selectedTemplate) return "";
    return selectedTemplate.content.replace(/{{(.*?)}}/g, (match: string, p1: string) => {
      const id = p1.split(':')[0];
      return templateValues[id] || `[${id}]`;
    });
  }, [selectedTemplate, templateValues]);

  const activeCategory = categories.find(c => c.id === activeCategoryId);
  
  // ИСПРАВЛЕНИЕ: Добавлена проверка на наличие activeCategory и templates перед фильтрацией
  const displayedTemplates = activeCategory?.templates 
    ? activeCategory.templates.filter((t: any) => 
        t.title.toLowerCase().includes(searchTerm.toLowerCase())
      ) 
    : [];

  return (
    <div className="max-w-[1600px] mx-auto h-[calc(100vh-100px)] flex flex-col gap-6">
      
      {/* HEADER */}
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl border shadow-sm flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tekstimallit</h1>
          <p className="text-slate-500 text-sm">Hallitse ja käytä omia tekstipohjiasi</p>
        </div>
        <button 
          onClick={() => { setIsAdding(true); setIsEditing(false); setFormData({id:null, title:'', content:'', categoryName:'', author:''}); }}
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95"
        >
          + UUSI MALLI
        </button>
      </div>

      {/* CATEGORIES */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar px-1 flex-shrink-0">
        {categories.map(cat => (
          <div key={cat.id} className="group relative">
            <button 
              onClick={() => { setActiveCategoryId(cat.id); setSelectedTemplate(null); }}
              className={`px-6 py-3 rounded-2xl font-bold text-sm transition-all border whitespace-nowrap ${
                activeCategoryId === cat.id 
                ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300'
              }`}
            >
              {cat.name}
            </button>
            <button 
              onClick={() => deleteCategory(cat.id, cat.name)}
              className="absolute -top-2 -right-1 bg-red-100 text-red-600 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity border-2 border-white shadow-sm"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0 pb-4 overflow-hidden">
        
        {/* LEFT PANEL */}
        <div className="col-span-3 flex flex-col gap-4 min-h-0">
          <div className="relative flex-shrink-0">
            <Search className="absolute left-4 top-1
