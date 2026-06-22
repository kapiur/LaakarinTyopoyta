"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Calculator, Copy, RefreshCw } from "lucide-react";
import { getLocalizedVariant } from "../../../lib/i18n";
import { useI18n } from "../../../lib/useI18n";

type PedsIndication = {
  id: number;
  name: string;
};

type PedsDrug = {
  id: number;
  name: string;
  form: "LIQUID" | "TABLET";
  unit: "MG" | "IU";
  strength: number;
  dosePerKgDay: number;
  timesPerDay: number;
  defaultDays: number | null;
  packageSize: number | null;
  note: string | null;
  indications: { id: number; name: string }[];
};

type PedsState = {
  mode: "LIQUID" | "TABLET";
  unit: "MG" | "IU";
  weight: string;
  dosePerKgDay: string;
  strength: string;
  timesPerDay: number;
  days: string;
  packageSize: string;
  selectedIndicationId: string;
  selectedDrugId: string;
  selectedDrugName: string;
  drugNote: string;
};

const emptyPeds: PedsState = {
  mode: "LIQUID",
  unit: "MG",
  weight: "",
  dosePerKgDay: "",
  strength: "",
  timesPerDay: 3,
  days: "",
  packageSize: "",
  selectedIndicationId: "all",
  selectedDrugId: "",
  selectedDrugName: "",
  drugNote: "",
};

