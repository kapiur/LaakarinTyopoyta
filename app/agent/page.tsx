"use client";

import AgentPanel from "../../components/ai-agent/AgentPanel";
import { useI18n } from "../../lib/useI18n";

export default function AgentPage() {
  const { t } = useI18n();

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <header className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-purple-600 mb-2">{t("agent.pageEyebrow")}</p>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t("agent.pageTitle")}</h1>
        <p className="text-sm text-slate-500 mt-2 max-w-3xl">
          {t("agent.pageDescription")}
        </p>
      </header>

      <AgentPanel defaultContextType="clinicalText" />
    </div>
  );
}
