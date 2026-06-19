"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, ExternalLink, FileText, Loader2 } from "lucide-react";
import type { ComponentType } from "react";
import type { InlineWorkspaceModuleId } from "../../lib/dashboard/workspaceModuleRegistry";
import { inlineWorkspaceModules } from "../../lib/dashboard/workspaceModuleRegistry";
import { useI18n } from "../../lib/useI18n";
import { homeActionIconMap } from "./homeActionIcons";

type EmbeddedCalculatorProps = {
  embedded?: boolean;
  onDiscussResult?: (content: string) => void;
};

const BmiCalculator = dynamic(() => import("../calculators/BmiCalculator"), { loading: Loading });
const GfrCalculator = dynamic(() => import("../calculators/GfrCalculator"), { loading: Loading });
const ChadsCalculator = dynamic(() => import("../../app/calculators/chads/page"), { loading: Loading });
const PeCalculator = dynamic(() => import("../../app/calculators/pe/page"), { loading: Loading });
const VteCalculator = dynamic(() => import("../../app/calculators/vte/page"), { loading: Loading });
const AbgCalculator = dynamic(() => import("../../app/calculators/abg/page"), { loading: Loading });
const CadCalculator = dynamic(() => import("../../app/calculators/cad/page"), { loading: Loading });

const calculatorComponents: Record<InlineWorkspaceModuleId, ComponentType<EmbeddedCalculatorProps>> = {
  "calculator:bmi": BmiCalculator,
  "calculator:gfr": GfrCalculator,
  "calculator:chads": ChadsCalculator,
  "calculator:pe": PeCalculator,
  "calculator:vte": VteCalculator,
  "calculator:abg": AbgCalculator,
  "calculator:cad": CadCalculator,
};

const labels = {
  fi: { back: "Takaisin tekstityökaluun", open: "Avaa omalla sivulla", loading: "Ladataan laskuria" },
  ru: { back: "Вернуться к работе с текстом", open: "Открыть отдельно", loading: "Загрузка калькулятора" },
  en: { back: "Back to text workspace", open: "Open separately", loading: "Loading calculator" },
  de: { back: "Zurück zum Textarbeitsbereich", open: "Separat öffnen", loading: "Rechner wird geladen" },
} as const;

function Loading() {
  const { language } = useI18n();
  const copy = labels[language as keyof typeof labels] ?? labels.fi;
  return <div className="flex min-h-72 items-center justify-center gap-2 text-sm text-slate-400"><Loader2 size={17} className="animate-spin" />{copy.loading}</div>;
}

export default function WorkspaceModuleHost({
  moduleId,
  onClose,
  onDiscussResult,
}: {
  moduleId: InlineWorkspaceModuleId;
  onClose: () => void;
  onDiscussResult: (content: string, toolKey: string, label: string) => void;
}) {
  const { language } = useI18n();
  const copy = labels[language as keyof typeof labels] ?? labels.fi;
  const definition = inlineWorkspaceModules[moduleId];
  const Icon = homeActionIconMap[definition.icon as keyof typeof homeActionIconMap] ?? FileText;
  const CalculatorComponent = calculatorComponents[moduleId];

  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <button type="button" onClick={onClose} className="flex shrink-0 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-700">
            <ArrowLeft size={15} /> {copy.back}
          </button>
          <span className="hidden h-6 w-px bg-slate-200 sm:block" />
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600"><Icon size={19} /></div>
          <h1 className="truncate text-base font-bold text-slate-900">{definition.label}</h1>
        </div>
        <Link href={definition.href} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-blue-700">
          <ExternalLink size={14} /> {copy.open}
        </Link>
      </header>
      <CalculatorComponent embedded onDiscussResult={(content) => onDiscussResult(content, moduleId, definition.label)} />
    </section>
  );
}
