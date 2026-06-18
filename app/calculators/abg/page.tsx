"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Activity, Copy, Droplets, RotateCcw, Sparkles, Wind } from "lucide-react";
import { useI18n } from "../../../lib/useI18n";
import {
  analyzeAbg,
  fromMmHg,
  type AbgAnalysis,
  type AbgCourseType,
  type AbgFlag,
  type AbgGasUnit,
  type AbgInput,
  type AbgMode,
  type AbgPrimaryKey,
  type AbgSampleType,
} from "../../../lib/calculators/modules/abg/formulas";

type UiLang = "fi" | "ru" | "en";

type AbgFormState = {
  sample: AbgSampleType;
  unit: AbgGasUnit;
  course: AbgCourseType;
  ph: string;
  pco2: string;
  po2: string;
  hco3: string;
  be: string;
  na: string;
  k: string;
  cl: string;
  albumin: string;
  lactate: string;
  glucose: string;
  ketones: string;
  fio2: string;
};

const emptyState: AbgFormState = {
  sample: "arterial",
  unit: "mmHg",
  course: "acute",
  ph: "",
  pco2: "",
  po2: "",
  hco3: "",
  be: "",
  na: "",
  k: "",
  cl: "",
  albumin: "",
  lactate: "",
  glucose: "",
  ketones: "",
  fio2: "",
};

const exampleState: AbgFormState = {
  sample: "arterial",
  unit: "mmHg",
  course: "acute",
  ph: "7.18",
  pco2: "24",
  po2: "92",
  hco3: "9",
  be: "-17",
  na: "132",
  k: "4.8",
  cl: "96",
  albumin: "40",
  lactate: "2.3",
  glucose: "24",
  ketones: "5.1",
  fio2: "21",
};