const copy = {
  fi: {
    loadFailed: "Lataus epäonnistui",
    indicationsLoadFailed: "Indikaatioiden lataus epäonnistui",
    drugsLoadFailed: "Lääkkeiden lataus epäonnistui",
    back: "← Takaisin laskureihin",
    title: "Painoperusteinen annoslaskuri",
    subtitle:
      "Valitse käyttöaihe ja lääke omasta kirjastosta. Arvot täyttyvät automaattisesti, mutta niitä voi muokata käsin myös muuhun kuin lasten annoslaskentaan.",
    libraries: "Lääke- ja annoskirjastot",
    refresh: "Päivitä",
    indication: "Indikaatio / sairaus",
    allIndications: "Kaikki indikaatiot",
    drug: "Lääke",
    selectDrug: "-- Valitse lääke --",
    liquid: "Neste",
    tablet: "Tabletti",
    liquidOption: "neste",
    tabletOption: "tabletti",
    tabShort: "tab",
    tabletAmountShort: "tabl",
    bottleLabel: "pulloa",
    packageLabel: "pakkausta",
    packageUnitLiquid: "ml",
    packageUnitTablet: "kpl",
    weight: "Paino (kg)",
    doseLabel: "Annos ({unit}/kg/vrk)",
    unit: "Yksikkö",
    strengthLabel: "Vahvuus ({unit}/{amountUnit})",
    days: "Kesto (pv)",
    packageSize: "Pakkaus ({unit})",
    timesPerDay: "Antokerrat / vrk",
    clearForm: "Tyhjennä lomake",
    calculations: "Laskelmat",
    copied: "Kopioitu",
    copy: "Kopioi",
    enterValues: "Syötä tiedot",
    dailyDose: "Vuorokausiannos",
    totalCourseNeed: "Koko kuurin tarve",
    totalValueSuffix: "{unit} yhteensä",
    requiredLiquidVolume: "Tarvittava tilavuus",
    totalCourseAmount: "Koko kuurin määrä",
    prescribeWholeCourse: "Määrätään reseptiin koko kuurille",
    singleDoseLabel: "Kerta-annos ({unit})",
    timesPerDayValue: "{count} krt / vrk",
    tabletRoundingWarning:
      "Huom: tablettipyöristys muuttaa kerta-annosta noin {percent} %. Tarkista annos.",
    prescription: "Resepti",
    prescriptionPackageLine: "à {size} {unit}",
    info:
      "Tarkista tulos aina ennen kliinistä käyttöä potilaan iän, painon, munuaistoiminnan, käyttöaiheen ja paikallisten ohjeiden mukaan.",
    copyTitle: "Painoannoslaskelma",
    copyDrug: "Lääke: {drug}",
    copyWeight: "Paino: {weight} kg",
    copyDose: "Annos: {dose} {unit}/kg/vrk",
    copyDailyDose: "Vuorokausiannos: {value} {unit}/vrk",
    copySingleDoseLiquid:
      "Kerta-annos: {amount} ml (= {dose} {unit}) x {times}/vrk",
    copySingleDoseTablet:
      "Kerta-annos: {amount} tabl (= noin {dose} {unit}) x {times}/vrk",
    copyCourseDays: "Kuurin kesto: {days} vrk",
    copyCourseLiquid: "Koko kuuri: {value} {unit} = {amount} ml",
    copyCourseTablet: "Koko kuuri: {amount} tabl",
    copyPrescription: "Resepti: {packs} {label} à {size} {unit}",
    copyNote: "Huom: {note}",
    copyFooter:
      "Tarkista annos aina ennen kliinistä käyttöä paikallisten ohjeiden mukaisesti.",
  },
  ru: {
    loadFailed: "Не удалось загрузить данные",
    indicationsLoadFailed: "Не удалось загрузить показания",
    drugsLoadFailed: "Не удалось загрузить препараты",
    back: "← Назад к калькуляторам",
    title: "Калькулятор дозировок по весу",
    subtitle:
      "Выберите показание и препарат из собственной библиотеки. Значения заполняются автоматически, но их можно менять вручную и использовать не только для детских расчётов.",
    libraries: "Библиотеки препаратов и дозировок",
    refresh: "Обновить",
    indication: "Показание / заболевание",
    allIndications: "Все показания",
    drug: "Препарат",
    selectDrug: "-- Выберите препарат --",
    liquid: "Жидкость",
    tablet: "Таблетки",
    liquidOption: "жидкость",
    tabletOption: "таблетки",
    tabShort: "табл.",
    tabletAmountShort: "табл.",
    bottleLabel: "флаконов",
    packageLabel: "упаковок",
    packageUnitLiquid: "мл",
    packageUnitTablet: "шт.",
    weight: "Вес (kg)",
    doseLabel: "Доза ({unit}/kg/сут)",
    unit: "Единица",
    strengthLabel: "Концентрация ({unit}/{amountUnit})",
    days: "Длительность (дн.)",
    packageSize: "Упаковка ({unit})",
    timesPerDay: "Приёмов / сутки",
    clearForm: "Очистить форму",
    calculations: "Расчёты",
    copied: "Скопировано",
    copy: "Копировать",
    enterValues: "Введите данные",
    dailyDose: "Суточная доза",
    totalCourseNeed: "Потребность на весь курс",
    totalValueSuffix: "{unit} всего",
    requiredLiquidVolume: "Необходимый объём",
    totalCourseAmount: "Количество на весь курс",
    prescribeWholeCourse: "Назначается в рецепте на весь курс",
    singleDoseLabel: "Разовая доза ({unit})",
    timesPerDayValue: "{count} раз/сут",
    tabletRoundingWarning:
      "Внимание: округление таблеток меняет разовую дозу примерно на {percent} %. Проверьте дозировку.",
    prescription: "Рецепт",
    prescriptionPackageLine: "по {size} {unit}",
    info:
      "Всегда проверяйте результат перед клиническим применением с учётом возраста пациента, веса, функции почек, показания и локальных инструкций.",
    copyTitle: "Расчёт дозировки по весу",
    copyDrug: "Препарат: {drug}",
    copyWeight: "Вес: {weight} kg",
    copyDose: "Доза: {dose} {unit}/kg/сут",
    copyDailyDose: "Суточная доза: {value} {unit}/сут",
    copySingleDoseLiquid:
      "Разовая доза: {amount} мл (= {dose} {unit}) x {times}/сут",
    copySingleDoseTablet:
      "Разовая доза: {amount} табл. (= примерно {dose} {unit}) x {times}/сут",
    copyCourseDays: "Длительность курса: {days} сут",
    copyCourseLiquid: "Весь курс: {value} {unit} = {amount} мл",
    copyCourseTablet: "Весь курс: {amount} табл.",
    copyPrescription: "Рецепт: {packs} {label} по {size} {unit}",
    copyNote: "Примечание: {note}",
    copyFooter:
      "Всегда проверяйте дозировку перед клиническим применением по локальным инструкциям.",
  },
  en: {
    loadFailed: "Could not load data",
    indicationsLoadFailed: "Could not load indications",
    drugsLoadFailed: "Could not load drugs",
    back: "← Back to calculators",
    title: "Weight-based dose calculator",
    subtitle:
      "Select an indication and a drug from your own library. Values are filled automatically, but they can also be edited manually for uses beyond pediatric dosing.",
    libraries: "Drug and dose libraries",
    refresh: "Refresh",
    indication: "Indication / disease",
    allIndications: "All indications",
    drug: "Drug",
    selectDrug: "-- Select drug --",
    liquid: "Liquid",
    tablet: "Tablet",
    liquidOption: "liquid",
    tabletOption: "tablet",
    tabShort: "tab",
    tabletAmountShort: "tabs",
    bottleLabel: "bottles",
    packageLabel: "packages",
    packageUnitLiquid: "ml",
    packageUnitTablet: "pcs",
    weight: "Weight (kg)",
    doseLabel: "Dose ({unit}/kg/day)",
    unit: "Unit",
    strengthLabel: "Strength ({unit}/{amountUnit})",
    days: "Duration (days)",
    packageSize: "Package ({unit})",
    timesPerDay: "Doses / day",
    clearForm: "Clear form",
    calculations: "Calculations",
    copied: "Copied",
    copy: "Copy",
    enterValues: "Enter values",
    dailyDose: "Daily dose",
    totalCourseNeed: "Total course need",
    totalValueSuffix: "{unit} total",
    requiredLiquidVolume: "Required volume",
    totalCourseAmount: "Total course amount",
    prescribeWholeCourse: "Prescribe for the whole course",
    singleDoseLabel: "Single dose ({unit})",
    timesPerDayValue: "{count} doses/day",
    tabletRoundingWarning:
      "Note: tablet rounding changes the single dose by about {percent}%. Check the dose.",
    prescription: "Prescription",
    prescriptionPackageLine: "{size} {unit} each",
    info:
      "Always verify the result before clinical use according to the patient's age, weight, renal function, indication, and local guidance.",
    copyTitle: "Weight-based dose calculation",
    copyDrug: "Drug: {drug}",
    copyWeight: "Weight: {weight} kg",
    copyDose: "Dose: {dose} {unit}/kg/day",
    copyDailyDose: "Daily dose: {value} {unit}/day",
    copySingleDoseLiquid:
      "Single dose: {amount} ml (= {dose} {unit}) x {times}/day",
    copySingleDoseTablet:
      "Single dose: {amount} tabs (= about {dose} {unit}) x {times}/day",
    copyCourseDays: "Course duration: {days} days",
    copyCourseLiquid: "Whole course: {value} {unit} = {amount} ml",
    copyCourseTablet: "Whole course: {amount} tabs",
    copyPrescription: "Prescription: {packs} {label} x {size} {unit}",
    copyNote: "Note: {note}",
    copyFooter: "Always verify the dose before clinical use according to local guidance.",
  },
  de: {
    loadFailed: "Daten konnten nicht geladen werden",
    indicationsLoadFailed: "Indikationen konnten nicht geladen werden",
    drugsLoadFailed: "Arzneimittel konnten nicht geladen werden",
    back: "← Zurück zu den Rechnern",
    title: "Gewichtsbezogener Dosisrechner",
    subtitle:
      "Wählen Sie eine Indikation und ein Arzneimittel aus Ihrer eigenen Bibliothek. Werte werden automatisch übernommen, können aber auch für andere Anwendungen als pädiatrische Dosierungen manuell angepasst werden.",
    libraries: "Arznei- und Dosisbibliotheken",
    refresh: "Aktualisieren",
    indication: "Indikation / Erkrankung",
    allIndications: "Alle Indikationen",
    drug: "Arzneimittel",
    selectDrug: "-- Arzneimittel auswählen --",
    liquid: "Flüssig",
    tablet: "Tablette",
    liquidOption: "flüssig",
    tabletOption: "Tablette",
    tabShort: "Tbl.",
    tabletAmountShort: "Tbl.",
    bottleLabel: "Flaschen",
    packageLabel: "Packungen",
    packageUnitLiquid: "ml",
    packageUnitTablet: "Stk.",
    weight: "Gewicht (kg)",
    doseLabel: "Dosis ({unit}/kg/Tag)",
    unit: "Einheit",
    strengthLabel: "Stärke ({unit}/{amountUnit})",
    days: "Dauer (Tage)",
    packageSize: "Packung ({unit})",
    timesPerDay: "Gaben / Tag",
    clearForm: "Formular leeren",
    calculations: "Berechnungen",
    copied: "Kopiert",
    copy: "Kopieren",
    enterValues: "Werte eingeben",
    dailyDose: "Tagesdosis",
    totalCourseNeed: "Gesamtbedarf der Therapie",
    totalValueSuffix: "{unit} gesamt",
    requiredLiquidVolume: "Benötigtes Volumen",
    totalCourseAmount: "Gesamtmenge der Therapie",
    prescribeWholeCourse: "Für die gesamte Therapie verordnen",
    singleDoseLabel: "Einzeldosis ({unit})",
    timesPerDayValue: "{count} Gaben/Tag",
    tabletRoundingWarning:
      "Hinweis: Die Tablettenrundung verändert die Einzeldosis um etwa {percent} %. Bitte Dosis prüfen.",
    prescription: "Rezept",
    prescriptionPackageLine: "à {size} {unit}",
    info:
      "Das Ergebnis vor klinischer Anwendung immer anhand von Alter, Gewicht, Nierenfunktion, Indikation und lokalen Vorgaben prüfen.",
    copyTitle: "Gewichtsbezogene Dosisberechnung",
    copyDrug: "Arzneimittel: {drug}",
    copyWeight: "Gewicht: {weight} kg",
    copyDose: "Dosis: {dose} {unit}/kg/Tag",
    copyDailyDose: "Tagesdosis: {value} {unit}/Tag",
    copySingleDoseLiquid:
      "Einzeldosis: {amount} ml (= {dose} {unit}) x {times}/Tag",
    copySingleDoseTablet:
      "Einzeldosis: {amount} Tbl. (= etwa {dose} {unit}) x {times}/Tag",
    copyCourseDays: "Therapiedauer: {days} Tage",
    copyCourseLiquid: "Gesamttherapie: {value} {unit} = {amount} ml",
    copyCourseTablet: "Gesamttherapie: {amount} Tbl.",
    copyPrescription: "Rezept: {packs} {label} à {size} {unit}",
    copyNote: "Hinweis: {note}",
    copyFooter:
      "Die Dosis vor klinischer Anwendung immer anhand lokaler Vorgaben prüfen.",
  },
} as const;

