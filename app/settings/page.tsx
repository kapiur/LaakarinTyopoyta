"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Bot,
  BrainCircuit,
  Compass,
  DatabaseZap,
  KeyRound,
  KeySquare,
  LayoutPanelTop,
  Settings,
  Shield,
  Users,
  Workflow,
} from "lucide-react";
import PracticeCountrySettingsCard from "../../components/PracticeCountrySettingsCard";
import LanguageSettingsCard from "../../components/LanguageSettingsCard";
import AiProfileSettingsCard from "../../components/AiProfileSettingsCard";
import AiProviderSettingsCard from "../../components/AiProviderSettingsCard";
import CalculatorVisibilitySettingsCard from "../../components/CalculatorVisibilitySettingsCard";
import ClinicalEvidenceSettingsCard from "../../components/ClinicalEvidenceSettingsCard";
import SidebarVisibilitySettingsCard from "../../components/SidebarVisibilitySettingsCard";
import { useI18n } from "../../lib/useI18n";

type SettingsSectionId = "workspace" | "navigation" | "ai" | "account" | "admin";

type SectionMeta = {
  id: SettingsSectionId;
  title: string;
  description: string;
  icon: typeof Compass;
};

type QuickActionCardProps = {
  href: string;
  title: string;
  description: string;
  caption?: string;
  icon: typeof KeyRound;
  accent: string;
};

function QuickActionCard({ href, title, description, caption, icon: Icon, accent }: QuickActionCardProps) {
  return (
    <Link href={href} className="group bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform ${accent}`}>
          <Icon size={24} />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500">{description}</p>
          {caption ? <p className="text-xs font-semibold uppercase tracking-wider pt-2">{caption}</p> : null}
        </div>
      </div>
    </Link>
  );
}