const texts = {
  fi: {
    back: "← Takaisin laskureihin",
    title: "ABG- ja happo-emästasapaino",
    description:
      "Valtimoverikaasun ja happo-emästasapainon jäsennelty tuki. Tulos auttaa tunnistamaan ensisijaisen häiriön, odotetun kompensaation, anionivajeen, hapetuksen ja DKA-yhteensopivat löydökset.",
    note:
      "Laskuri tukee kliinistä tulkintaa mutta ei korvaa potilaan kokonaistilanteen arviointia, saturaatioita, laboratorioviitearvoja tai paikallista hoitoprotokollaa.",
    venousNote:
      "Laskimoverestä voi arvioida suuntaa-antavasti pH:ta ja metabolista komponenttia, mutta hapetuksen ja PaO2/FiO2-suhteen arviointi kuuluu valtimoverelle.",
    sample: "Näytetyyppi",
    arterial: "Valtimoveri",
    venous: "Laskimoveri",
    unit: "Kaasuarvojen yksikkö",
    course: "Häiriön luonne",
    acute: "Akuutti",
    chronic: "Krooninen",
    example: "Esimerkkitapaus",
    reset: "Tyhjennä",
    copy: "Kopioi yhteenveto",
    copied: "Kopioitu",
    inputsTitle: "Syötettävät arvot",
    resultsTitle: "Tulkinta",
    empty: "Täytä ainakin pH sekä pCO2 tai HCO3, niin tulkinta alkaa elää.",
    cards: {
      ph: "pH",
      primary: "Ensisijainen häiriö",
      compensation: "Odotettu kompensaatio",
      ag: "Anionivaje",
      oxygenation: "Hapetus",
      dka: "DKA-blokki",
    },
    sections: {
      flags: "Poikkeavat havainnot",
      causes: "Todennäköisiä syitä",
      actions: "Mitä tarkistaa seuraavaksi",
    },
    fields: {
      ph: "pH",
      pco2: "pCO2",
      po2: "pO2",
      hco3: "HCO3- (mmol/L)",
      be: "BE (mmol/L)",
      na: "Na+ (mmol/L)",
      k: "K+ (mmol/L)",
      cl: "Cl- (mmol/L)",
      albumin: "Albumiini (g/L)",
      lactate: "Laktaatti (mmol/L)",
      glucose: "Glukoosi (mmol/L)",
      ketones: "B-hydroksibutyraatti (mmol/L)",
      fio2: "FiO2 (%)",
    },
    placeholders: {
      ph: "7,40",
      pco2: "40",
      po2: "90",
      hco3: "24",
      be: "-2",
      na: "140",
      k: "4,2",
      cl: "104",
      albumin: "40",
      lactate: "1,2",
      glucose: "5,6",
      ketones: "0,3",
      fio2: "21",
    },
    phLabels: {
      missing: "pH puuttuu",
      acidosis: "Asidemia",
      alkalosis: "Alkalemia",
      normal: "pH viitealueella",
    },
    phDetails: {
      missing: "Happo-emästulkinta tarvitsee pH-arvon.",
      acidosis: "pH on alle viitealueen.",
      alkalosis: "pH on yli viitealueen.",
      normal: "Normaali pH ei sulje pois kompensoitua tai sekamuotoista häiriötä.",
    },
    primaryLabels: {
      normal: "Ei selvää ensisijaista häiriötä",
      mixedAcidosis: "Sekamuotoinen asidoosi",
      mixedAlkalosis: "Sekamuotoinen alkaloosi",
      probableMixed: "Todennäköisesti sekamuotoinen häiriö",
      metabolicAcidosis: "Metabolinen asidoosi",
      metabolicAlkalosis: "Metabolinen alkaloosi",
      respiratoryAcidosis: "Respiratorinen asidoosi",
      respiratoryAlkalosis: "Respiratorinen alkaloosi",
      compensatedMetabolicAcidosis: "Kompensoitu metabolinen asidoosi?",
      compensatedMetabolicAlkalosis: "Kompensoitu metabolinen alkaloosi?",
      compensatedRespiratoryAcidosis: "Kompensoitu respiratorinen asidoosi?",
      compensatedRespiratoryAlkalosis: "Kompensoitu respiratorinen alkaloosi?",
    },
    primaryDetails: {
      noClearPrimary: "Syötetyillä arvoilla ei erotu selvää primaarista happo-emäshäiriötä.",
      bothAcidotic: "Sekä metabolinen että respiratorinen komponentti viittaavat happamoitumiseen.",
      bothAlkalotic: "Sekä metabolinen että respiratorinen komponentti viittaavat alkaloosiin.",
      normalPhOppositeDirections: "pH on viitealueella, mutta komponentit muuttuvat eri suuntiin.",
      lowHco3OrBe: "HCO3-/BE viittaa metaboliseen asidoosiin.",
      highHco3OrBe: "HCO3-/BE viittaa metaboliseen alkaloosiin.",
      highPco2: "pCO2 on koholla.",
      lowPco2: "pCO2 on matala.",
      normalPhMetAcidosis: "Normaali pH, mutta kokonaiskuva sopii kompensoituun metaboliseen asidoosiin.",
      normalPhMetAlkalosis: "Normaali pH, mutta kokonaiskuva sopii kompensoituun metaboliseen alkaloosiin.",
      normalPhRespAcidosis: "Normaali pH, mutta kokonaiskuva sopii kompensoituun respiratoriseen asidoosiin.",
      normalPhRespAlkalosis: "Normaali pH, mutta kokonaiskuva sopii kompensoituun respiratoriseen alkaloosiin.",
    },
    compensationLabels: {
      notRequired: "Ei tarpeen",
      mixed: "Sekamuotoinen häiriö",
      unavailable: "Ei laskettavissa",
      expected: "Kompensaatio odotetulla alueella",
      extraRespAcidosis: "Lisäksi respiratorinen asidoosi?",
      extraRespAlkalosis: "Lisäksi respiratorinen alkaloosi?",
      extraMetAcidosis: "Lisäksi metabolinen asidoosi?",
      extraMetAlkalosis: "Lisäksi metabolinen alkaloosi?",
      notCalculated: "Ei laskettu",
    },
    compensationTemplates: {
      normal: "Selvää primaarista häiriötä ei löytynyt.",
      mixed: "Yksi kompensaatiokaava ei riitä sekamuotoisen häiriön tulkintaan.",
      needPco2AndHco3: "Kompensaation arvio vaatii sekä pCO2:n että HCO3:n.",
      winter: "Winterin kaava: odotettu PaCO2 {low}-{high} {unit}. Toteutunut {actual}.",
      metabolicAlkalosis: "Metabolisessa alkaloosissa odotettu PaCO2 noin {low}-{high} {unit}. Toteutunut {actual}.",
      respiratoryAcidosis: "Odotettu HCO3 {course}-tilanteessa {low}-{high} mmol/L. Toteutunut {actual}.",
      respiratoryAlkalosis: "Odotettu HCO3 {course}-tilanteessa {low}-{high} mmol/L. Toteutunut {actual}.",
      fallback: "Kompensaatiota ei saatu laskettua.",
    },
    agLabels: {
      missing: "Ei riittävästi tietoa",
      normal: "Anionivaje karkeasti normaali",
      high: "Anionivaje suurentunut",
      veryHigh: "Anionivaje selvästi suurentunut",
    },
    agTemplate:
      "AG ilman kaliumia {ag} mmol/L.{withK} {corrected} Tulkinta riippuu laboratoriosta; hypoalbuminemia pienentää mitattua AG:tä.",
    oxygenLabels: {
      venous: "Rajoitettu arvio",
      missing: "PaO2 puuttuu",
      normal: "PaO2 ilman selvää laskua",
      hypoxemia: "Hypoksemia?",
      severeHypoxemia: "Merkittävä hypoksemia?",
      pfImpaired: "PaO2/FiO2 ≤ 300",
      pfModerate: "PaO2/FiO2 ≤ 200",
      pfSevere: "PaO2/FiO2 ≤ 100",
      combinedModerate: "Hypoksemia ja heikentynyt P/F-suhde",
      combinedSevere: "Vaikea hypoksemia ja heikentynyt P/F-suhde",
    },
    oxygenDetails: {
      venous: "Laskimoverestä ei arvioida hapetusta tai PaO2/FiO2-suhdetta samalla tavalla kuin valtimoverestä.",
      missing: "Anna PaO2, jos haluat mukaan hapetuksen arvion.",
      standard: "PaO2 {po2} {unit}.{ratio}",
    },
    dkaLabels: {
      none: "Ei kriteerejä syötetyillä arvoilla",
      incomplete: "DKA-kriteerit ovat vajaat",
      compatible: "Löydökset sopivat DKA:han",
      possibleEuglycemic: "Euglykeeminen ketoasidoosi mahdollinen?",
    },
    dkaTemplates: {
      none: "DKA-arvio tarvitsee glukoosin, ketonit ja asidoosikriteerin.",
      incomplete: "Todettu: {parts}. Täydet DKA-kriteerit eivät täyty.",
      compatible: "Biokemiallinen kokonaisuus täyttää DKA-kriteerit: {parts}. Asidoosin vaikeusaste: {severity}.",
      possibleEuglycemic:
        "Ketonemia ja asidoosi ovat läsnä ilman selvää hyperglykemiaa. Harkitse euglykeemistä ketoasidoosia kliinisessä kontekstissa. Asidoosin vaikeusaste: {severity}.",
    },
    dkaSeverity: {
      mild: "lievä",
      moderate: "keskivaikea",
      severe: "vaikea",
    },
    flags: {
      venousSample: "Laskimonäyte: respiratorisen komponentin tulkinnassa varovaisuutta",
      missingPh: "pH puuttuu",
      lowPco2: "pCO2 matala",
      highPco2: "pCO2 koholla",
      lowHco3: "HCO3 matala",
      highHco3: "HCO3 koholla",
      negativeBe: "BE negatiivinen",
      positiveBe: "BE positiivinen",
      highLactate: "Laktaatti koholla",
      highAnionGap: "Anionivaje suurentunut",
      highGlucose: "Hyperglykemia",
      highKetones: "B-hydroksibutyraatti >= 3 mmol/L",
      noClearAbnormalities: "Syötetyissä arvoissa ei näy selvää poikkeamaa",
    },
    causes: {
      metabolicAcidosis: [
        "Laktaattiasidoosi: sokki, hypoksia, sepsis, kudoshypoperfuusio.",
        "Ketoasidoosi: diabeettinen, alkoholiperäinen tai paastoon liittyvä.",
        "Munuaisten vajaatoiminta tai uremia.",
        "Bikarbonaatin menetys: ripuli, fistelit.",
        "Intoksikaatiot kuten metanoli, etyleeniglykoli tai salisylaatit.",
      ],
      metabolicAlkalosis: [
        "Hapon ja kloridin menetys: oksentelu, mahanesteen imeminen.",
        "Loop- tai tiatsididiureetit.",
        "Hypovolemia, hypokalemia, hypokloremia.",
        "Liiallinen emäksen tai bikarbonaatin saanti.",
        "Mineralokortikoidiylimäärä.",
      ],
      respiratoryAcidosis: [
        "Alveolaarinen hypoventilaatio.",
        "Sedatiivit, opioidit tai keskushermostoperäinen hengityslama.",
        "Ilmateiden obstruktio, vaikea COPD tai astma.",
        "Hermo-lihasheikkous.",
        "Vaikea rintakehän tai pleuran sairaus.",
      ],
      respiratoryAlkalosis: [
        "Hypoksemia ja hengitysvajaus.",
        "Keuhkoembolia, pneumonia tai interstitiaalinen keuhkosairaus.",
        "Kipu, ahdistus tai paniikkioire.",
        "Sepsis tai kuume.",
        "Raskaus, maksan vajaatoiminta tai hengityskeskuksen stimulaatio.",
      ],
      mixed: [
        "Useampi primaarinen happo-emäshäiriö yhtä aikaa.",
        "Kompensaatio ei vastaa odotettua mallia.",
        "Arvioi näytteen oikeellisuus, elektrolyytit, laktaatti, ketonit ja kliininen konteksti uudelleen.",
      ],
      normal: [
        "Normaali pH ei sulje pois kompensoitua tai sekamuotoista häiriötä.",
        "Arvioi tulos yhdessä kliinisen kuvan kanssa.",
      ],
    },
    actions: {
      metabolicAcidosis: [
        "Arvioi laktaatti, hemodynamiikka ja hypoperfuusion merkit.",
        "Laske anionivaje ja korjaa se albumiinille, jos mahdollista.",
        "Tarkista glukoosi ja ketonit, jos ketoasidoosi on mahdollinen.",
        "Älä tee bikarbonaatista automaattista hoitopäätöstä ilman syyn arviota.",
      ],
      metabolicAlkalosis: [
        "Tarkista kloridi, kalium, nestestatus ja diureetit.",
        "Kysy oksentelusta tai mahanesteen menetyksestä.",
        "Varmista, sopiiko pCO2 odotettuun kompensaatioon.",
      ],
      respiratoryAcidosis: [
        "Arvioi ventilaatio, tajunnantaso ja hengitystyö.",
        "Sulje pois obstruktio ja lääkeperäinen hengityslama.",
        "Huonokuntoisella potilaalla harkitse kiireellistä hengitystuen tarvetta.",
      ],
      respiratoryAlkalosis: [
        "Etsi hypoksemia, keuhkoembolia, pneumonia, sepsis, kipu tai ahdistus.",
        "Arvioi PaO2/FiO2, SpO2 ja hengitysvajauksen kliiniset merkit.",
        "Älä oleta psykogeenista hyperventilaatiota ennen vaarallisten syiden poissulkua.",
      ],
      mixed: [
        "Pidä löydöstä kliinisesti merkittävänä, kunnes toisin osoittautuu.",
        "Tarkista näytteenotto ja harkitse uusintakoetta.",
        "Sovita tulos elektrolyytteihin, laktaattiin, ketoneihin, munuaistoimintaan ja saturaatioihin.",
      ],
      normal: [
        "Tulkitse yhdessä oireiden, vitaalien ja muun laboratorion kanssa.",
        "Jos epäilet piilevää sekahäiriötä, tarkista kompensaatio ja anionivaje.",
      ],
    },
  },
  ru: {
    back: "← Назад к калькуляторам",
    title: "КОС и газы крови",
    description:
      "Структурированная поддержка интерпретации газов крови и кислотно-основного состояния. Помогает выделить первичное нарушение, ожидаемую компенсацию, анионную разницу, оксигенацию и признаки, совместимые с ДКА.",
    note:
      "Калькулятор помогает структурировать вывод, но не заменяет клиническую оценку, сатурацию, лабораторные референсы и локальный протокол лечения.",
    venousNote:
      "По венозной крови можно ориентировочно оценивать pH и метаболический компонент, но оксигенацию и отношение PaO2/FiO2 корректно оценивать по артериальной пробе.",
    sample: "Тип пробы",
    arterial: "Артериальная кровь",
    venous: "Венозная кровь",
    unit: "Единицы газов",
    course: "Характер нарушения",
    acute: "Острое",
    chronic: "Хроническое",
    example: "Пример",
    reset: "Очистить",
    copy: "Копировать вывод",
    copied: "Скопировано",
    inputsTitle: "Входные данные",
    resultsTitle: "Интерпретация",
    empty: "Введите хотя бы pH и pCO2 или HCO3, и интерпретация появится автоматически.",
    cards: {
      ph: "pH",
      primary: "Основное нарушение",
      compensation: "Ожидаемая компенсация",
      ag: "Анионная разница",
      oxygenation: "Оксигенация",
      dka: "ДКА-блок",
    },
    sections: {
      flags: "Отклонения",
      causes: "Вероятные причины",
      actions: "Что проверить дальше",
    },
    fields: {
      ph: "pH",
      pco2: "pCO2",
      po2: "pO2",
      hco3: "HCO3- (ммоль/л)",
      be: "BE (ммоль/л)",
      na: "Na+ (ммоль/л)",
      k: "K+ (ммоль/л)",
      cl: "Cl- (ммоль/л)",
      albumin: "Альбумин (г/л)",
      lactate: "Лактат (ммоль/л)",
      glucose: "Глюкоза (ммоль/л)",
      ketones: "Бета-гидроксибутират (ммоль/л)",
      fio2: "FiO2 (%)",
    },
    placeholders: {
      ph: "7,40",
      pco2: "40",
      po2: "90",
      hco3: "24",
      be: "-2",
      na: "140",
      k: "4,2",
      cl: "104",
      albumin: "40",
      lactate: "1,2",
      glucose: "5,6",
      ketones: "0,3",
      fio2: "21",
    },
    phLabels: {
      missing: "pH не указан",
      acidosis: "Ацидемия",
      alkalosis: "Алкалемия",
      normal: "pH в пределах нормы",
    },
    phDetails: {
      missing: "Для интерпретации КОС нужен pH.",
      acidosis: "pH ниже референсного диапазона.",
      alkalosis: "pH выше референсного диапазона.",
      normal: "Нормальный pH не исключает компенсированное или смешанное нарушение.",
    },
    primaryLabels: {
      normal: "Явного нарушения нет",
      mixedAcidosis: "Смешанный ацидоз",
      mixedAlkalosis: "Смешанный алкалоз",
      probableMixed: "Вероятно смешанное нарушение",
      metabolicAcidosis: "Метаболический ацидоз",
      metabolicAlkalosis: "Метаболический алкалоз",
      respiratoryAcidosis: "Респираторный ацидоз",
      respiratoryAlkalosis: "Респираторный алкалоз",
      compensatedMetabolicAcidosis: "Компенсированный метаболический ацидоз?",
      compensatedMetabolicAlkalosis: "Компенсированный метаболический алкалоз?",
      compensatedRespiratoryAcidosis: "Компенсированный респираторный ацидоз?",
      compensatedRespiratoryAlkalosis: "Компенсированный респираторный алкалоз?",
    },
    primaryDetails: {
      noClearPrimary: "По введенным данным не выделяется очевидное первичное нарушение КОС.",
      bothAcidotic: "И метаболический, и респираторный компоненты смещены в сторону ацидоза.",
      bothAlkalotic: "И метаболический, и респираторный компоненты смещены в сторону алкалоза.",
      normalPhOppositeDirections: "pH нормальный, но компоненты КОС изменены в разные стороны.",
      lowHco3OrBe: "HCO3/BE указывают на метаболический ацидоз.",
      highHco3OrBe: "HCO3/BE указывают на метаболический алкалоз.",
      highPco2: "pCO2 повышен.",
      lowPco2: "pCO2 снижен.",
      normalPhMetAcidosis: "При нормальном pH общая картина ближе к компенсированному метаболическому ацидозу.",
      normalPhMetAlkalosis: "При нормальном pH общая картина ближе к компенсированному метаболическому алкалозу.",
      normalPhRespAcidosis: "При нормальном pH общая картина ближе к компенсированному респираторному ацидозу.",
      normalPhRespAlkalosis: "При нормальном pH общая картина ближе к компенсированному респираторному алкалозу.",
    },
    compensationLabels: {
      notRequired: "Не требуется",
      mixed: "Смешанное нарушение",
      unavailable: "Нельзя рассчитать",
      expected: "Компенсация ожидаемая",
      extraRespAcidosis: "Доп. респираторный ацидоз?",
      extraRespAlkalosis: "Доп. респираторный алкалоз?",
      extraMetAcidosis: "Доп. метаболический ацидоз?",
      extraMetAlkalosis: "Доп. метаболический алкалоз?",
      notCalculated: "Нет расчета",
    },
    compensationTemplates: {
      normal: "Явного первичного нарушения не выделено.",
      mixed: "Для смешанного нарушения одной формулы компенсации недостаточно.",
      needPco2AndHco3: "Для оценки компенсации нужны и pCO2, и HCO3.",
      winter: "Формула Winter: ожидаемый PaCO2 {low}-{high} {unit}. Фактический {actual}.",
      metabolicAlkalosis: "При метаболическом алкалозе ожидаемый PaCO2 примерно {low}-{high} {unit}. Фактический {actual}.",
      respiratoryAcidosis: "Ожидаемый HCO3 при {course} нарушении {low}-{high} ммоль/л. Фактический {actual}.",
      respiratoryAlkalosis: "Ожидаемый HCO3 при {course} нарушении {low}-{high} ммоль/л. Фактический {actual}.",
      fallback: "Компенсация не рассчитана.",
    },
    agLabels: {
      missing: "Нет данных",
      normal: "AG ориентировочно нормальная",
      high: "AG повышена",
      veryHigh: "AG значительно повышена",
    },
    agTemplate:
      "AG без калия {ag} ммоль/л.{withK} {corrected} Ориентир зависит от лаборатории; гипоальбуминемия снижает измеряемую AG.",
    oxygenLabels: {
      venous: "Ограниченная оценка",
      missing: "Нет PaO2",
      normal: "PaO2 без грубого снижения",
      hypoxemia: "Гипоксемия?",
      severeHypoxemia: "Выраженная гипоксемия?",
      pfImpaired: "PaO2/FiO2 <= 300",
      pfModerate: "PaO2/FiO2 <= 200",
      pfSevere: "PaO2/FiO2 <= 100",
      combinedModerate: "Гипоксемия и сниженный P/F",
      combinedSevere: "Тяжелая гипоксемия и сниженный P/F",
    },
    oxygenDetails: {
      venous: "По венозной крови оксигенацию и PaO2/FiO2 не оценивают так же, как по артериальной пробе.",
      missing: "Введите PaO2, если хотите добавить оценку оксигенации.",
      standard: "PaO2 {po2} {unit}.{ratio}",
    },
    dkaLabels: {
      none: "Нет критериев по введенным данным",
      incomplete: "Критерии ДКА неполные",
      compatible: "Совместимо с ДКА",
      possibleEuglycemic: "Возможен эугликемический кетоацидоз?",
    },
    dkaTemplates: {
      none: "Для блока ДКА нужны глюкоза, кетоны и критерий ацидоза.",
      incomplete: "Отмечено: {parts}. Полный биохимический набор критериев ДКА не набирается.",
      compatible: "Биохимическая картина соответствует ДКА: {parts}. Тяжесть ацидоза: {severity}.",
      possibleEuglycemic:
        "Есть кетонемия и ацидоз без выраженной гипергликемии. В клиническом контексте стоит помнить об эугликемическом кетоацидозе. Тяжесть ацидоза: {severity}.",
    },
    dkaSeverity: {
      mild: "легкая",
      moderate: "умеренная",
      severe: "тяжелая",
    },
    flags: {
      venousSample: "Венозная проба: дыхательный компонент интерпретировать осторожно",
      missingPh: "pH не указан",
      lowPco2: "pCO2 снижен",
      highPco2: "pCO2 повышен",
      lowHco3: "HCO3 снижен",
      highHco3: "HCO3 повышен",
      negativeBe: "BE отрицательный",
      positiveBe: "BE положительный",
      highLactate: "Лактат повышен",
      highAnionGap: "Анионная разница повышена",
      highGlucose: "Гипергликемия",
      highKetones: "Бета-гидроксибутират >= 3 ммоль/л",
      noClearAbnormalities: "По введенным данным явных отклонений нет",
    },
    causes: {
      metabolicAcidosis: [
        "Лактатацидоз: шок, гипоксия, сепсис, тканевая гипоперфузия.",
        "Кетоацидоз: диабетический, алкогольный или при голодании.",
        "Почечная недостаточность или уремия.",
        "Потеря бикарбоната: диарея, кишечные свищи.",
        "Интоксикации: метанол, этиленгликоль, салицилаты.",
      ],
      metabolicAlkalosis: [
        "Потеря кислоты и хлора: рвота, аспирация желудочного содержимого.",
        "Петлевые и тиазидные диуретики.",
        "Гиповолемия, гипокалиемия, гипохлоремия.",
        "Избыточное поступление щелочи или бикарбоната.",
        "Минералокортикоидный избыток.",
      ],
      respiratoryAcidosis: [
        "Альвеолярная гиповентиляция.",
        "Седативные, опиоиды или угнетение дыхательного центра.",
        "Обструкция дыхательных путей, тяжелая ХОБЛ или астма.",
        "Нервно-мышечная слабость.",
        "Тяжелая патология грудной клетки или плевры.",
      ],
      respiratoryAlkalosis: [
        "Гипоксемия и дыхательная недостаточность.",
        "ТЭЛА, пневмония, интерстициальное поражение легких.",
        "Боль, тревога, паническая атака.",
        "Сепсис или лихорадка.",
        "Беременность, печеночная недостаточность, стимуляция дыхательного центра.",
      ],
      mixed: [
        "Несколько первичных нарушений КОС одновременно.",
        "Компенсация не соответствует ожидаемой модели.",
        "Нужно перепроверить пробу, электролиты, лактат, кетоны и клинический контекст.",
      ],
      normal: [
        "Нормальный pH не исключает компенсированное или смешанное нарушение.",
        "Сопоставляйте результат с клинической картиной.",
      ],
    },
    actions: {
      metabolicAcidosis: [
        "Оцените лактат, гемодинамику и признаки гипоперфузии.",
        "Рассчитайте анионную разницу и при возможности скорректируйте ее на альбумин.",
        "Проверьте глюкозу и кетоны, если возможен кетоацидоз.",
        "Не превращайте расчет в автоматическое решение о бикарбонате без оценки причины.",
      ],
      metabolicAlkalosis: [
        "Проверьте хлор, калий, объемный статус и диуретики.",
        "Уточните рвоту или потерю желудочного содержимого.",
        "Сверьте фактический pCO2 с ожидаемой компенсацией.",
      ],
      respiratoryAcidosis: [
        "Оцените вентиляцию, уровень сознания и работу дыхания.",
        "Исключите обструкцию и лекарственное угнетение дыхания.",
        "При тяжелом состоянии срочно решайте вопрос о респираторной поддержке.",
      ],
      respiratoryAlkalosis: [
        "Ищите гипоксемию, ТЭЛА, пневмонию, сепсис, боль или тревогу.",
        "Оцените PaO2/FiO2, SpO2 и клинику дыхательной недостаточности.",
        "Не считайте гипервентиляцию психогенной, пока не исключены опасные причины.",
      ],
      mixed: [
        "Рассматривайте результат как клинически значимый, пока не доказано обратное.",
        "Проверьте корректность забора и при сомнении повторите анализ.",
        "Сопоставьте вывод с электролитами, лактатом, кетонами, функцией почек и сатурацией.",
      ],
      normal: [
        "Интерпретируйте результат вместе с симптомами, витальными параметрами и другой лабораторией.",
        "При подозрении на скрытое смешанное нарушение пересмотрите компенсацию и AG.",
      ],
    },
  },
  en: {
    back: "← Back to calculators",
    title: "ABG and acid-base balance",
    description:
      "Structured support for blood-gas and acid-base interpretation. It helps identify the primary disorder, expected compensation, anion gap, oxygenation, and findings compatible with DKA.",
    note:
      "This calculator supports clinical reasoning but does not replace overall patient assessment, pulse oximetry, local laboratory ranges, or treatment protocols.",
    venousNote:
      "Venous samples can help with directional pH and metabolic interpretation, but oxygenation and PaO2/FiO2 assessment should rely on arterial blood.",
    sample: "Sample type",
    arterial: "Arterial blood",
    venous: "Venous blood",
    unit: "Gas unit",
    course: "Course of disorder",
    acute: "Acute",
    chronic: "Chronic",
    example: "Example case",
    reset: "Clear",
    copy: "Copy summary",
    copied: "Copied",
    inputsTitle: "Input values",
    resultsTitle: "Interpretation",
    empty: "Enter at least pH and either pCO2 or HCO3 to begin the interpretation.",
    cards: {
      ph: "pH",
      primary: "Primary disorder",
      compensation: "Expected compensation",
      ag: "Anion gap",
      oxygenation: "Oxygenation",
      dka: "DKA block",
    },
    sections: {
      flags: "Abnormal findings",
      causes: "Likely causes",
      actions: "What to check next",
    },
    fields: {
      ph: "pH",
      pco2: "pCO2",
      po2: "pO2",
      hco3: "HCO3- (mmol/L)",
      be: "BE (mmol/L)",
      na: "Na+ (mmol/L)",
      k: "K+ (mmol/L)",
      cl: "Cl- (mmol/L)",
      albumin: "Albumin (g/L)",
      lactate: "Lactate (mmol/L)",
      glucose: "Glucose (mmol/L)",
      ketones: "Beta-hydroxybutyrate (mmol/L)",
      fio2: "FiO2 (%)",
    },
    placeholders: {
      ph: "7.40",
      pco2: "40",
      po2: "90",
      hco3: "24",
      be: "-2",
      na: "140",
      k: "4.2",
      cl: "104",
      albumin: "40",
      lactate: "1.2",
      glucose: "5.6",
      ketones: "0.3",
      fio2: "21",
    },
    phLabels: {
      missing: "pH missing",
      acidosis: "Acidemia",
      alkalosis: "Alkalemia",
      normal: "pH within range",
    },
    phDetails: {
      missing: "A pH value is needed for acid-base interpretation.",
      acidosis: "pH is below the reference range.",
      alkalosis: "pH is above the reference range.",
      normal: "A normal pH does not exclude a compensated or mixed disorder.",
    },
    primaryLabels: {
      normal: "No clear primary disorder",
      mixedAcidosis: "Mixed acidosis",
      mixedAlkalosis: "Mixed alkalosis",
      probableMixed: "Probable mixed disorder",
      metabolicAcidosis: "Metabolic acidosis",
      metabolicAlkalosis: "Metabolic alkalosis",
      respiratoryAcidosis: "Respiratory acidosis",
      respiratoryAlkalosis: "Respiratory alkalosis",
      compensatedMetabolicAcidosis: "Compensated metabolic acidosis?",
      compensatedMetabolicAlkalosis: "Compensated metabolic alkalosis?",
      compensatedRespiratoryAcidosis: "Compensated respiratory acidosis?",
      compensatedRespiratoryAlkalosis: "Compensated respiratory alkalosis?",
    },
    primaryDetails: {
      noClearPrimary: "The entered values do not identify an obvious primary acid-base disorder.",
      bothAcidotic: "Both the metabolic and respiratory components point toward acidosis.",
      bothAlkalotic: "Both the metabolic and respiratory components point toward alkalosis.",
      normalPhOppositeDirections: "pH is in range but the acid-base components are abnormal in different directions.",
      lowHco3OrBe: "HCO3/BE points toward metabolic acidosis.",
      highHco3OrBe: "HCO3/BE points toward metabolic alkalosis.",
      highPco2: "pCO2 is elevated.",
      lowPco2: "pCO2 is low.",
      normalPhMetAcidosis: "With a normal pH, the pattern is more consistent with compensated metabolic acidosis.",
      normalPhMetAlkalosis: "With a normal pH, the pattern is more consistent with compensated metabolic alkalosis.",
      normalPhRespAcidosis: "With a normal pH, the pattern is more consistent with compensated respiratory acidosis.",
      normalPhRespAlkalosis: "With a normal pH, the pattern is more consistent with compensated respiratory alkalosis.",
    },
    compensationLabels: {
      notRequired: "Not required",
      mixed: "Mixed disorder",
      unavailable: "Cannot calculate",
      expected: "Compensation in expected range",
      extraRespAcidosis: "Additional respiratory acidosis?",
      extraRespAlkalosis: "Additional respiratory alkalosis?",
      extraMetAcidosis: "Additional metabolic acidosis?",
      extraMetAlkalosis: "Additional metabolic alkalosis?",
      notCalculated: "Not calculated",
    },
    compensationTemplates: {
      normal: "No clear primary disorder was identified.",
      mixed: "A single compensation formula is not sufficient for a mixed disorder.",
      needPco2AndHco3: "Compensation assessment needs both pCO2 and HCO3.",
      winter: "Winter's formula: expected PaCO2 {low}-{high} {unit}. Actual {actual}.",
      metabolicAlkalosis: "For metabolic alkalosis the expected PaCO2 is about {low}-{high} {unit}. Actual {actual}.",
      respiratoryAcidosis: "Expected HCO3 in a {course} disorder is {low}-{high} mmol/L. Actual {actual}.",
      respiratoryAlkalosis: "Expected HCO3 in a {course} disorder is {low}-{high} mmol/L. Actual {actual}.",
      fallback: "Compensation could not be calculated.",
    },
    agLabels: {
      missing: "Not enough data",
      normal: "Anion gap roughly normal",
      high: "Anion gap elevated",
      veryHigh: "Anion gap markedly elevated",
    },
    agTemplate:
      "AG without potassium {ag} mmol/L.{withK} {corrected} Interpretation varies by laboratory; hypoalbuminemia lowers the measured anion gap.",
    oxygenLabels: {
      venous: "Limited assessment",
      missing: "No PaO2",
      normal: "PaO2 without major reduction",
      hypoxemia: "Hypoxemia?",
      severeHypoxemia: "Marked hypoxemia?",
      pfImpaired: "PaO2/FiO2 <= 300",
      pfModerate: "PaO2/FiO2 <= 200",
      pfSevere: "PaO2/FiO2 <= 100",
      combinedModerate: "Hypoxemia with impaired P/F ratio",
      combinedSevere: "Severe hypoxemia with impaired P/F ratio",
    },
    oxygenDetails: {
      venous: "Venous blood is not used to assess oxygenation or PaO2/FiO2 the same way arterial blood is.",
      missing: "Enter PaO2 to include oxygenation assessment.",
      standard: "PaO2 {po2} {unit}.{ratio}",
    },
    dkaLabels: {
      none: "No criteria in entered data",
      incomplete: "Incomplete DKA criteria",
      compatible: "Compatible with DKA",
      possibleEuglycemic: "Possible euglycemic ketoacidosis?",
    },
    dkaTemplates: {
      none: "The DKA block needs glucose, ketones, and an acidosis criterion.",
      incomplete: "Observed: {parts}. Full biochemical DKA criteria are not met.",
      compatible: "The biochemical pattern matches DKA: {parts}. Acidosis severity: {severity}.",
      possibleEuglycemic:
        "There is ketonemia and acidosis without clear hyperglycemia. Consider euglycemic ketoacidosis in context. Acidosis severity: {severity}.",
    },
    dkaSeverity: {
      mild: "mild",
      moderate: "moderate",
      severe: "severe",
    },
    flags: {
      venousSample: "Venous sample: interpret the respiratory component cautiously",
      missingPh: "pH missing",
      lowPco2: "pCO2 low",
      highPco2: "pCO2 high",
      lowHco3: "HCO3 low",
      highHco3: "HCO3 high",
      negativeBe: "BE negative",
      positiveBe: "BE positive",
      highLactate: "Lactate elevated",
      highAnionGap: "Anion gap elevated",
      highGlucose: "Hyperglycemia",
      highKetones: "Beta-hydroxybutyrate >= 3 mmol/L",
      noClearAbnormalities: "No clear abnormality in the entered values",
    },
    causes: {
      metabolicAcidosis: [
        "Lactic acidosis from shock, hypoxia, sepsis, or tissue hypoperfusion.",
        "Ketoacidosis: diabetic, alcoholic, or starvation related.",
        "Renal failure or uremia.",
        "Bicarbonate loss from diarrhea or fistulas.",
        "Toxic ingestions such as methanol, ethylene glycol, or salicylates.",
      ],
      metabolicAlkalosis: [
        "Acid and chloride loss from vomiting or gastric suction.",
        "Loop or thiazide diuretics.",
        "Hypovolemia, hypokalemia, hypochloremia.",
        "Excess alkali or bicarbonate intake.",
        "Mineralocorticoid excess.",
      ],
      respiratoryAcidosis: [
        "Alveolar hypoventilation.",
        "Sedatives, opioids, or central respiratory depression.",
        "Airway obstruction, severe COPD, or asthma.",
        "Neuromuscular weakness.",
        "Severe chest-wall or pleural disease.",
      ],
      respiratoryAlkalosis: [
        "Hypoxemia and respiratory failure.",
        "Pulmonary embolism, pneumonia, or interstitial lung disease.",
        "Pain, anxiety, or panic.",
        "Sepsis or fever.",
        "Pregnancy, liver failure, or respiratory-center stimulation.",
      ],
      mixed: [
        "More than one primary acid-base disorder may be present.",
        "Compensation does not fit the expected pattern.",
        "Recheck the sample, electrolytes, lactate, ketones, and clinical context.",
      ],
      normal: [
        "A normal pH does not exclude a compensated or mixed disorder.",
        "Interpret the result alongside the clinical picture.",
      ],
    },
    actions: {
      metabolicAcidosis: [
        "Assess lactate, hemodynamics, and signs of hypoperfusion.",
        "Calculate the anion gap and correct it for albumin when possible.",
        "Check glucose and ketones if ketoacidosis is possible.",
        "Do not turn the calculation into an automatic bicarbonate decision without assessing the cause.",
      ],
      metabolicAlkalosis: [
        "Check chloride, potassium, volume status, and diuretics.",
        "Ask about vomiting or gastric losses.",
        "Compare actual pCO2 with expected compensation.",
      ],
      respiratoryAcidosis: [
        "Assess ventilation, mental status, and work of breathing.",
        "Exclude obstruction and medication-related respiratory depression.",
        "In a sick patient, address the need for urgent ventilatory support.",
      ],
      respiratoryAlkalosis: [
        "Look for hypoxemia, pulmonary embolism, pneumonia, sepsis, pain, or anxiety.",
        "Assess PaO2/FiO2, SpO2, and clinical signs of respiratory failure.",
        "Do not assume psychogenic hyperventilation before dangerous causes are excluded.",
      ],
      mixed: [
        "Treat the pattern as clinically important until proven otherwise.",
        "Verify the sampling process and repeat the test if needed.",
        "Cross-check the result with electrolytes, lactate, ketones, renal function, and oxygenation.",
      ],
      normal: [
        "Interpret the result together with symptoms, vitals, and other laboratory data.",
        "If you suspect a hidden mixed disorder, revisit compensation and anion gap.",
      ],
    },
  },
} as const;

