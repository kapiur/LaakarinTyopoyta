"use client";

import { useMemo, useState } from "react";
import { Bot, Clipboard, Loader2, Send, ShieldCheck, Sparkles } from "lucide-react";
import { useI18n } from "../../lib/useI18n";

type AgentContextType = "general" | "malli" | "aiTool" | "clinicalText" | "pikaohje";

type AgentSuggestedAction = {
  type: string;
  label: string;
};

type AgentEvidence = {
  status: "found" | "partial" | "not_found" | "not_required";
  level: string;
  clinicalCountry: string;
  clinicalOutputLanguage: string;
  requiresEvidence: boolean;
  sources: Array<{ id: string; name: string; sourceType: string; trustLevel: string; baseUrl?: string }>;
  warnings?: string[];
  unsupportedClaims?: string[];
};

type AgentResponse = {
  reply: string;
  draft?: string;
  suggestedActions?: AgentSuggestedAction[];
  taskType?: string;
  provider?: string | null;
  model?: string | null;
  evidence?: AgentEvidence;
  privacy?: {
    anonymized: boolean;
    findingTypes: string[];
  };
};

type AgentTurn = {
  userMessage: string;
  response: AgentResponse;
};

type AgentPanelProps = {
  defaultContextType?: AgentContextType;
  initialText?: string;
  initialTemplate?: string;
  compact?: boolean;
  onApplyDraft?: (draft: string) => void;
};

const localLabels = {
  fi: {
    contextPikaohje: "Pikaohje",
    contextPikaohjeDescription: "Luo tai tarkista kliinistä pikaohjetta",
    evidenceTitle: "Näyttö",
    clinicalCountry: "Kliininen maa",
    clinicalLanguage: "Kliininen kieli",
    sources: "Lähteet",
    applyDraft: "Käytä luonnosta editorissa",
    appliedDraft: "Luonnos siirretty editoriin",
    followUpLabel: "Tarkenna tätä tulosta",
    followUpPlaceholder: "Esim. tee lyhyempi, säilytä muuttujat, lisää rakenne...",
    sendFollowUp: "Lähetä tarkennus",
    conversationTitle: "Keskustelu",
    turnUser: "Käyttäjä",
    turnAssistant: "Agentti",
  },
  ru: {
    contextPikaohje: "Быстрая инструкция",
    contextPikaohjeDescription: "Создать или проверить клиническую карточку",
    evidenceTitle: "Источники",
    clinicalCountry: "Страна рекомендаций",
    clinicalLanguage: "Клинический язык",
    sources: "Источники",
    applyDraft: "Применить draft в редакторе",
    appliedDraft: "Draft перенесён в редактор",
    followUpLabel: "Уточнить этот результат",
    followUpPlaceholder: "Например: сделай короче, сохрани переменные, добавь структуру...",
    sendFollowUp: "Отправить уточнение",
    conversationTitle: "Диалог",
    turnUser: "Пользователь",
    turnAssistant: "Агент",
  },
  en: {
    contextPikaohje: "Quick guide",
    contextPikaohjeDescription: "Create or review a clinical quick guide",
    evidenceTitle: "Evidence",
    clinicalCountry: "Clinical country",
    clinicalLanguage: "Clinical language",
    sources: "Sources",
    applyDraft: "Use draft in editor",
    appliedDraft: "Draft moved to editor",
    followUpLabel: "Refine this result",
    followUpPlaceholder: "For example: make it shorter, keep variables, add structure...",
    sendFollowUp: "Send refinement",
    conversationTitle: "Conversation",
    turnUser: "User",
    turnAssistant: "Agent",
  },
} as const;

async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
}