function SettingsPageContent() {
  const { data: session } = useSession();
  const { t, language } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAdmin = (session?.user as any)?.role === "ADMIN";

  const copy = useMemo(() => {
    const isRu = language === "ru";
    const isEn = language === "en";

    return {
      navTitle: isRu ? "Разделы настроек" : isEn ? "Settings sections" : "Asetusten osiot",
      navDescription: isRu
        ? "Открывайте только тот блок, который нужен сейчас. Так настройки остаются управляемыми, а не бесконечной страницей."
        : isEn
          ? "Open only the block you need right now. This keeps settings navigable instead of turning into one endless page."
          : "Avaa vain se osio, jota tarvitset juuri nyt. Näin asetukset pysyvät hallittavina eivätkä veny yhdeksi pitkäksi sivuksi.",
      sectionDescriptions: {
        workspace: isRu
          ? "Страна работы, язык интерфейса и клинический контекст."
          : isEn
            ? "Practice country, interface language, and clinical context."
            : "Työskentelymaa, käyttöliittymän kieli ja kliininen konteksti.",
        navigation: isRu
          ? "Настройка того, какие инструменты и разделы вы видите в рабочем столе."
          : isEn
            ? "Control which tools and sections are visible in your workspace."
            : "Säädä, mitkä työkalut ja osiot näkyvät omassa työpöydässäsi.",
        ai: isRu
          ? "Профиль AI, предпочтения модели и быстрый доступ к AI-агенту."
          : isEn
            ? "AI profile, model preferences, and quick access to the AI agent."
            : "AI-profiili, malliasetukset ja pikapääsy AI-agenttiin.",
        account: isRu
          ? "Безопасность аккаунта и личные служебные настройки."
          : isEn
            ? "Account security and personal operational settings."
            : "Tilin turvallisuus ja henkilökohtaiset käyttöasetukset.",
        admin: isRu
          ? "Управление пользователями, источниками и политиками AI."
          : isEn
            ? "Manage users, sources, and AI policies."
            : "Hallitse käyttäjiä, lähteitä ja AI-politiikkoja.",
      },
      accountTitle: isRu ? "Аккаунт и безопасность" : isEn ? "Account and security" : "Tili ja turvallisuus",
      accountDescription: isRu
        ? "Ключевые настройки, связанные с доступом и ежедневной работой с аккаунтом."
        : isEn
          ? "Core settings related to access and your day-to-day account workflow."
          : "Keskeiset asetukset, jotka liittyvät kirjautumiseen ja tilin päivittäiseen käyttöön.",
      aiSectionTitle: isRu ? "AI-рабочее пространство" : isEn ? "AI workspace" : "AI-työtila",
      aiSectionDescription: isRu
        ? "Личный AI-контекст и способы работы помощника под ваш клинический стиль."
        : isEn
          ? "Your personal AI context and how the assistant works with your clinical style."
          : "Oma AI-kontekstisi ja tapa, jolla avustaja toimii kliinisen tyylisi tukena.",
      adminTitle: isRu ? "Администрирование" : isEn ? "Administration" : "Ylläpito",
      adminDescription: isRu
        ? "Системные функции, которые влияют на пользователей, источники и AI-доступ."
        : isEn
          ? "System-level controls affecting users, sources, and AI access."
          : "Järjestelmätason asetukset, jotka vaikuttavat käyttäjiin, lähteisiin ja AI-käyttöön.",
      securityCaption: session?.user?.email ?? undefined,
      agentCaption: "MVP",
      adminCaption: "Admin",
      adminNoticeTitle: t("settings.adminNoticeTitle"),
      adminNotice: t("settings.adminNotice"),
    };
  }, [language, session?.user?.email, t]);

  const sectionItems = useMemo<SectionMeta[]>(() => {
    const base: SectionMeta[] = [
      {
        id: "workspace",
        title: language === "ru" ? "Рабочий контекст" : language === "en" ? "Workspace context" : "Työympäristön konteksti",
        description: copy.sectionDescriptions.workspace,
        icon: Compass,
      },
      {
        id: "navigation",
        title: language === "ru" ? "Навигация и инструменты" : language === "en" ? "Navigation and tools" : "Navigaatio ja työkalut",
        description: copy.sectionDescriptions.navigation,
        icon: LayoutPanelTop,
      },
      {
        id: "ai",
        title: language === "ru" ? "AI" : language === "en" ? "AI" : "AI",
        description: copy.sectionDescriptions.ai,
        icon: Bot,
      },
      {
        id: "account",
        title: language === "ru" ? "Аккаунт" : language === "en" ? "Account" : "Tili",
        description: copy.sectionDescriptions.account,
        icon: Shield,
      },
    ];

    if (isAdmin) {
      base.push({
        id: "admin",
        title: copy.adminTitle,
        description: copy.sectionDescriptions.admin,
        icon: BrainCircuit,
      });
    }

    return base;
  }, [copy, isAdmin, language]);

  const validSectionIds = new Set(sectionItems.map((item) => item.id));
  const requestedSection = searchParams.get("section") as SettingsSectionId | null;
  const activeSection: SettingsSectionId =
    requestedSection && validSectionIds.has(requestedSection) ? requestedSection : "workspace";

  const setActiveSection = (section: SettingsSectionId) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("section", section);
    router.replace(`/settings?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg">
          <Settings size={26} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t("settings.title")}</h1>
          <p className="text-sm text-slate-500">{t("settings.subtitle")}</p>
        </div>
      </header>

      <section className="bg-white border border-slate-200 rounded-[2rem] p-5 shadow-sm space-y-4 sticky top-4 z-10">
        <div>
          <h2 className="text-sm font-bold text-slate-800">{copy.navTitle}</h2>
          <p className="text-sm text-slate-500 mt-1">{copy.navDescription}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          {sectionItems.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;

            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={`text-left rounded-2xl border px-4 py-4 transition-all ${
                  isActive
                    ? "border-blue-200 bg-blue-50 shadow-sm"
                    : "border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                  isActive ? "bg-blue-100 text-blue-600" : "bg-white text-slate-500 border border-slate-200"
                }`}>
                  <Icon size={18} />
                </div>
                <div className={`text-sm font-bold ${isActive ? "text-blue-700" : "text-slate-800"}`}>{section.title}</div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{section.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      {activeSection === "workspace" && (
        <section className="space-y-6">
          <PracticeCountrySettingsCard />
          <LanguageSettingsCard />
          <ClinicalEvidenceSettingsCard />
        </section>
      )}

      {activeSection === "navigation" && (
        <section className="space-y-6">
          <SidebarVisibilitySettingsCard />
          <CalculatorVisibilitySettingsCard />
        </section>
      )}

      {activeSection === "ai" && (
        <section className="space-y-6">
          <section className="bg-slate-50 border border-slate-200 rounded-[2rem] p-6">
            <h2 className="text-lg font-bold text-slate-900">{copy.aiSectionTitle}</h2>
            <p className="text-sm text-slate-500 mt-1">{copy.aiSectionDescription}</p>
          </section>

          <AiProfileSettingsCard />
          <AiProviderSettingsCard />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <QuickActionCard
              href="/agent"
              title={t("settings.agentTitle")}
              description={t("settings.agentDescription")}
              caption={copy.agentCaption}
              icon={Bot}
              accent="bg-purple-50 text-purple-600"
            />
          </div>
        </section>
      )}

      {activeSection === "account" && (
        <section className="space-y-6">
          <section className="bg-slate-50 border border-slate-200 rounded-[2rem] p-6">
            <h2 className="text-lg font-bold text-slate-900">{copy.accountTitle}</h2>
            <p className="text-sm text-slate-500 mt-1">{copy.accountDescription}</p>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <QuickActionCard
              href="/profile/security"
              title={t("settings.securityTitle")}
              description={t("settings.securityDescription")}
              caption={copy.securityCaption}
              icon={KeyRound}
              accent="bg-blue-50 text-blue-600"
            />
          </div>
        </section>
      )}

      {activeSection === "admin" && isAdmin && (
        <section className="space-y-6">
          <section className="bg-slate-50 border border-slate-200 rounded-[2rem] p-6">
            <h2 className="text-lg font-bold text-slate-900">{copy.adminTitle}</h2>
            <p className="text-sm text-slate-500 mt-1">{copy.adminDescription}</p>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <QuickActionCard
              href="/admin/users"
              title={t("settings.userManagementTitle")}
              description={t("settings.userManagementDescription")}
              caption={copy.adminCaption}
              icon={Users}
              accent="bg-slate-900 text-white"
            />

            <QuickActionCard
              href="/admin/ai-access"
              title={t("settings.aiAccessTitle")}
              description={t("settings.aiAccessDescription")}
              caption={copy.adminCaption}
              icon={BrainCircuit}
              accent="bg-purple-50 text-purple-600"
            />

            <QuickActionCard
              href="/admin/ai-providers"
              title={t("settings.aiApiKeysTitle")}
              description={t("settings.aiApiKeysDescription")}
              caption={copy.adminCaption}
              icon={KeySquare}
              accent="bg-amber-50 text-amber-600"
            />

            <QuickActionCard
              href="/admin/clinical-sources"
              title={language === "ru" ? "Клинические источники" : language === "en" ? "Clinical sources" : "Kliiniset lähteet"}
              description={
                language === "ru"
                  ? "Управление странами, уровнем доверия, приоритетами и разрешёнными доменами источников."
                  : language === "en"
                    ? "Manage countries, trust levels, priorities, and allowed source domains."
                    : "Hallitse maita, luottamustasoja, prioriteetteja ja sallittuja lähdedomaineja."
              }
              caption={copy.adminCaption}
              icon={DatabaseZap}
              accent="bg-emerald-50 text-emerald-600"
            />
          </div>

          <section className="bg-slate-50 border border-slate-200 rounded-[2rem] p-6 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-500 flex items-center justify-center">
              <Workflow size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">{copy.adminNoticeTitle}</h2>
              <p className="text-sm text-slate-500 mt-1">{copy.adminNotice}</p>
            </div>
          </section>
        </section>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="max-w-6xl mx-auto" />}>
      <SettingsPageContent />
    </Suspense>
  );
}