const resultBoxStyles: Record<AbgMode, string> = {
  ok: "border-emerald-200 bg-emerald-50 text-emerald-900",
  info: "border-blue-200 bg-blue-50 text-slate-900",
  warn: "border-amber-200 bg-amber-50 text-slate-900",
  bad: "border-red-200 bg-red-50 text-slate-900",
};

const pillStyles: Record<AbgMode, string> = {
  ok: "border-emerald-200 bg-emerald-50 text-emerald-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
  warn: "border-amber-200 bg-amber-50 text-amber-700",
  bad: "border-red-200 bg-red-50 text-red-700",
};

const fieldRows = [
  ["ph", "pco2"],
  ["po2", "hco3"],
  ["be", "fio2"],
  ["na", "k"],
  ["cl", "albumin"],
  ["lactate", "glucose"],
  ["ketones"],
] as const;

function parseOptionalNumber(raw: string) {
  const normalized = raw.replace(/\s+/g, "").replace(",", ".");
  if (!normalized) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function hasCoreValues(state: AbgFormState) {
  return Boolean(state.ph || state.pco2 || state.hco3 || state.po2);
}

function buildInput(state: AbgFormState): AbgInput {
  return {
    sample: state.sample,
    unit: state.unit,
    course: state.course,
    ph: parseOptionalNumber(state.ph),
    pco2: parseOptionalNumber(state.pco2),
    po2: parseOptionalNumber(state.po2),
    hco3: parseOptionalNumber(state.hco3),
    be: parseOptionalNumber(state.be),
    na: parseOptionalNumber(state.na),
    k: parseOptionalNumber(state.k),
    cl: parseOptionalNumber(state.cl),
    albumin: parseOptionalNumber(state.albumin),
    lactate: parseOptionalNumber(state.lactate),
    glucose: parseOptionalNumber(state.glucose),
    ketones: parseOptionalNumber(state.ketones),
    fio2: parseOptionalNumber(state.fio2),
  };
}

function formatNumber(value: number | null | undefined, lang: UiLang, digits = 1) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(lang === "fi" ? "fi-FI" : lang === "ru" ? "ru-RU" : "en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function unitLabel(unit: AbgGasUnit, lang: UiLang) {
  if (unit === "kPa") {
    return lang === "ru" ? "кПа" : "kPa";
  }
  return lang === "ru" ? "мм рт. ст." : "mmHg";
}

function respiratoryCourseLabel(lang: UiLang, course: AbgCourseType) {
  if (lang === "fi") return course === "chronic" ? "kroonisessa" : "akuutissa";
  if (lang === "ru") return course === "chronic" ? "хроническом" : "остром";
  return course === "chronic" ? "chronic" : "acute";
}

function renderPhDetail(lang: UiLang, analysis: AbgAnalysis) {
  const t = texts[lang];
  const base = t.phDetails[analysis.ph.labelKey];
  if (analysis.ph.value === null) return base;
  return `${base} ${formatNumber(analysis.ph.value, lang, 2)} (${formatNumber(analysis.ph.refLow, lang, 2)}-${formatNumber(analysis.ph.refHigh, lang, 2)}).`;
}

function renderCompensationDetail(lang: UiLang, analysis: AbgAnalysis, gasUnit: AbgGasUnit) {
  const t = texts[lang];
  const detail = analysis.compensation;

  if (detail.detailKey === "winter" || detail.detailKey === "metabolicAlkalosis") {
    return t.compensationTemplates[detail.detailKey]
      .replace("{low}", formatNumber(fromMmHg(detail.expectedLow ?? null, gasUnit), lang, 1))
      .replace("{high}", formatNumber(fromMmHg(detail.expectedHigh ?? null, gasUnit), lang, 1))
      .replace("{unit}", unitLabel(gasUnit, lang))
      .replace("{actual}", formatNumber(fromMmHg(detail.actual ?? null, gasUnit), lang, 1));
  }

  if (detail.detailKey === "respiratoryAcidosis" || detail.detailKey === "respiratoryAlkalosis") {
    return t.compensationTemplates[detail.detailKey]
      .replace("{course}", respiratoryCourseLabel(lang, detail.course ?? "acute"))
      .replace("{low}", formatNumber(detail.expectedLow ?? null, lang, 1))
      .replace("{high}", formatNumber(detail.expectedHigh ?? null, lang, 1))
      .replace("{actual}", formatNumber(detail.actual ?? null, lang, 1));
  }

  return t.compensationTemplates[detail.detailKey];
}

function renderAnionGapDetail(lang: UiLang, analysis: AbgAnalysis) {
  const t = texts[lang];
  if (analysis.anionGap.ag === null) {
    return lang === "ru"
      ? "Для расчета нужны Na+, Cl- и HCO3."
      : lang === "fi"
        ? "Laskentaan tarvitaan Na+, Cl- ja HCO3."
        : "Na+, Cl-, and HCO3 are needed for the calculation.";
  }

  const withK =
    analysis.anionGap.agWithK !== null
      ? ` ${lang === "ru" ? "AG с калием" : lang === "fi" ? "AG kaliumin kanssa" : "AG with potassium"} ${formatNumber(analysis.anionGap.agWithK, lang, 1)} ${lang === "ru" ? "ммоль/л." : "mmol/L."}`
      : "";
  const corrected =
    analysis.anionGap.corrected !== null
      ? `${lang === "ru" ? "AG с поправкой на альбумин" : lang === "fi" ? "Albumiinikorjattu AG" : "Albumin-corrected AG"} ${formatNumber(analysis.anionGap.corrected, lang, 1)} ${lang === "ru" ? "ммоль/л." : "mmol/L."}`
      : "";

  return t.agTemplate
    .replace("{ag}", formatNumber(analysis.anionGap.ag, lang, 1))
    .replace("{withK}", withK)
    .replace("{corrected}", corrected);
}

function renderOxygenationDetail(lang: UiLang, analysis: AbgAnalysis, gasUnit: AbgGasUnit) {
  const t = texts[lang];
  if (analysis.oxygenation.detailKey === "venous") return t.oxygenDetails.venous;
  if (analysis.oxygenation.detailKey === "missing") return t.oxygenDetails.missing;

  const ratioText =
    analysis.oxygenation.ratio !== null
      ? ` ${lang === "ru" ? "PaO2/FiO2 ≈" : lang === "fi" ? "PaO2/FiO2 ≈" : "PaO2/FiO2 ≈"} ${formatNumber(analysis.oxygenation.ratio, lang, 0)} ${lang === "ru" ? "мм рт. ст." : "mmHg"}.`
      : "";

  return t.oxygenDetails.standard
    .replace("{po2}", formatNumber(fromMmHg(analysis.oxygenation.po2mmHg, gasUnit), lang, 1))
    .replace("{unit}", unitLabel(gasUnit, lang))
    .replace("{ratio}", ratioText);
}

function renderDkaDetail(lang: UiLang, analysis: AbgAnalysis) {
  const t = texts[lang];
  const parts: string[] = [];
  if (analysis.dka.glucoseCriterion) parts.push(lang === "ru" ? "глюкоза > 11 ммоль/л" : lang === "fi" ? "glukoosi > 11 mmol/L" : "glucose > 11 mmol/L");
  if (analysis.dka.acidCriterion) parts.push(lang === "ru" ? "ацидоз по pH/HCO3" : lang === "fi" ? "asidoosikriteeri pH/HCO3" : "acidosis by pH/HCO3");
  if (analysis.dka.ketoneCriterion) parts.push(lang === "ru" ? "бета-гидроксибутират >= 3 ммоль/л" : lang === "fi" ? "B-hydroksibutyraatti >= 3 mmol/L" : "beta-hydroxybutyrate >= 3 mmol/L");
  const partsText = parts.length > 0 ? parts.join(", ") : (lang === "ru" ? "нет признаков" : lang === "fi" ? "ei löydöksiä" : "no findings");
  const severity = analysis.dka.severity ? t.dkaSeverity[analysis.dka.severity] : "";

  return t.dkaTemplates[analysis.dka.detailKey]
    .replace("{parts}", partsText)
    .replace("{severity}", severity);
}

function renderFlag(lang: UiLang, flag: AbgFlag) {
  const t = texts[lang];
  const label = t.flags[flag.code];
  if (flag.value === undefined || flag.value === null) return label;
  const suffix = flag.unit ? `: ${formatNumber(flag.value, lang, flag.unit === "%" ? 0 : 1)} ${flag.unit}` : `: ${formatNumber(flag.value, lang, 1)}`;
  return `${label}${suffix}`;
}

function ResultCard({
  icon,
  title,
  label,
  detail,
  mode,
}: {
  icon: ReactNode;
  title: string;
  label: string;
  detail: string;
  mode: AbgMode;
}) {
  return (
    <div className={`rounded-[2rem] border p-5 shadow-sm ${resultBoxStyles[mode]}`}>
      <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
        {icon}
        {title}
      </div>
      <div className="mt-3 text-xl font-black leading-tight">{label}</div>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{detail}</p>
    </div>
  );
}

export default function AbgCalculatorPage() {
  const { language } = useI18n();
  const lang: UiLang = ["fi", "ru", "en"].includes(language as UiLang) ? (language as UiLang) : "fi";
  const t = texts[lang];
  const [state, setState] = useState<AbgFormState>(emptyState);
  const [copied, setCopied] = useState(false);

  const input = useMemo(() => buildInput(state), [state]);
  const analysis = useMemo(() => analyzeAbg(input), [input]);
  const showResults = hasCoreValues(state);

  const setField = (key: keyof AbgFormState, value: string) => {
    setState((current) => ({ ...current, [key]: value }));
  };

  const copySummary = async () => {
    const lines = [
      t.title,
      `${t.cards.ph}: ${t.phLabels[analysis.ph.labelKey]}`,
      `${t.cards.primary}: ${t.primaryLabels[analysis.primary.labelKey]}`,
      `${t.cards.compensation}: ${t.compensationLabels[analysis.compensation.labelKey]}`,
      `${t.cards.ag}: ${t.agLabels[analysis.anionGap.labelKey]}`,
      `${t.cards.oxygenation}: ${t.oxygenLabels[analysis.oxygenation.labelKey]}`,
      `${t.cards.dka}: ${t.dkaLabels[analysis.dka.labelKey]}`,
    ];

    await navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const primaryKey: AbgPrimaryKey = analysis.primary.key;
  const causes = t.causes[primaryKey];
  const actions = t.actions[primaryKey];

  return (
    <div className="max-w-[1320px] mx-auto space-y-5 pb-10 text-slate-900 p-2 sm:p-4">
      <div>
        <Link href="/calculators" className="text-xs font-bold text-blue-600 hover:text-blue-700">
          {t.back}
        </Link>
        <h1 className="mt-2 text-2xl font-black text-slate-800 flex items-center gap-2">
          <Wind className="text-blue-600" size={26} /> {t.title}
        </h1>
        <p className="text-sm text-slate-500 mt-1 max-w-4xl">{t.description}</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[460px_minmax(0,1fr)] gap-6">
        <section className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-600">{t.inputsTitle}</div>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">{t.note}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setState(exampleState)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50"
              >
                <Sparkles size={14} />
                {t.example}
              </button>
              <button
                type="button"
                onClick={() => setState(emptyState)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50"
              >
                <RotateCcw size={14} />
                {t.reset}
              </button>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900 leading-relaxed">
            {t.venousNote}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-blue-600 uppercase ml-1">{t.sample}</label>
              <select
                value={state.sample}
                onChange={(event) => setField("sample", event.target.value as AbgSampleType)}
                className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl font-bold outline-none"
              >
                <option value="arterial">{t.arterial}</option>
                <option value="venous">{t.venous}</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-blue-600 uppercase ml-1">{t.unit}</label>
              <select
                value={state.unit}
                onChange={(event) => setField("unit", event.target.value as AbgGasUnit)}
                className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl font-bold outline-none"
              >
                <option value="mmHg">mmHg</option>
                <option value="kPa">kPa</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-blue-600 uppercase ml-1">{t.course}</label>
            <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setField("course", "acute")}
                className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${state.course === "acute" ? "bg-white shadow-sm text-blue-600" : "text-slate-500"}`}
              >
                {t.acute}
              </button>
              <button
                type="button"
                onClick={() => setField("course", "chronic")}
                className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${state.course === "chronic" ? "bg-white shadow-sm text-blue-600" : "text-slate-500"}`}
              >
                {t.chronic}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {fieldRows.map((row) => (
              <div key={row.join("-")} className={`grid gap-3 ${row.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
                {row.map((fieldKey) => (
                  <div key={fieldKey} className="space-y-1">
                    <label className="text-[10px] font-extrabold text-blue-600 uppercase ml-1">
                      {t.fields[fieldKey as keyof typeof t.fields]}
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={state[fieldKey as keyof AbgFormState]}
                      onChange={(event) => setField(fieldKey as keyof AbgFormState, event.target.value)}
                      placeholder={t.placeholders[fieldKey as keyof typeof t.placeholders]}
                      className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl font-bold outline-none placeholder:text-slate-300"
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-5">
          <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-200 shadow-sm min-h-[280px]">
            <div className="flex items-center justify-between gap-3 mb-6">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-600">{t.resultsTitle}</div>
              </div>
              <button
                type="button"
                onClick={copySummary}
                disabled={!showResults}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                <Copy size={14} />
                {copied ? t.copied : t.copy}
              </button>
            </div>

            {!showResults ? (
              <div className="h-full min-h-[180px] rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-center px-6">
                <Activity size={40} className="text-slate-300 mb-4" />
                <p className="text-sm font-semibold text-slate-400 max-w-xl">{t.empty}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                <ResultCard
                  icon={<Droplets size={14} className="text-blue-600" />}
                  title={t.cards.ph}
                  label={t.phLabels[analysis.ph.labelKey]}
                  detail={renderPhDetail(lang, analysis)}
                  mode={analysis.ph.mode}
                />
                <ResultCard
                  icon={<Wind size={14} className="text-blue-600" />}
                  title={t.cards.primary}
                  label={t.primaryLabels[analysis.primary.labelKey]}
                  detail={t.primaryDetails[analysis.primary.detailKey]}
                  mode={analysis.primary.mode}
                />
                <ResultCard
                  icon={<Sparkles size={14} className="text-blue-600" />}
                  title={t.cards.compensation}
                  label={t.compensationLabels[analysis.compensation.labelKey]}
                  detail={renderCompensationDetail(lang, analysis, state.unit)}
                  mode={analysis.compensation.mode}
                />
                <ResultCard
                  icon={<Activity size={14} className="text-blue-600" />}
                  title={t.cards.ag}
                  label={t.agLabels[analysis.anionGap.labelKey]}
                  detail={renderAnionGapDetail(lang, analysis)}
                  mode={analysis.anionGap.mode}
                />
                <ResultCard
                  icon={<Wind size={14} className="text-blue-600" />}
                  title={t.cards.oxygenation}
                  label={t.oxygenLabels[analysis.oxygenation.labelKey]}
                  detail={renderOxygenationDetail(lang, analysis, state.unit)}
                  mode={analysis.oxygenation.mode}
                />
                <ResultCard
                  icon={<Droplets size={14} className="text-blue-600" />}
                  title={t.cards.dka}
                  label={t.dkaLabels[analysis.dka.labelKey]}
                  detail={renderDkaDetail(lang, analysis)}
                  mode={analysis.dka.mode}
                />
              </div>
            )}
          </div>

          {showResults && (
            <>
              <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-200 shadow-sm">
                <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400 mb-4">{t.sections.flags}</div>
                <div className="flex flex-wrap gap-2">
                  {analysis.flags.map((flag) => (
                    <div key={`${flag.code}-${flag.value ?? "none"}`} className={`rounded-full border px-3 py-2 text-xs font-black ${pillStyles[flag.mode]}`}>
                      {renderFlag(lang, flag)}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-200 shadow-sm">
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400 mb-4">{t.sections.causes}</div>
                  <ul className="space-y-3 text-sm leading-relaxed text-slate-600">
                    {causes.map((item) => (
                      <li key={item} className="flex gap-3">
                        <span className="mt-1 h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-200 shadow-sm">
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400 mb-4">{t.sections.actions}</div>
                  <ul className="space-y-3 text-sm leading-relaxed text-slate-600">
                    {actions.map((item) => (
                      <li key={item} className="flex gap-3">
                        <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
