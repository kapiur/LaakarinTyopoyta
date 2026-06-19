"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Bot,
  BookText,
  Calculator,
  Copy,
  FileText,
  FlaskConical,
  Globe2,
  Languages,
  Link as LinkIcon,
  ListChecks,
  Loader2,
  MessageSquareShare,
  PanelRightClose,
  PanelRightOpen,
  Pill,
  RotateCcw,
  Scissors,
  Send,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Zap,
} from "lucide-react";
import PrivacyNotice from "../components/PrivacyNotice";
import { DEFAULT_AI_TOOL_METADATA, type DefaultAiToolMetadata } from "../lib/ai/toolMetadata";
import type { TranslationKey } from "../lib/i18n";
import { useI18n } from "../lib/useI18n";

type PrivacyInfo = { anonymized?: boolean; findingTypes?: string[] } | null;

type WorkspaceContext = {
  practiceCountry: string;
  clinicalCountry: string;
  clinicalOutputLanguage: string;
  evidenceStrictness: string;
};

type CountryOption = {
  code: string;
  name: Partial<Record<"fi" | "ru" | "en" | "de", string>>;
};

type QuickAction = {
  key: string;
  href: string;
  labelKey: TranslationKey;
  icon: keyof typeof quickActionIcons;
  isVisible: boolean;
};

const ASSISTANT_STATE_KEY = "laakarin-tyopoyta:home-assistant-open";

const aiToolIcons = {
  ListChecks: <ListChecks size={15} />,
  Languages: <Languages size={15} />,
  Scissors: <Scissors size={15} />,
  FlaskConical: <FlaskConical size={15} />,
  FileText: <FileText size={15} />,
};

const quickActionIcons = {
  FileText,
  Bot,
  Zap,
  LinkIcon,
  Pill,
  Calculator,
  FlaskConical,
  BookText,
};

const defaultToolLabelKeys: Record<string, TranslationKey> = {
  fix: "dashboard.toolFix",
  translate: "dashboard.toolTranslate",
  summarize: "dashboard.toolSummarize",
  labrat: "dashboard.toolLabs",
};

const defaultToolDescriptionKeys: Record<string, TranslationKey> = {
  fix: "dashboard.toolFixDescription",
  translate: "dashboard.toolTranslateDescription",
  summarize: "dashboard.toolSummarizeDescription",
  labrat: "dashboard.toolLabsDescription",
};

const fallbackQuickActions: QuickAction[] = [
  { key: "templates", href: "/malli", labelKey: "sidebar.templates", icon: "FileText", isVisible: true },
  { key: "ai-tools", href: "/ai-tools", labelKey: "sidebar.aiTools", icon: "Bot", isVisible: true },
  { key: "quick-guides", href: "/pikaohjeet-v2", labelKey: "sidebar.quickGuides", icon: "Zap", isVisible: true },
  { key: "literature", href: "/literature", labelKey: "sidebar.literature", icon: "BookText", isVisible: true },
  { key: "calculators", href: "/calculators", labelKey: "sidebar.calculators", icon: "Calculator", isVisible: true },
];

const markdownContentClassName =
  "prose prose-sm max-w-none break-words text-slate-800 prose-p:my-2 prose-p:leading-relaxed prose-p:break-words prose-li:break-words prose-code:break-words prose-code:whitespace-pre-wrap prose-pre:max-w-full prose-pre:overflow-x-auto prose-pre:whitespace-pre-wrap prose-pre:break-words";

const markdownUserContentClassName =
  "prose prose-sm max-w-none break-words text-white prose-p:my-2 prose-p:leading-relaxed prose-p:text-white prose-strong:text-white prose-li:text-white";