function fmt(value: number, digits = 1) {
  if (!Number.isFinite(value)) return "0";
  return value.toFixed(digits).replace(".", ",");
}

function formatTemplate(
  template: string,
  values: Record<string, string | number>
) {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
}

function deriveIndicationsFromDrugs(drugs: PedsDrug[]): PedsIndication[] {
  const map = new Map<number, PedsIndication>();

  drugs.forEach((drug) => {
    drug.indications.forEach((indication) => {
      map.set(indication.id, { id: indication.id, name: indication.name });
    });
  });

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "fi"));
}

async function fetchPedsIndications(errorMessage: string): Promise<PedsIndication[]> {
  const response = await fetch("/api/peds/indications");
  if (!response.ok) throw new Error(errorMessage);
  const data = await response.json();
  return data.indications ?? [];
}

async function fetchPedsDrugs(
  indicationId = "all",
  errorMessage: string
): Promise<PedsDrug[]> {
  const query =
    indicationId !== "all" ? `?indicationId=${encodeURIComponent(indicationId)}` : "";
  const response = await fetch(`/api/peds/drugs${query}`);
  if (!response.ok) throw new Error(errorMessage);
  const data = await response.json();
  return data.drugs ?? [];
}

export default function PedsCalculatorPage() {
  const { language } = useI18n();
  const c = getLocalizedVariant(copy, language) ?? copy.en;

  const [peds, setPeds] = useState<PedsState>(emptyPeds);
  const [indications, setIndications] = useState<PedsIndication[]>([]);
  const [drugs, setDrugs] = useState<PedsDrug[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const refreshLibrary = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [loadedIndications, loadedDrugs] = await Promise.all([
        fetchPedsIndications(c.indicationsLoadFailed),
        fetchPedsDrugs(peds.selectedIndicationId, c.drugsLoadFailed),
      ]);

      setDrugs(loadedDrugs);

      if (loadedIndications.length > 0) {
        setIndications(loadedIndications);
      } else {
        const allDrugs =
          peds.selectedIndicationId === "all"
            ? loadedDrugs
            : await fetchPedsDrugs("all", c.drugsLoadFailed);
        setIndications(deriveIndicationsFromDrugs(allDrugs));
      }
    } catch (err: any) {
      setError(err?.message ?? c.loadFailed);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshLibrary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const result = useMemo(() => {
    const weight = Number(peds.weight) || 0;
    const dosePerKgDay = Number(peds.dosePerKgDay) || 0;
    const strength = Number(peds.strength) || 0;
    const days = Number(peds.days) || 0;
    const packageSize = Number(peds.packageSize) || 0;
    const timesPerDay = peds.timesPerDay || 1;

    const dailyValue = weight * dosePerKgDay;
    const totalValue = dailyValue * days;
    const singleValue = dailyValue / timesPerDay;

    if (!weight || !dosePerKgDay || !strength) {
      return {
        isReady: false,
        dailyValue,
        totalValue,
        singleValue,
        totalAmount: 0,
        singleAmount: 0,
        packs: 0,
        actualSingleDose: 0,
        doseDiffPercent: 0,
      };
    }

    if (peds.mode === "LIQUID") {
      const totalAmount = days > 0 ? totalValue / strength : 0;
      const singleAmount = singleValue / strength;
      const packs = packageSize > 0 ? Math.ceil(totalAmount / packageSize) : 0;

      return {
        isReady: true,
        dailyValue,
        totalValue,
        singleValue,
        totalAmount,
        singleAmount,
        packs,
        actualSingleDose: singleValue,
        doseDiffPercent: 0,
      };
    }

    const rawTabs = singleValue / strength;
    const roundedTabs = Math.round(rawTabs * 2) / 2;
    const actualSingleDose = roundedTabs * strength;
    const doseDiffPercent =
      singleValue > 0 ? ((actualSingleDose - singleValue) / singleValue) * 100 : 0;
    const totalTabs = days > 0 ? Math.ceil(roundedTabs * timesPerDay * days) : 0;
    const packs = packageSize > 0 ? Math.ceil(totalTabs / packageSize) : 0;

    return {
      isReady: true,
      dailyValue,
      totalValue,
      singleValue,
      totalAmount: totalTabs,
      singleAmount: roundedTabs,
      packs,
      actualSingleDose,
      doseDiffPercent,
    };
  }, [peds]);

  const handleIndicationChange = async (value: string) => {
    setPeds((prev) => ({
      ...prev,
      selectedIndicationId: value,
      selectedDrugId: "",
      selectedDrugName: "",
      drugNote: "",
    }));
    setIsLoading(true);
    setError(null);
    try {
      const loadedDrugs = await fetchPedsDrugs(value, c.drugsLoadFailed);
      setDrugs(loadedDrugs);

      if (indications.length === 0) {
        const allDrugs =
          value === "all" ? loadedDrugs : await fetchPedsDrugs("all", c.drugsLoadFailed);
        setIndications(deriveIndicationsFromDrugs(allDrugs));
      }
    } catch (err: any) {
      setError(err?.message ?? c.drugsLoadFailed);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrugChange = (value: string) => {
    const drug = drugs.find((item) => item.id === Number(value));

    if (!drug) {
      setPeds((prev) => ({ ...prev, selectedDrugId: "", selectedDrugName: "", drugNote: "" }));
      return;
    }

    setPeds((prev) => ({
      ...prev,
      selectedDrugId: String(drug.id),
      selectedDrugName: drug.name,
      mode: drug.form,
      unit: drug.unit,
      dosePerKgDay: String(drug.dosePerKgDay),
      strength: String(drug.strength),
      timesPerDay: drug.timesPerDay,
      days: drug.defaultDays ? String(drug.defaultDays) : prev.days,
      packageSize: drug.packageSize ? String(drug.packageSize) : prev.packageSize,
      drugNote: drug.note ?? "",
    }));
  };

  const resetForm = () => {
    setPeds((prev) => ({
      ...emptyPeds,
      selectedIndicationId: prev.selectedIndicationId,
    }));
  };

  const copyText = () => {
    const unit = peds.unit.toLowerCase();
    const amountUnit = peds.mode === "LIQUID" ? "ml" : c.tabletAmountShort;
    const packageLabel = peds.mode === "LIQUID" ? c.bottleLabel : c.packageLabel;
    const prescriptionUnit =
      peds.mode === "LIQUID" ? c.packageUnitLiquid : c.packageUnitTablet;

    const text = [
      c.copyTitle,
      peds.selectedDrugName
        ? formatTemplate(c.copyDrug, { drug: peds.selectedDrugName })
        : null,
      formatTemplate(c.copyWeight, { weight: peds.weight }),
      formatTemplate(c.copyDose, {
        dose: peds.dosePerKgDay,
        unit,
      }),
      formatTemplate(c.copyDailyDose, {
        value: fmt(result.dailyValue, 1),
        unit,
      }),
      peds.mode === "LIQUID"
        ? formatTemplate(c.copySingleDoseLiquid, {
            amount: fmt(result.singleAmount, 2),
            dose: fmt(result.singleValue, 1),
            unit,
            times: peds.timesPerDay,
          })
        : formatTemplate(c.copySingleDoseTablet, {
            amount: fmt(result.singleAmount, 1),
            dose: fmt(result.actualSingleDose, 1),
            unit,
            times: peds.timesPerDay,
          }),
      peds.days ? formatTemplate(c.copyCourseDays, { days: peds.days }) : null,
      peds.days
        ? peds.mode === "LIQUID"
          ? formatTemplate(c.copyCourseLiquid, {
              value: fmt(result.totalValue, 0),
              unit,
              amount: fmt(result.totalAmount, 1),
            })
          : formatTemplate(c.copyCourseTablet, {
              amount: fmt(result.totalAmount, 0),
            })
        : null,
      result.packs > 0 && peds.packageSize
        ? formatTemplate(c.copyPrescription, {
            packs: result.packs,
            label: packageLabel,
            size: peds.packageSize,
            unit: prescriptionUnit,
          })
        : null,
      peds.drugNote ? formatTemplate(c.copyNote, { note: peds.drugNote }) : null,
      c.copyFooter,
    ]
      .filter(Boolean)
      .join("\n");

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  const unit = peds.unit.toLowerCase();
  const amountUnitDisplay =
    peds.mode === "LIQUID" ? c.packageUnitLiquid : c.tabShort;
  const singleDoseUnitDisplay =
    peds.mode === "LIQUID" ? c.packageUnitLiquid : c.tabletAmountShort;
  const packageUnitDisplay =
    peds.mode === "LIQUID" ? c.packageUnitLiquid : c.packageUnitTablet;
  const modeOptionLabel = (form: PedsDrug["form"]) =>
    form === "LIQUID" ? c.liquidOption : c.tabletOption;

  return (
    <div className="max-w-[1200px] mx-auto space-y-5 pb-10 text-slate-900 p-2 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Link
            href="/calculators"
            className="text-xs font-bold text-blue-600 hover:text-blue-700"
          >
            {c.back}
          </Link>
          <h1 className="mt-2 text-2xl font-black text-slate-800 flex items-center gap-2">
            <Calculator className="text-blue-600" size={26} /> {c.title}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{c.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/calculators/peds-library"
            className="px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase text-blue-600 hover:bg-blue-50 transition-all"
          >
            {c.libraries}
          </Link>
          <button
            onClick={refreshLibrary}
            disabled={isLoading}
            className="px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} /> {c.refresh}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-2xl text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[10px] font-extrabold text-blue-600 uppercase ml-1">
                {c.indication}
              </label>
              <select
                value={peds.selectedIndicationId}
                onChange={(event) => handleIndicationChange(event.target.value)}
                className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl font-bold outline-none"
              >
                <option value="all">{c.allIndications}</option>
                {indications.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-[10px] font-extrabold text-blue-600 uppercase ml-1">
                {c.drug}
              </label>
              <select
                value={peds.selectedDrugId}
                onChange={(event) => handleDrugChange(event.target.value)}
                className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl font-bold outline-none"
              >
                <option value="">{c.selectDrug}</option>
                {drugs.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {modeOptionLabel(item.form)} · {item.strength}{" "}
                    {item.unit.toLowerCase()}/
                    {item.form === "LIQUID" ? c.packageUnitLiquid : c.tabShort}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex p-1 bg-slate-100 rounded-2xl">
            <button
              onClick={() => setPeds({ ...peds, mode: "LIQUID" })}
              className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase transition-all ${
                peds.mode === "LIQUID"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-500"
              }`}
            >
              {c.liquid}
            </button>
            <button
              onClick={() => setPeds({ ...peds, mode: "TABLET" })}
              className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase transition-all ${
                peds.mode === "TABLET"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-500"
              }`}
            >
              {c.tablet}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-3xl border border-slate-100">
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-blue-600 uppercase ml-1">
                {c.weight}
              </label>
              <input
                type="number"
                step="0.1"
                value={peds.weight}
                onChange={(event) => setPeds({ ...peds, weight: event.target.value })}
                className="w-full p-4 bg-white border-2 border-transparent focus:border-blue-500 rounded-2xl font-bold outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-blue-600 uppercase ml-1">
                {formatTemplate(c.doseLabel, { unit })}
              </label>
              <input
                type="number"
                value={peds.dosePerKgDay}
                onChange={(event) =>
                  setPeds({ ...peds, dosePerKgDay: event.target.value })
                }
                className="w-full p-4 bg-white border-2 border-transparent focus:border-blue-500 rounded-2xl font-bold outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-blue-600 uppercase ml-1">
                {c.unit}
              </label>
              <select
                value={peds.unit}
                onChange={(event) =>
                  setPeds({ ...peds, unit: event.target.value as PedsState["unit"] })
                }
                className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl font-bold outline-none"
              >
                <option value="MG">mg</option>
                <option value="IU">IU</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-blue-600 uppercase ml-1">
                {formatTemplate(c.strengthLabel, {
                  unit,
                  amountUnit: amountUnitDisplay,
                })}
              </label>
              <input
                type="number"
                value={peds.strength}
                onChange={(event) => setPeds({ ...peds, strength: event.target.value })}
                className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl font-bold outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-blue-600 uppercase ml-1">
                {c.days}
              </label>
              <input
                type="number"
                value={peds.days}
                onChange={(event) => setPeds({ ...peds, days: event.target.value })}
                className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl font-bold outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-blue-600 uppercase ml-1">
                {formatTemplate(c.packageSize, { unit: packageUnitDisplay })}
              </label>
              <input
                type="number"
                value={peds.packageSize}
                onChange={(event) =>
                  setPeds({ ...peds, packageSize: event.target.value })
                }
                className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl font-bold outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-extrabold text-blue-600 uppercase ml-1">
              {c.timesPerDay}
            </label>
            <div className="grid grid-cols-6 gap-2">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  onClick={() => setPeds({ ...peds, timesPerDay: n })}
                  className={`py-3 rounded-xl font-black text-xs transition-all border ${
                    peds.timesPerDay === n
                      ? "bg-blue-600 text-white border-blue-600 shadow-md"
                      : "bg-slate-50 text-slate-400 border-transparent"
                  }`}
                >
                  {n}x
                </button>
              ))}
            </div>
          </div>

          {peds.drugNote && (
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-xs font-bold text-amber-800">
              {peds.drugNote}
            </div>
          )}

          <button
            onClick={resetForm}
            className="w-full py-4 border-2 border-slate-100 rounded-2xl text-[11px] font-black uppercase text-slate-400 hover:text-red-500 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw size={14} /> {c.clearForm}
          </button>
        </section>

        <section className="bg-white rounded-[2.5rem] p-6 sm:p-10 border border-slate-200 shadow-sm min-h-[700px] flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-pulse" />
              <span className="text-[12px] font-black text-blue-600 uppercase tracking-[0.2em]">
                {c.calculations}
              </span>
            </div>
            <button
              onClick={copyText}
              disabled={!result.isReady}
              className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-blue-600 disabled:opacity-30 transition-all"
            >
              <Copy size={14} /> {copied ? c.copied : c.copy}
            </button>
          </div>

          {!result.isReady ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-200 font-black uppercase text-center">
              <Calculator size={64} className="mb-4 opacity-20" />
              <div className="text-4xl tracking-tighter">{c.enterValues}</div>
            </div>
          ) : (
            <div className="flex-1 space-y-5">
              <div className="p-6 bg-slate-50/80 rounded-3xl border border-slate-100">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  {c.dailyDose}
                </p>
                <div className="text-4xl font-black text-slate-800">
                  {fmt(result.dailyValue, 1)}{" "}
                  <span className="text-sm font-bold opacity-30 tracking-normal">
                    {unit} / {language === "ru" ? "сут" : language === "de" ? "Tag" : "day"}
                  </span>
                </div>
              </div>

              <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
                <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mb-1">
                  {c.totalCourseNeed}
                </p>
                <div className="text-3xl font-bold text-slate-300">
                  {fmt(result.totalValue, 0)}{" "}
                  <span className="text-sm font-medium tracking-normal">
                    {formatTemplate(c.totalValueSuffix, { unit })}
                  </span>
                </div>
              </div>

              <div className="p-10 bg-blue-600 rounded-[2.5rem] text-white shadow-2xl shadow-blue-100">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-4">
                  {peds.mode === "LIQUID" ? c.requiredLiquidVolume : c.totalCourseAmount}
                </p>
                <div className="text-7xl sm:text-8xl font-black tracking-tighter">
                  {fmt(result.totalAmount, peds.mode === "LIQUID" ? 1 : 0)}{" "}
                  <span className="text-3xl font-bold tracking-tighter opacity-80">
                    {peds.mode === "LIQUID" ? c.packageUnitLiquid : c.tabletAmountShort}
                  </span>
                </div>
                <p className="text-[11px] font-black uppercase mt-6 tracking-widest italic opacity-80">
                  {c.prescribeWholeCourse}
                </p>
              </div>

              <div className="p-8 bg-emerald-50 rounded-[2.5rem] border border-emerald-100 space-y-5">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">
                      {formatTemplate(c.singleDoseLabel, { unit: singleDoseUnitDisplay })}
                    </p>
                    <div className="text-6xl font-black text-emerald-600 tracking-tighter">
                      {fmt(result.singleAmount, peds.mode === "LIQUID" ? 2 : 1)}{" "}
                      <span className="text-2xl">{singleDoseUnitDisplay}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-emerald-500">
                      {fmt(
                        peds.mode === "LIQUID" ? result.singleValue : result.actualSingleDose,
                        1
                      )}{" "}
                      {unit}
                    </div>
                    <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                      {formatTemplate(c.timesPerDayValue, { count: peds.timesPerDay })}
                    </div>
                  </div>
                </div>

                {peds.mode === "TABLET" && Math.abs(result.doseDiffPercent) >= 10 && (
                  <div className="p-3 bg-amber-100/70 rounded-2xl text-[11px] font-bold text-amber-800">
                    {formatTemplate(c.tabletRoundingWarning, {
                      percent: fmt(result.doseDiffPercent, 0),
                    })}
                  </div>
                )}
              </div>

              {result.packs > 0 && peds.packageSize && (
                <div className="p-6 bg-slate-900 rounded-3xl text-white">
                  <p className="text-[10px] font-black uppercase opacity-40 tracking-widest mb-1">
                    {c.prescription}
                  </p>
                  <div className="text-3xl font-black">
                    {result.packs} {peds.mode === "LIQUID" ? c.bottleLabel : c.packageLabel}
                  </div>
                  <p className="text-[11px] opacity-40 font-medium">
                    {formatTemplate(c.prescriptionPackageLine, {
                      size: peds.packageSize,
                      unit: packageUnitDisplay,
                    })}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="mt-8 p-5 bg-blue-50 rounded-[1.5rem] border border-blue-100 flex gap-4 items-center">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-[12px] font-black italic shadow-md shadow-blue-200">
              i
            </div>
            <p className="text-[10px] text-blue-800 leading-tight font-bold italic">
              {c.info}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
