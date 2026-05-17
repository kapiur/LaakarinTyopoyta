"use client";
import { useState, useEffect, useRef } from 'react';
import {
  Send, Bot, FileText, Calculator, Scissors, Languages,
  ListChecks, Copy, MessageSquareShare, Zap, ShieldCheck, Loader2,
  RotateCcw, FlaskConical, Settings
} from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import PrivacyNotice from '../components/PrivacyNotice';
import { DEFAULT_AI_TOOL_METADATA, type DefaultAiToolMetadata } from '../lib/ai/toolMetadata';
import { useI18n } from '../lib/useI18n';

type PrivacyInfo = { anonymized?: boolean; findingTypes?: string[] } | null;

const aiToolIcons = {
  ListChecks: <ListChecks size={14} />,
  Languages: <Languages size={14} />,
  Scissors: <Scissors size={14} />,
  FlaskConical: <FlaskConical size={14} />,
  FileText: <FileText size={14} />,
};

export default function Dashboard() {
  const { t } = useI18n();
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: t('dashboard.assistantGreeting') }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatPrivacy, setChatPrivacy] = useState<PrivacyInfo>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [toolText, setToolText] = useState('');
  const [toolResult, setToolResult] = useState('');
  const [previousToolResult, setPreviousToolResult] = useState('');
  const [refinementInstruction, setRefinementInstruction] = useState('');
  const [toolPrivacy, setToolPrivacy] = useState<PrivacyInfo>(null);
  const [toolMode, setToolMode] = useState('fix');
  const [isToolLoading, setIsToolLoading] = useState(false);
  const [isRefiningToolResult, setIsRefiningToolResult] = useState(false);
  const [aiTools, setAiTools] = useState<DefaultAiToolMetadata[]>(DEFAULT_AI_TOOL_METADATA);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    const loadAiTools = async () => {
      try {
        const response = await fetch('/api/ai-tools');
        if (!response.ok) return;
        const data = await response.json();
        if (Array.isArray(data.tools) && data.tools.length > 0) setAiTools(data.tools);
      } catch (error) {
        console.error(t('dashboard.aiToolsLoadingFailed'), error);
      }
    };
    loadAiTools();
  }, [t]);

  const clearTool = () => {
    setToolText('');
    setToolResult('');
    setPreviousToolResult('');
    setRefinementInstruction('');
    setToolPrivacy(null);
  };

  const sendMessage = async (overrideMessage?: string) => {
    const messageToSend = overrideMessage || chatInput;
    if (!messageToSend.trim() || isChatLoading) return;
    const userMessage = { role: 'user', content: messageToSend };
    setMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsChatLoading(true);
    setChatPrivacy(null);
    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [...messages, userMessage] }) });
      const data = await response.json();
      if (data.privacy) setChatPrivacy(data.privacy);
      if (data.content) setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
    } catch (error) {
      console.error("AI-virhe:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: t('dashboard.aiConnectionError') }]);
    } finally { setIsChatLoading(false); }
  };

  const processToolText = async (selectedMode: string) => {
    if (!toolText.trim() || isToolLoading || isRefiningToolResult) return;
    setToolMode(selectedMode);
    setIsToolLoading(true);
    setToolPrivacy(null);
    setPreviousToolResult('');
    setRefinementInstruction('');
    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: toolText, mode: selectedMode }) });
      const data = await response.json();
      if (data.privacy) setToolPrivacy(data.privacy);
      if (data.content) setToolResult(data.content);
    } catch (error) { setToolResult(t('dashboard.textProcessingError')); }
    finally { setIsToolLoading(false); }
  };

  const refineToolResult = async () => {
    if (!toolText.trim() || !toolResult.trim() || !refinementInstruction.trim() || isToolLoading || isRefiningToolResult) return;
    setIsRefiningToolResult(true);
    setToolPrivacy(null);
    try {
      const response = await fetch('/api/ai-tools/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: toolMode,
          originalText: toolText,
          previousResult: toolResult,
          instruction: refinementInstruction,
        }),
      });
      const data = await response.json();
      if (data.privacy) setToolPrivacy(data.privacy);
      if (data.content) {
        setPreviousToolResult(toolResult);
        setToolResult(data.content);
        setRefinementInstruction('');
      } else if (!response.ok) {
        setToolResult(t('dashboard.textProcessingError'));
      }
    } catch (error) {
      setToolResult(t('dashboard.textProcessingError'));
    } finally {
      setIsRefiningToolResult(false);
    }
  };

  const restorePreviousToolResult = () => {
    if (!previousToolResult) return;
    setToolResult(previousToolResult);
    setPreviousToolResult('');
  };

  const moveResultToChat = () => { if (toolResult) sendMessage(`${t('dashboard.processedTextIntro')}\n\n${toolResult}`); };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full animate-in fade-in duration-700">
      <div className="lg:col-span-2 space-y-6">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{t('dashboard.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/malli" className="block p-5 bg-white rounded-2xl shadow-sm border border-slate-100 hover:border-blue-500 hover:shadow-md transition-all group"><h3 className="font-bold text-blue-700 group-hover:text-blue-600 flex items-center gap-2 mb-1">{t('dashboard.templatesTitle')} <FileText size={18} /></h3><p className="text-[11px] leading-relaxed text-slate-500">{t('dashboard.templatesDescription')}</p></Link>
          <Link href="/calculators" className="block p-5 bg-white rounded-2xl shadow-sm border border-slate-100 hover:border-blue-500 hover:shadow-md transition-all group"><h3 className="font-bold text-blue-700 group-hover:text-blue-600 flex items-center gap-2 mb-1">{t('dashboard.calculatorsTitle')} <Calculator size={18} /></h3><p className="text-[11px] leading-relaxed text-slate-500">{t('dashboard.calculatorsDescription')}</p></Link>
          <Link href="/pikaohjeet-v2" className="block p-5 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all group"><h3 className="font-bold text-white flex items-center gap-2 mb-1">{t('dashboard.quickGuidesTitle')} <Zap size={18} className="text-amber-300" /></h3><p className="text-[11px] leading-relaxed text-blue-100">{t('dashboard.quickGuidesDescription')}</p></Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
          <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-4"><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Bot size={22} className="text-blue-600" /> {t('dashboard.textToolTitle')}</h3><button onClick={clearTool} className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-100 uppercase" title={t('dashboard.clearToolTitle')}><RotateCcw size={14} /> {t('common.clear')}</button></div><div className="flex items-center gap-2"><Link href="/ai-tools" className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full border border-blue-100 uppercase transition-all" title={t('dashboard.manageAiTools')}><Settings size={12} /> {t('dashboard.manageAiTools')}</Link><div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100"><ShieldCheck size={12} /> SERVER-SIDE PRIVACY</div></div></div>
          <PrivacyNotice privacy={toolPrivacy} />
          <div className="space-y-4"><textarea value={toolText} onChange={(e) => setToolText(e.target.value)} placeholder={t('dashboard.textAreaPlaceholder')} className="w-full h-40 p-4 text-sm border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none bg-slate-50/30 transition-all resize-none font-medium" />
            <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-xl w-fit">{aiTools.map((btn) => <button key={btn.key} onClick={() => processToolText(btn.key)} disabled={isToolLoading || isRefiningToolResult || !toolText.trim()} title={btn.description} className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${toolMode === btn.key ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{isToolLoading && toolMode === btn.key ? <Loader2 size={14} className="animate-spin" /> : aiToolIcons[btn.icon]}{btn.label.toUpperCase()}</button>)}</div>
            {toolResult && <div className="mt-4 p-6 bg-blue-50/50 border border-blue-100 rounded-2xl relative animate-in zoom-in-95 duration-300"><div className="flex justify-end gap-2 mb-4"><button onClick={moveResultToChat} className="px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-blue-600 hover:bg-blue-600 hover:text-white flex items-center gap-2 text-[10px] font-bold uppercase transition-all shadow-sm"><MessageSquareShare size={14} /> {t('dashboard.moveToChat')}</button><button onClick={() => {navigator.clipboard.writeText(toolResult); alert(t('dashboard.copiedAlert'));}} className="p-1.5 bg-white border border-blue-200 rounded-lg text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"><Copy size={16} /></button></div><div className="prose prose-sm max-w-none text-slate-800 font-medium leading-relaxed"><ReactMarkdown>{toolResult}</ReactMarkdown></div><div className="mt-5 pt-5 border-t border-blue-100/80 space-y-3"><div><h4 className="text-xs font-black uppercase tracking-wide text-slate-600">{t('dashboard.refineResultTitle')}</h4><p className="mt-1 text-[11px] leading-relaxed text-slate-500">{t('dashboard.refineResultDescription')}</p></div><textarea value={refinementInstruction} onChange={(e) => setRefinementInstruction(e.target.value)} placeholder={t('dashboard.refineResultPlaceholder')} className="w-full h-20 p-3 text-xs border border-blue-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none bg-white/80 transition-all resize-none font-medium" /><div className="flex items-center justify-between gap-2"><button onClick={restorePreviousToolResult} disabled={!previousToolResult || isToolLoading || isRefiningToolResult} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-blue-600 hover:border-blue-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 text-[10px] font-bold uppercase transition-all shadow-sm"><RotateCcw size={13} /> {t('dashboard.restorePreviousResult')}</button><button onClick={refineToolResult} disabled={!refinementInstruction.trim() || isToolLoading || isRefiningToolResult} className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-slate-200 disabled:cursor-not-allowed flex items-center gap-2 text-[10px] font-bold uppercase transition-all shadow-sm">{isRefiningToolResult && <Loader2 size={13} className="animate-spin" />} {t('dashboard.refineResultButton')}</button></div></div></div>}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 flex flex-col h-[calc(100vh-10rem)] overflow-hidden"><div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white"><div className="flex items-center gap-3"><div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600"><Bot size={18} /></div><div><span className="font-bold text-slate-800 text-sm block">{t('dashboard.assistantTitle')}</span><span className="text-[9px] font-bold text-emerald-500 uppercase tracking-tighter flex items-center gap-1"><div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" /> Online</span></div></div></div><div className="px-5 pt-4"><PrivacyNotice privacy={chatPrivacy} compact /></div><div className="flex-1 p-5 overflow-auto space-y-4 bg-slate-50/30 custom-scrollbar">{messages.map((m, i) => <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}><div className={`max-w-[90%] p-4 rounded-2xl text-[13px] leading-relaxed shadow-sm ${m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'}`}><ReactMarkdown className="prose prose-sm max-w-none prose-p:leading-relaxed">{m.content}</ReactMarkdown></div></div>)}{isChatLoading && <div className="flex justify-start"><div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none flex gap-2"><div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" /><div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]" /><div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]" /></div></div>}<div ref={chatEndRef} /></div><div className="p-5 bg-white border-t border-slate-100"><div className="flex gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100 focus-within:border-blue-300 transition-all"><input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} type="text" placeholder={t('dashboard.chatPlaceholder')} className="flex-1 px-3 py-2 bg-transparent outline-none text-sm font-medium" /><button onClick={() => sendMessage()} disabled={isChatLoading || !chatInput.trim()} className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-slate-200 transition-all shadow-md active:scale-95"><Send size={18} /></button></div></div></div>
      <style jsx global>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; }.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }.custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }`}</style>
    </div>
  );
}
