"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Bot, BrainCircuit, DatabaseZap, KeyRound, KeySquare, Settings, Shield, Users } from "lucide-react";
import PracticeCountrySettingsCard from "../../components/PracticeCountrySettingsCard";
import LanguageSettingsCard from "../../components/LanguageSettingsCard";
import AiProfileSettingsCard from "../../components/AiProfileSettingsCard";
import AiProviderSettingsCard from "../../components/AiProviderSettingsCard";
import CalculatorVisibilitySettingsCard from "../../components/CalculatorVisibilitySettingsCard";
import ClinicalEvidenceSettingsCard from "../../components/ClinicalEvidenceSettingsCard";
import { useI18n } from "../../lib/useI18n";

export default function SettingsPage() {
  const { data: session } = useSession();
  const { t, language } = useI18n();
  const isAdmin = (session?.user as any)?.role === "ADMIN";

  const clinicalSourcesTitle = language === "ru" ? "Клинические источники" : language === "en" ? "Clinical sources" : "Kliiniset lähteet";
  const clinicalSourcesDescription = language === "ru"
    ? "Управление странами, trust level, priority и разрешёнными доменами источников."
    : language === "en"
      ? "Manage countries, trust levels, priorities and allowed source domains."
      : "Hallitse maita, trust level -arvoja, prioriteetteja ja sallittuja lähdedomaineja.";

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg">
          <Settings size={26} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t("settings.title")}</h1>
          <p className="text-sm text-slate-500">{t("settings.subtitle")}</p>
        </div>
      </header>

      <PracticeCountrySettingsCard />
      <LanguageSettingsCard />
      <ClinicalEvidenceSettingsCard />
      <CalculatorVisibilitySettingsCard />
      <AiProfileSettingsCard />
      <AiProviderSettingsCard />

      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Link href="/profile/security" className="group bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition-all">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <KeyRound size={24} />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-900">{t("settings.securityTitle")}</h2>
              <p className="text-sm text-slate-500">{t("settings.securityDescription")}</p>
              <p className="text-xs font-semibold text-slate-400 pt-2">{session?.user?.email}</p>
            </div>
          </div>
        </Link>

        <Link href="/agent" className="group bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm hover:shadow-md hover:border-purple-200 transition-all">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Bot size={24} />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-900">{t("settings.agentTitle")}</h2>
              <p className="text-sm text-slate-500">{t("settings.agentDescription")}</p>
              <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider pt-2">MVP</p>
            </div>
          </div>
        </Link>

        {isAdmin && (
          <>
            <Link href="/admin/users" className="group bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition-all">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Users size={24} />
                </div>
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-slate-900">{t("settings.userManagementTitle")}</h2>
                  <p className="text-sm text-slate-500">{t("settings.userManagementDescription")}</p>
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider pt-2">Admin</p>
                </div>
              </div>
            </Link>

            <Link href="/admin/ai-providers" className="group bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm hover:shadow-md hover:border-amber-200 transition-all">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <KeySquare size={24} />
                </div>
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-slate-900">{t("settings.aiApiKeysTitle")}</h2>
                  <p className="text-sm text-slate-500">{t("settings.aiApiKeysDescription")}</p>
                  <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider pt-2">Admin</p>
                </div>
              </div>
            </Link>

            <Link href="/admin/ai-access" className="group bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm hover:shadow-md hover:border-purple-200 transition-all">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <BrainCircuit size={24} />
                </div>
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-slate-900">{t("settings.aiAccessTitle")}</h2>
                  <p className="text-sm text-slate-500">{t("settings.aiAccessDescription")}</p>
                  <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider pt-2">Admin</p>
                </div>
              </div>
            </Link>

            <Link href="/admin/clinical-sources" className="group bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <DatabaseZap size={24} />
                </div>
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-slate-900">{clinicalSourcesTitle}</h2>
                  <p className="text-sm text-slate-500">{clinicalSourcesDescription}</p>
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider pt-2">Admin</p>
                </div>
              </div>
            </Link>
          </>
        )}
      </section>

      {isAdmin && (
        <section className="bg-slate-50 border border-slate-200 rounded-[2rem] p-6 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-500 flex items-center justify-center">
            <Shield size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">{t("settings.adminNoticeTitle")}</h2>
            <p className="text-sm text-slate-500 mt-1">{t("settings.adminNotice")}</p>
          </div>
        </section>
      )}
    </div>
  );
}