export default function AgentPanel({ defaultContextType = "general", initialText = "", initialTemplate = "", compact = false, onApplyDraft }: AgentPanelProps) {
  const { t, language } = useI18n();
  const l = localLabels[language] || localLabels.fi;
  const [contextType, setContextType] = useState<AgentContextType>(defaultContextType);
  const [userMessage, setUserMessage] = useState("");
  const [followUpMessage, setFollowUpMessage] = useState("");
  const [currentText, setCurrentText] = useState(initialText);
  const [currentTemplate, setCurrentTemplate] = useState(initialTemplate);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<AgentResponse | null>(null);
  const [turns, setTurns] = useState<AgentTurn[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const contextOptions = useMemo<Array<{ value: AgentContextType; label: string; description: string }>>(() => [
    { value: "general", label: t("agent.contextGeneral"), description: t("agent.contextGeneralDescription") },
    { value: "clinicalText", label: t("agent.contextClinicalText"), description: t("agent.contextClinicalTextDescription") },
    { value: "malli", label: t("agent.contextMalli"), description: t("agent.contextMalliDescription") },
    { value: "aiTool", label: t("agent.contextAiTool"), description: t("agent.contextAiToolDescription") },
    { value: "pikaohje", label: l.contextPikaohje, description: l.contextPikaohjeDescription },
  ], [t, l]);

  const selectedContext = useMemo(() => contextOptions.find((option) => option.value === contextType), [contextOptions, contextType]);
  const visibleHistory = turns.slice(0, -1);

  async function callAgent(message: string, previousTurns: AgentTurn[]) {
    setLoading(true);
    setError(null);
    setCopied(null);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contextType,
          uiLanguage: language,
          userMessage: message,
          currentText,
          currentTemplate,
          conversationContext: {
            latestDraft: response?.draft || response?.reply || "",
            previousTurns: previousTurns.map((turn) => ({
              userMessage: turn.userMessage,
              assistantReply: turn.response.reply,
              assistantDraft: turn.response.draft,
              taskType: turn.response.taskType,
            })),
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.details || t("agent.callFailed"));
      }

      setResponse(data);
      setTurns([...previousTurns, { userMessage: message, response: data }]);
    } catch (err: any) {
      setError(err.message || t("agent.callFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function sendToAgent() {
    const message = userMessage.trim();
    if (!message && !currentText.trim() && !currentTemplate.trim()) return;
    await callAgent(message, []);
  }

  async function sendFollowUp() {
    const message = followUpMessage.trim();
    if (!message || turns.length === 0) return;
    setFollowUpMessage("");
    await callAgent(message, turns);
  }

  async function copyValue(label: string, value?: string) {
    if (!value) return;
    await copyToClipboard(value);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 2000);
  }

  function applyDraft(value?: string) {
    if (!value || !onApplyDraft) return;
    onApplyDraft(value);
    setCopied(l.appliedDraft);
    window.setTimeout(() => setCopied(null), 2500);
  }

  const canSend = userMessage.trim().length > 0 || currentText.trim().length > 0 || currentTemplate.trim().length > 0;
  const canSendFollowUp = followUpMessage.trim().length > 0 && turns.length > 0;

  return (
    <section className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
      <header className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Bot size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{t("agent.title")}</h2>
            <p className="text-sm text-slate-500">{t("agent.description")}</p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-full">
          <ShieldCheck size={14} />
          {t("agent.privacyBadge")}
        </div>
      </header>

      <div className={`p-6 grid grid-cols-1 ${compact ? "" : "xl:grid-cols-2"} gap-6`}>
        <div className="space-y-4">
          <label className="space-y-1 block">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t("agent.contextLabel")}</span>
            <select
              value={contextType}
              onChange={(event) => setContextType(event.target.value as AgentContextType)}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-purple-100"
            >
              {contextOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            {selectedContext && <p className="text-xs text-slate-400">{selectedContext.description}</p>}
          </label>

          <label className="space-y-1 block">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t("agent.requestLabel")}</span>
            <textarea
              value={userMessage}
              onChange={(event) => setUserMessage(event.target.value)}
              rows={4}
              placeholder={t("agent.requestPlaceholder")}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-purple-100 resize-y"
            />
          </label>

          <label className="space-y-1 block">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t("agent.currentTextLabel")}</span>
            <textarea
              value={currentText}
              onChange={(event) => setCurrentText(event.target.value)}
              rows={7}
              placeholder={t("agent.currentTextPlaceholder")}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-purple-100 resize-y"
            />
          </label>

          <label className="space-y-1 block">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t("agent.currentTemplateLabel")}</span>
            <textarea
              value={currentTemplate}
              onChange={(event) => setCurrentTemplate(event.target.value)}
              rows={5}
              placeholder={t("agent.currentTemplatePlaceholder")}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-purple-100 resize-y"
            />
          </label>

          <button
            onClick={sendToAgent}
            disabled={loading || !canSend}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {t("agent.send")}
          </button>
        </div>

        <div className="space-y-4">
          {visibleHistory.length > 0 && (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-4 space-y-3">
              <h3 className="text-sm font-bold text-slate-900">{l.conversationTitle}</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {visibleHistory.map((turn, index) => (
                  <div key={index} className="rounded-2xl bg-slate-50 border border-slate-100 p-3 text-xs text-slate-600 space-y-2">
                    <div><span className="font-bold text-slate-800">{l.turnUser}:</span> {turn.userMessage}</div>
                    <div className="whitespace-pre-wrap"><span className="font-bold text-slate-800">{l.turnAssistant}:</span> {turn.response.draft || turn.response.reply}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-2xl bg-red-50 border border-red-100 text-red-700 px-5 py-4 text-sm font-semibold">
              {error}
            </div>
          )}

          {!response && !error && (
            <div className="rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
              <Sparkles className="mx-auto mb-3 text-slate-400" size={28} />
              <p className="text-sm font-semibold">{t("agent.emptyTitle")}</p>
              <p className="text-xs mt-1">{t("agent.emptyDescription")}</p>
            </div>
          )}

          {response && (
            <>
              <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5 space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                  {response.taskType && <span className="px-2 py-1 rounded-full bg-white border border-slate-200">{response.taskType}</span>}
                  {response.provider && <span className="px-2 py-1 rounded-full bg-white border border-slate-200">{response.provider}</span>}
                  {response.model && <span className="px-2 py-1 rounded-full bg-white border border-slate-200">{response.model}</span>}
                  {response.privacy && (
                    <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                      {response.privacy.anonymized ? t("agent.privacyAnonymized") : t("agent.privacyOk")}
                    </span>
                  )}
                </div>

                {response.evidence && (
                  <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-2 text-xs text-slate-600">
                    <div className="flex flex-wrap gap-2 font-bold">
                      <span>{l.evidenceTitle}: {response.evidence.status}</span>
                      <span>{l.clinicalCountry}: {response.evidence.clinicalCountry}</span>
                      <span>{l.clinicalLanguage}: {response.evidence.clinicalOutputLanguage}</span>
                    </div>
                    {response.evidence.sources.length > 0 && (
                      <div>
                        <div className="font-bold text-slate-700 mb-1">{l.sources}</div>
                        <ul className="list-disc pl-5 space-y-1">
                          {response.evidence.sources.map((source) => (
                            <li key={source.id}>{source.name} · {source.trustLevel}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {response.evidence.warnings && response.evidence.warnings.length > 0 && (
                      <div className="rounded-xl bg-amber-50 border border-amber-100 text-amber-800 p-3 font-semibold">
                        {response.evidence.warnings.join(" ")}
                      </div>
                    )}
                  </div>
                )}

                <div className="prose prose-sm max-w-none whitespace-pre-wrap text-slate-800">
                  {response.reply}
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <button onClick={() => copyValue("reply", response.reply)} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50">
                    <Clipboard size={14} /> {t("agent.copyReply")}
                  </button>
                  {response.draft && (
                    <button onClick={() => copyValue("draft", response.draft)} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50">
                      <Clipboard size={14} /> {t("agent.copyDraft")}
                    </button>
                  )}
                  {onApplyDraft && response.draft && (
                    <button onClick={() => applyDraft(response.draft)} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-purple-100 bg-purple-50 text-xs font-bold text-purple-700 hover:bg-purple-100">
                      <Sparkles size={14} /> {l.applyDraft}
                    </button>
                  )}
                  {copied && <span className="text-xs font-bold text-emerald-600 self-center">{t("agent.copiedLabel")}: {copied}</span>}
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white p-5 space-y-3">
                <label className="space-y-2 block">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{l.followUpLabel}</span>
                  <textarea
                    value={followUpMessage}
                    onChange={(event) => setFollowUpMessage(event.target.value)}
                    rows={3}
                    placeholder={l.followUpPlaceholder}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-purple-100 resize-y"
                  />
                </label>
                <button
                  onClick={sendFollowUp}
                  disabled={loading || !canSendFollowUp}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  {l.sendFollowUp}
                </button>
              </div>

              {response.suggestedActions && response.suggestedActions.length > 0 && (
                <div className="rounded-[2rem] border border-slate-200 bg-white p-5">
                  <h3 className="text-sm font-bold text-slate-900 mb-3">{t("agent.suggestedActions")}</h3>
                  <div className="flex flex-wrap gap-2">
                    {response.suggestedActions.map((action, index) => (
                      <button
                        key={`${action.type}-${index}`}
                        onClick={() => copyValue(action.type, response.draft || response.reply)}
                        className="px-3 py-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-100 text-xs font-bold hover:bg-purple-100"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-3">{t("agent.suggestedActionsNotice")}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