function PrivacyStatus({ privacy, label }: { privacy: PrivacyInfo; label: string }) {
  const hasFindings = Boolean(privacy?.anonymized && privacy.findingTypes?.length);

  return (
    <details className="group relative">
      <summary
        className={`flex cursor-pointer list-none items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-bold transition-colors [&::-webkit-details-marker]:hidden ${
          hasFindings
            ? "border-amber-200 bg-amber-50 text-amber-800"
            : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
        }`}
      >
        <ShieldCheck size={13} />
        <span>{label}</span>
      </summary>
      <div className="absolute right-0 top-full z-30 mt-2 w-[min(24rem,calc(100vw-2rem))] shadow-xl">
        <PrivacyNotice privacy={privacy} compact />
      </div>
    </details>
  );
}

export default function Dashboard() {
  const { t, language } = useI18n();
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "assistant" | "user"; content: string }>>([
    { role: "assistant", content: t("dashboard.assistantGreeting") },
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatPrivacy, setChatPrivacy] = useState<PrivacyInfo>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [toolText, setToolText] = useState("");
  const [toolResult, setToolResult] = useState("");
  const [previousToolResult, setPreviousToolResult] = useState("");
  const [refinementInstruction, setRefinementInstruction] = useState("");
  const [toolPrivacy, setToolPrivacy] = useState<PrivacyInfo>(null);
  const [toolMode, setToolMode] = useState("fix");
  const [isToolLoading, setIsToolLoading] = useState(false);
  const [isRefiningToolResult, setIsRefiningToolResult] = useState(false);
  const [aiTools, setAiTools] = useState<DefaultAiToolMetadata[]>(DEFAULT_AI_TOOL_METADATA);

  const [assistantOpen, setAssistantOpen] = useState(true);
  const [quickActions, setQuickActions] = useState<QuickAction[]>(fallbackQuickActions);
  const [workspaceContext, setWorkspaceContext] = useState<WorkspaceContext | null>(null);
  const [countries, setCountries] = useState<CountryOption[]>([]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    setMessages((current) =>
      current.length === 1 && current[0].role === "assistant"
        ? [{ role: "assistant", content: t("dashboard.assistantGreeting") }]
        : current,
    );
  }, [t]);

  useEffect(() => {
    try {
      setAssistantOpen(window.localStorage.getItem(ASSISTANT_STATE_KEY) !== "false");
    } catch (error) {
      console.error("Assistant panel state loading failed", error);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadWorkspace() {
      const [toolsResponse, navigationResponse, contextResponse] = await Promise.allSettled([
        fetch("/api/ai-tools", { cache: "no-store" }),
        fetch("/api/sidebar/visibility", { cache: "no-store" }),
        fetch("/api/profile/workspace-context", { cache: "no-store" }),
      ]);

      if (!mounted) return;

      try {
        if (toolsResponse.status === "fulfilled" && toolsResponse.value.ok) {
          const data = await toolsResponse.value.json();
          if (Array.isArray(data.tools)) setAiTools(data.tools);
        }
      } catch (error) {
        console.error(t("dashboard.aiToolsLoadingFailed"), error);
      }

      try {
        if (navigationResponse.status === "fulfilled" && navigationResponse.value.ok) {
          const data = await navigationResponse.value.json();
          if (Array.isArray(data.items)) {
            setQuickActions(data.items.filter((item: QuickAction) => item.key !== "home" && item.isVisible));
          }
        }
      } catch (error) {
        console.error("Quick actions loading failed", error);
      }

      try {
        if (contextResponse.status === "fulfilled" && contextResponse.value.ok) {
          const data = await contextResponse.value.json();
          if (data.settings) setWorkspaceContext(data.settings);
          if (Array.isArray(data.countries)) setCountries(data.countries);
        }
      } catch (error) {
        console.error("Workspace context loading failed", error);
      }
    }

    loadWorkspace();
    return () => {
      mounted = false;
    };
  }, [t]);

  const practiceCountryName = useMemo(() => {
    const country = countries.find((item) => item.code === workspaceContext?.practiceCountry);
    return country?.name?.[language] ?? country?.name?.en ?? workspaceContext?.practiceCountry ?? "...";
  }, [countries, language, workspaceContext?.practiceCountry]);

  const activeTool = aiTools.find((tool) => tool.key === toolMode) ?? aiTools[0];
  const activeToolDescription = activeTool
    ? defaultToolDescriptionKeys[activeTool.key]
      ? t(defaultToolDescriptionKeys[activeTool.key])
      : activeTool.description
    : t("dashboard.textToolDescription");

  function setAssistantVisibility(nextValue: boolean) {
    setAssistantOpen(nextValue);
    try {
      window.localStorage.setItem(ASSISTANT_STATE_KEY, String(nextValue));
    } catch (error) {
      console.error("Assistant panel state saving failed", error);
    }
  }

  function clearTool() {
    setToolText("");
    setToolResult("");
    setPreviousToolResult("");
    setRefinementInstruction("");
    setToolPrivacy(null);
  }

  async function sendMessage(overrideMessage?: string) {
    const messageToSend = overrideMessage || chatInput;
    if (!messageToSend.trim() || isChatLoading) return;

    const userMessage = { role: "user" as const, content: messageToSend };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setChatInput("");
    setIsChatLoading(true);
    setChatPrivacy(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await response.json();
      if (data.privacy) setChatPrivacy(data.privacy);
      if (data.content) {
        setMessages((current) => [...current, { role: "assistant", content: data.content }]);
      }
    } catch (error) {
      console.error("AI connection failed", error);
      setMessages((current) => [...current, { role: "assistant", content: t("dashboard.aiConnectionError") }]);
    } finally {
      setIsChatLoading(false);
    }
  }

  async function processToolText(selectedMode: string) {
    if (!toolText.trim() || isToolLoading || isRefiningToolResult) return;
    setToolMode(selectedMode);
    setIsToolLoading(true);
    setToolPrivacy(null);
    setPreviousToolResult("");
    setRefinementInstruction("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: toolText, mode: selectedMode }),
      });
      const data = await response.json();
      if (data.privacy) setToolPrivacy(data.privacy);
      if (data.content) setToolResult(data.content);
    } catch (error) {
      console.error("Text processing failed", error);
      setToolResult(t("dashboard.textProcessingError"));
    } finally {
      setIsToolLoading(false);
    }
  }

  async function refineToolResult() {
    if (!toolText.trim() || !toolResult.trim() || !refinementInstruction.trim() || isToolLoading || isRefiningToolResult) return;
    setIsRefiningToolResult(true);
    setToolPrivacy(null);

    try {
      const response = await fetch("/api/ai-tools/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        setRefinementInstruction("");
      } else if (!response.ok) {
        setToolResult(t("dashboard.textProcessingError"));
      }
    } catch (error) {
      console.error("Text refinement failed", error);
      setToolResult(t("dashboard.textProcessingError"));
    } finally {
      setIsRefiningToolResult(false);
    }
  }

  function restorePreviousToolResult() {
    if (!previousToolResult) return;
    setToolResult(previousToolResult);
    setPreviousToolResult("");
  }

  function moveResultToChat() {
    if (!toolResult) return;
    setAssistantVisibility(true);
    sendMessage(`${t("dashboard.processedTextIntro")}\n\n${toolResult}`);
  }

  return (
    <div className="min-h-full animate-in fade-in duration-300">
      <section className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <Link
          href="/settings?section=workspace"
          className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-600 transition-colors hover:text-blue-700"
          title={t("dashboard.workspaceContextSettings")}
        >
          <span className="flex items-center gap-2 font-bold text-slate-800">
            <Globe2 size={17} className="text-blue-600" />
            {practiceCountryName}
          </span>
          <span className="h-4 w-px bg-slate-200" />
          <span>{t("dashboard.clinicalCountryShort")}: <strong className="text-slate-800">{workspaceContext?.clinicalCountry ?? "..."}</strong></span>
          <span>{t("dashboard.clinicalLanguageShort")}: <strong className="text-slate-800">{workspaceContext?.clinicalOutputLanguage ?? "..."}</strong></span>
          <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">
            {workspaceContext?.evidenceStrictness ? t(`dashboard.evidenceMode${workspaceContext.evidenceStrictness === "strict" ? "Strict" : workspaceContext.evidenceStrictness === "balanced" ? "Balanced" : "Local"}` as TranslationKey) : "..."}
          </span>
        </Link>
        {!assistantOpen && (
          <button
            type="button"
            onClick={() => setAssistantVisibility(true)}
            className="flex items-center gap-2 rounded-md border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50"
          >
            <PanelRightOpen size={16} /> {t("dashboard.openAssistant")}
          </button>
        )}
      </section>

      <section className="mb-4 flex items-center gap-3 overflow-hidden rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <div className="hidden shrink-0 items-center gap-2 border-r border-slate-200 pr-3 text-xs font-bold text-slate-500 md:flex">
          <Sparkles size={15} className="text-blue-600" /> {t("dashboard.quickAccess")}
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto py-0.5 custom-scrollbar">
          {quickActions.map((item) => {
            const Icon = quickActionIcons[item.icon] ?? FileText;
            return (
              <Link
                key={item.key}
                href={item.href}
                className="flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
              >
                <Icon size={15} /> {t(item.labelKey)}
              </Link>
            );
          })}
        </div>
        <Link
          href="/settings?section=navigation"
          title={t("dashboard.customizeQuickAccess")}
          aria-label={t("dashboard.customizeQuickAccess")}
          className="shrink-0 rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <SlidersHorizontal size={17} />
        </Link>
      </section>

      <div className={`grid min-w-0 gap-4 ${assistantOpen ? "xl:grid-cols-[minmax(0,1fr)_360px]" : "grid-cols-1"}`}>
        <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                <FileText size={19} />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-base font-bold text-slate-900">{t("dashboard.textToolTitle")}</h1>
                <p className="truncate text-xs text-slate-500">{activeToolDescription}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <PrivacyStatus privacy={toolPrivacy} label={t("dashboard.privacyEnabled")} />
              <Link
                href="/ai-tools"
                title={t("dashboard.manageAiTools")}
                aria-label={t("dashboard.manageAiTools")}
                className="rounded-md border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:text-blue-700"
              >
                <Settings size={15} />
              </Link>
              <button
                type="button"
                onClick={clearTool}
                title={t("dashboard.clearToolTitle")}
                aria-label={t("dashboard.clearToolTitle")}
                className="rounded-md border border-slate-200 p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
              >
                <RotateCcw size={15} />
              </button>
            </div>
          </header>

          <div className="p-4">
            <textarea
              value={toolText}
              onChange={(event) => setToolText(event.target.value)}
              placeholder={t("dashboard.textAreaPlaceholder")}
              className="min-h-[270px] w-full resize-y rounded-lg border border-slate-200 bg-slate-50/40 p-4 text-sm font-medium outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
            />

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {aiTools.length > 0 ? (
                aiTools.map((tool) => (
                  <button
                    key={tool.key}
                    type="button"
                    onClick={() => processToolText(tool.key)}
                    disabled={isToolLoading || isRefiningToolResult || !toolText.trim()}
                    title={defaultToolDescriptionKeys[tool.key] ? t(defaultToolDescriptionKeys[tool.key]) : tool.description}
                    className={`flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-45 ${
                      toolMode === tool.key
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700"
                    }`}
                  >
                    {isToolLoading && toolMode === tool.key ? <Loader2 size={15} className="animate-spin" /> : aiToolIcons[tool.icon]}
                    {defaultToolLabelKeys[tool.key] ? t(defaultToolLabelKeys[tool.key]) : tool.label}
                  </button>
                ))
              ) : (
                <div className="text-xs text-slate-500">{t("dashboard.noVisibleAiTools")}</div>
              )}
            </div>
          </div>

          {toolResult && (
            <div className="border-t border-blue-100 bg-blue-50/40 px-4 py-5 animate-in fade-in duration-200">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xs font-black uppercase text-slate-500">{t("dashboard.resultTitle")}</h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={moveResultToChat}
                    className="flex items-center gap-2 rounded-md border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-600 hover:text-white"
                  >
                    <MessageSquareShare size={15} /> {t("dashboard.moveToChat")}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(toolResult)}
                    title={t("common.copy")}
                    aria-label={t("common.copy")}
                    className="rounded-md border border-blue-200 bg-white p-2 text-blue-700 hover:bg-blue-600 hover:text-white"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>
              <ReactMarkdown className={markdownContentClassName}>{toolResult}</ReactMarkdown>

              <div className="mt-5 border-t border-blue-100 pt-4">
                <label className="text-xs font-bold text-slate-600" htmlFor="refinement-instruction">
                  {t("dashboard.refineResultTitle")}
                </label>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <textarea
                    id="refinement-instruction"
                    value={refinementInstruction}
                    onChange={(event) => setRefinementInstruction(event.target.value)}
                    placeholder={t("dashboard.refineResultPlaceholder")}
                    className="min-h-20 flex-1 resize-y rounded-lg border border-blue-100 bg-white p-3 text-xs outline-none focus:border-blue-400"
                  />
                  <div className="flex items-end gap-2">
                    <button
                      type="button"
                      onClick={restorePreviousToolResult}
                      disabled={!previousToolResult || isToolLoading || isRefiningToolResult}
                      title={t("dashboard.restorePreviousResult")}
                      aria-label={t("dashboard.restorePreviousResult")}
                      className="rounded-md border border-slate-200 bg-white p-2.5 text-slate-500 disabled:opacity-40"
                    >
                      <RotateCcw size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={refineToolResult}
                      disabled={!refinementInstruction.trim() || isToolLoading || isRefiningToolResult}
                      className="flex h-10 items-center gap-2 rounded-md bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 disabled:bg-slate-300"
                    >
                      {isRefiningToolResult && <Loader2 size={14} className="animate-spin" />}
                      {t("dashboard.refineResultButton")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {assistantOpen && (
          <aside className="flex min-h-[560px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm xl:sticky xl:top-0 xl:h-[calc(100vh-12rem)]">
            <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white">
                  <Bot size={18} />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-slate-900">{t("dashboard.assistantTitle")}</div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {t("dashboard.assistantReady")}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <PrivacyStatus privacy={chatPrivacy} label={t("dashboard.privacyShort")} />
                <button
                  type="button"
                  onClick={() => setAssistantVisibility(false)}
                  title={t("dashboard.closeAssistant")}
                  aria-label={t("dashboard.closeAssistant")}
                  className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <PanelRightClose size={17} />
                </button>
              </div>
            </header>

            <div className="custom-scrollbar flex-1 space-y-3 overflow-auto bg-slate-50/40 p-4">
              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`min-w-0 max-w-[92%] overflow-hidden rounded-lg px-3.5 py-3 text-[13px] leading-relaxed ${
                      message.role === "user"
                        ? "bg-blue-600 text-white"
                        : "border border-slate-200 bg-white text-slate-800"
                    }`}
                  >
                    <ReactMarkdown className={message.role === "user" ? markdownUserContentClassName : markdownContentClassName}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="flex gap-1.5 rounded-lg border border-slate-200 bg-white p-3">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400 [animation-delay:0.2s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400 [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="border-t border-slate-100 bg-white p-3">
              <div className="flex items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1.5 focus-within:border-blue-400">
                <textarea
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      sendMessage();
                    }
                  }}
                  rows={1}
                  placeholder={t("dashboard.chatPlaceholder")}
                  className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm font-medium outline-none"
                />
                <button
                  type="button"
                  onClick={() => sendMessage()}
                  disabled={isChatLoading || !chatInput.trim()}
                  title={t("dashboard.sendMessage")}
                  aria-label={t("dashboard.sendMessage")}
                  className="rounded-md bg-blue-600 p-2.5 text-white hover:bg-blue-700 disabled:bg-slate-200"
                >
                  <Send size={17} />
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
      `}</style>
    </div>
  );
}
