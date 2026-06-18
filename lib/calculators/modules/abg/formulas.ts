export type AbgSampleType = "arterial" | "venous";
export type AbgGasUnit = "mmHg" | "kPa";
export type AbgCourseType = "acute" | "chronic";
export type AbgPrimaryKey =
  | "metabolicAcidosis"
  | "metabolicAlkalosis"
  | "respiratoryAcidosis"
  | "respiratoryAlkalosis"
  | "mixed"
  | "normal";
export type AbgMode = "ok" | "info" | "warn" | "bad";

export type AbgInput = {
  sample: AbgSampleType;
  unit: AbgGasUnit;
  course: AbgCourseType;
  ph: number | null;
  pco2: number | null;
  po2: number | null;
  hco3: number | null;
  be: number | null;
  na: number | null;
  k: number | null;
  cl: number | null;
  albumin: number | null;
  lactate: number | null;
  glucose: number | null;
  ketones: number | null;
  fio2: number | null;
};

export type AbgFlagCode =
  | "venousSample"
  | "missingPh"
  | "lowPco2"
  | "highPco2"
  | "lowHco3"
  | "highHco3"
  | "negativeBe"
  | "positiveBe"
  | "highLactate"
  | "highAnionGap"
  | "highGlucose"
  | "highKetones"
  | "noClearAbnormalities";

export type AbgFlag = {
  code: AbgFlagCode;
  mode: AbgMode;
  value?: number | null;
  unit?: string;
};

type AbgReferenceRange = {
  phLow: number;
  phHigh: number;
  pco2Low: number;
  pco2High: number;
  hco3Low: number;
  hco3High: number;
  beLow: number;
  beHigh: number;
  normalPco2: number;
  normalHco3: number;
};

type AbgPhResult = {
  labelKey: "missing" | "acidosis" | "alkalosis" | "normal";
  mode: AbgMode;
  direction: "unknown" | "acidosis" | "alkalosis" | "normal";
  value: number | null;
  refLow: number;
  refHigh: number;
};

type AbgPrimaryResult = {
  key: AbgPrimaryKey;
  labelKey:
    | "normal"
    | "mixedAcidosis"
    | "mixedAlkalosis"
    | "probableMixed"
    | "metabolicAcidosis"
    | "metabolicAlkalosis"
    | "respiratoryAcidosis"
    | "respiratoryAlkalosis"
    | "compensatedMetabolicAcidosis"
    | "compensatedMetabolicAlkalosis"
    | "compensatedRespiratoryAcidosis"
    | "compensatedRespiratoryAlkalosis";
  detailKey:
    | "noClearPrimary"
    | "bothAcidotic"
    | "bothAlkalotic"
    | "normalPhOppositeDirections"
    | "lowHco3OrBe"
    | "highHco3OrBe"
    | "highPco2"
    | "lowPco2"
    | "normalPhMetAcidosis"
    | "normalPhMetAlkalosis"
    | "normalPhRespAcidosis"
    | "normalPhRespAlkalosis";
  mode: AbgMode;
};

type AbgCompensationResult = {
  labelKey:
    | "notRequired"
    | "mixed"
    | "unavailable"
    | "expected"
    | "extraRespAcidosis"
    | "extraRespAlkalosis"
    | "extraMetAcidosis"
    | "extraMetAlkalosis"
    | "notCalculated";
  detailKey:
    | "normal"
    | "mixed"
    | "needPco2AndHco3"
    | "winter"
    | "metabolicAlkalosis"
    | "respiratoryAcidosis"
    | "respiratoryAlkalosis"
    | "fallback";
  mode: AbgMode;
  expectedLow?: number | null;
  expectedHigh?: number | null;
  actual?: number | null;
  unitType?: "pco2" | "hco3";
  course?: AbgCourseType;
};

type AbgAnionGapResult = {
  labelKey: "missing" | "normal" | "high" | "veryHigh";
  detailKey: "standard";
  mode: AbgMode;
  ag: number | null;
  agWithK: number | null;
  corrected: number | null;
};

type AbgOxygenationResult = {
  labelKey:
    | "venous"
    | "missing"
    | "normal"
    | "hypoxemia"
    | "severeHypoxemia"
    | "pfImpaired"
    | "pfModerate"
    | "pfSevere"
    | "combinedModerate"
    | "combinedSevere";
  detailKey: "venous" | "missing" | "standard";
  mode: AbgMode;
  po2mmHg: number | null;
  ratio: number | null;
};

type AbgDkaResult = {
  labelKey: "none" | "incomplete" | "compatible" | "possibleEuglycemic";
  detailKey: "none" | "incomplete" | "compatible" | "possibleEuglycemic";
  mode: AbgMode;
  severity: "mild" | "moderate" | "severe" | null;
  glucoseCriterion: boolean;
  acidCriterion: boolean;
  ketoneCriterion: boolean;
};

export type AbgAnalysis = {
  reference: AbgReferenceRange;
  ph: AbgPhResult;
  primary: AbgPrimaryResult;
  compensation: AbgCompensationResult;
  anionGap: AbgAnionGapResult;
  oxygenation: AbgOxygenationResult;
  dka: AbgDkaResult;
  flags: AbgFlag[];
};

const MMHG_PER_KPA = 7.50062;

const REFERENCES: Record<AbgSampleType, AbgReferenceRange> = {
  arterial: {
    phLow: 7.35,
    phHigh: 7.45,
    pco2Low: 35,
    pco2High: 45,
    hco3Low: 22,
    hco3High: 26,
    beLow: -2.5,
    beHigh: 2.5,
    normalPco2: 40,
    normalHco3: 24,
  },
  venous: {
    phLow: 7.32,
    phHigh: 7.42,
    pco2Low: 41,
    pco2High: 51,
    hco3Low: 22,
    hco3High: 28,
    beLow: -2.5,
    beHigh: 2.5,
    normalPco2: 46,
    normalHco3: 24,
  },
};

const MODE_WEIGHT: Record<AbgMode, number> = {
  ok: 0,
  info: 1,
  warn: 2,
  bad: 3,
};

export function toMmHg(value: number | null, unit: AbgGasUnit) {
  if (value === null) return null;
  return unit === "kPa" ? value * MMHG_PER_KPA : value;
}

export function fromMmHg(value: number | null, unit: AbgGasUnit) {
  if (value === null) return null;
  return unit === "kPa" ? value / MMHG_PER_KPA : value;
}

export function getAbgReference(sample: AbgSampleType) {
  return REFERENCES[sample];
}

function worseMode(current: AbgMode, next: AbgMode): AbgMode {
  return MODE_WEIGHT[next] > MODE_WEIGHT[current] ? next : current;
}

function classifyPh(ph: number | null, ref: AbgReferenceRange): AbgPhResult {
  if (ph === null) {
    return {
      labelKey: "missing",
      mode: "warn",
      direction: "unknown",
      value: null,
      refLow: ref.phLow,
      refHigh: ref.phHigh,
    };
  }

  if (ph < ref.phLow) {
    return {
      labelKey: "acidosis",
      mode: "bad",
      direction: "acidosis",
      value: ph,
      refLow: ref.phLow,
      refHigh: ref.phHigh,
    };
  }

  if (ph > ref.phHigh) {
    return {
      labelKey: "alkalosis",
      mode: "warn",
      direction: "alkalosis",
      value: ph,
      refLow: ref.phLow,
      refHigh: ref.phHigh,
    };
  }

  return {
    labelKey: "normal",
    mode: "ok",
    direction: "normal",
    value: ph,
    refLow: ref.phLow,
    refHigh: ref.phHigh,
  };
}

function identifyPrimary(
  ph: number | null,
  phDirection: AbgPhResult["direction"],
  pco2: number | null,
  hco3: number | null,
  be: number | null,
  ref: AbgReferenceRange
): AbgPrimaryResult {
  const highPco2 = pco2 !== null && pco2 > ref.pco2High;
  const lowPco2 = pco2 !== null && pco2 < ref.pco2Low;
  const lowHco3 = hco3 !== null && hco3 < ref.hco3Low;
  const highHco3 = hco3 !== null && hco3 > ref.hco3High;
  const lowBe = be !== null && be < ref.beLow;
  const highBe = be !== null && be > ref.beHigh;
  const acidMidpoint = (ref.phLow + ref.phHigh) / 2;

  if (phDirection === "acidosis") {
    const metabolic = lowHco3 || lowBe;
    const respiratory = highPco2;

    if (metabolic && respiratory) {
      return { key: "mixed", labelKey: "mixedAcidosis", detailKey: "bothAcidotic", mode: "bad" };
    }
    if (metabolic) {
      return { key: "metabolicAcidosis", labelKey: "metabolicAcidosis", detailKey: "lowHco3OrBe", mode: "bad" };
    }
    if (respiratory) {
      return { key: "respiratoryAcidosis", labelKey: "respiratoryAcidosis", detailKey: "highPco2", mode: "bad" };
    }
  }

  if (phDirection === "alkalosis") {
    const metabolic = highHco3 || highBe;
    const respiratory = lowPco2;

    if (metabolic && respiratory) {
      return { key: "mixed", labelKey: "mixedAlkalosis", detailKey: "bothAlkalotic", mode: "warn" };
    }
    if (metabolic) {
      return { key: "metabolicAlkalosis", labelKey: "metabolicAlkalosis", detailKey: "highHco3OrBe", mode: "warn" };
    }
    if (respiratory) {
      return { key: "respiratoryAlkalosis", labelKey: "respiratoryAlkalosis", detailKey: "lowPco2", mode: "warn" };
    }
  }

  if (phDirection === "normal") {
    if ((lowHco3 || lowBe) && highPco2) {
      return { key: "mixed", labelKey: "mixedAcidosis", detailKey: "bothAcidotic", mode: "bad" };
    }

    if ((highHco3 || highBe) && lowPco2) {
      return { key: "mixed", labelKey: "mixedAlkalosis", detailKey: "bothAlkalotic", mode: "warn" };
    }

    if ((lowHco3 || lowBe) && lowPco2) {
      if (ph !== null && ph <= acidMidpoint) {
        return {
          key: "metabolicAcidosis",
          labelKey: "compensatedMetabolicAcidosis",
          detailKey: "normalPhMetAcidosis",
          mode: "warn",
        };
      }
      return {
        key: "respiratoryAlkalosis",
        labelKey: "compensatedRespiratoryAlkalosis",
        detailKey: "normalPhRespAlkalosis",
        mode: "warn",
      };
    }

    if ((highHco3 || highBe) && highPco2) {
      if (ph !== null && ph <= acidMidpoint) {
        return {
          key: "respiratoryAcidosis",
          labelKey: "compensatedRespiratoryAcidosis",
          detailKey: "normalPhRespAcidosis",
          mode: "warn",
        };
      }
      return {
        key: "metabolicAlkalosis",
        labelKey: "compensatedMetabolicAlkalosis",
        detailKey: "normalPhMetAlkalosis",
        mode: "warn",
      };
    }

    if ((lowHco3 || lowBe) && (highHco3 || highBe || highPco2 || lowPco2)) {
      return { key: "mixed", labelKey: "probableMixed", detailKey: "normalPhOppositeDirections", mode: "warn" };
    }
    if ((highHco3 || highBe) && (lowPco2 || highPco2 || lowHco3 || lowBe)) {
      return { key: "mixed", labelKey: "probableMixed", detailKey: "normalPhOppositeDirections", mode: "warn" };
    }

    if (lowHco3 || lowBe) {
      return {
        key: "metabolicAcidosis",
        labelKey: "compensatedMetabolicAcidosis",
        detailKey: "normalPhMetAcidosis",
        mode: "warn",
      };
    }
    if (highHco3 || highBe) {
      return {
        key: "metabolicAlkalosis",
        labelKey: "compensatedMetabolicAlkalosis",
        detailKey: "normalPhMetAlkalosis",
        mode: "warn",
      };
    }
    if (highPco2) {
      return {
        key: "respiratoryAcidosis",
        labelKey: "compensatedRespiratoryAcidosis",
        detailKey: "normalPhRespAcidosis",
        mode: "warn",
      };
    }
    if (lowPco2) {
      return {
        key: "respiratoryAlkalosis",
        labelKey: "compensatedRespiratoryAlkalosis",
        detailKey: "normalPhRespAlkalosis",
        mode: "warn",
      };
    }
  }

  return { key: "normal", labelKey: "normal", detailKey: "noClearPrimary", mode: "ok" };
}

function compensation(
  primaryKey: AbgPrimaryKey,
  pco2: number | null,
  hco3: number | null,
  course: AbgCourseType
): AbgCompensationResult {
  let expected = 0;
  let low = 0;
  let high = 0;
  let delta = 0;

  if (primaryKey === "normal") {
    return { labelKey: "notRequired", detailKey: "normal", mode: "info" };
  }
  if (primaryKey === "mixed") {
    return { labelKey: "mixed", detailKey: "mixed", mode: "warn" };
  }
  if (pco2 === null || hco3 === null) {
    return { labelKey: "unavailable", detailKey: "needPco2AndHco3", mode: "info" };
  }

  if (primaryKey === "metabolicAcidosis") {
    expected = 1.5 * hco3 + 8;
    low = expected - 2;
    high = expected + 2;
    if (pco2 >= low && pco2 <= high) {
      return { labelKey: "expected", detailKey: "winter", mode: "ok", expectedLow: low, expectedHigh: high, actual: pco2, unitType: "pco2" };
    }
    if (pco2 > high) {
      return { labelKey: "extraRespAcidosis", detailKey: "winter", mode: "bad", expectedLow: low, expectedHigh: high, actual: pco2, unitType: "pco2" };
    }
    return { labelKey: "extraRespAlkalosis", detailKey: "winter", mode: "warn", expectedLow: low, expectedHigh: high, actual: pco2, unitType: "pco2" };
  }

  if (primaryKey === "metabolicAlkalosis") {
    expected = 40 + 0.7 * (hco3 - 24);
    low = expected - 5;
    high = Math.min(expected + 5, 55);
    if (pco2 >= low && pco2 <= high) {
      return { labelKey: "expected", detailKey: "metabolicAlkalosis", mode: "ok", expectedLow: low, expectedHigh: high, actual: pco2, unitType: "pco2" };
    }
    if (pco2 > high) {
      return { labelKey: "extraRespAcidosis", detailKey: "metabolicAlkalosis", mode: "bad", expectedLow: low, expectedHigh: high, actual: pco2, unitType: "pco2" };
    }
    return { labelKey: "extraRespAlkalosis", detailKey: "metabolicAlkalosis", mode: "warn", expectedLow: low, expectedHigh: high, actual: pco2, unitType: "pco2" };
  }

  if (primaryKey === "respiratoryAcidosis") {
    delta = Math.max(0, (pco2 - 40) / 10);
    low = 24 + (course === "chronic" ? 3 : 1) * delta;
    high = 24 + (course === "chronic" ? 4 : 2) * delta;
    if (hco3 >= low && hco3 <= high) {
      return { labelKey: "expected", detailKey: "respiratoryAcidosis", mode: "ok", expectedLow: low, expectedHigh: high, actual: hco3, unitType: "hco3", course };
    }
    if (hco3 < low) {
      return { labelKey: "extraMetAcidosis", detailKey: "respiratoryAcidosis", mode: "bad", expectedLow: low, expectedHigh: high, actual: hco3, unitType: "hco3", course };
    }
    return { labelKey: "extraMetAlkalosis", detailKey: "respiratoryAcidosis", mode: "warn", expectedLow: low, expectedHigh: high, actual: hco3, unitType: "hco3", course };
  }

  if (primaryKey === "respiratoryAlkalosis") {
    delta = Math.max(0, (40 - pco2) / 10);
    low = 24 - (course === "chronic" ? 5 : 2) * delta;
    high = 24 - (course === "chronic" ? 4 : 1) * delta;
    if (hco3 >= low && hco3 <= high) {
      return { labelKey: "expected", detailKey: "respiratoryAlkalosis", mode: "ok", expectedLow: low, expectedHigh: high, actual: hco3, unitType: "hco3", course };
    }
    if (hco3 < low) {
      return { labelKey: "extraMetAcidosis", detailKey: "respiratoryAlkalosis", mode: "bad", expectedLow: low, expectedHigh: high, actual: hco3, unitType: "hco3", course };
    }
    return { labelKey: "extraMetAlkalosis", detailKey: "respiratoryAlkalosis", mode: "warn", expectedLow: low, expectedHigh: high, actual: hco3, unitType: "hco3", course };
  }

  return { labelKey: "notCalculated", detailKey: "fallback", mode: "info" };
}

function anionGap(
  na: number | null,
  k: number | null,
  cl: number | null,
  hco3: number | null,
  albumin: number | null
): AbgAnionGapResult {
  if (na === null || cl === null || hco3 === null) {
    return { labelKey: "missing", detailKey: "standard", mode: "info", ag: null, agWithK: null, corrected: null };
  }

  const ag = na - (cl + hco3);
  const agWithK = k !== null ? na + k - (cl + hco3) : null;
  const corrected = albumin !== null ? ag + 2.5 * ((40 - albumin) / 10) : null;
  const assessed = corrected ?? ag;

  if (assessed > 20) {
    return { labelKey: "veryHigh", detailKey: "standard", mode: "bad", ag: assessed, agWithK, corrected };
  }
  if (assessed > 12) {
    return { labelKey: "high", detailKey: "standard", mode: "warn", ag: assessed, agWithK, corrected };
  }
  return { labelKey: "normal", detailKey: "standard", mode: "ok", ag: assessed, agWithK, corrected };
}

function oxygenation(
  sample: AbgSampleType,
  po2: number | null,
  fio2: number | null
): AbgOxygenationResult {
  if (sample !== "arterial") {
    return { labelKey: "venous", detailKey: "venous", mode: "info", po2mmHg: po2, ratio: null };
  }
  if (po2 === null) {
    return { labelKey: "missing", detailKey: "missing", mode: "info", po2mmHg: null, ratio: null };
  }

  let labelKey: AbgOxygenationResult["labelKey"] = "normal";
  let mode: AbgMode = "ok";
  if (po2 < 60) {
    labelKey = "severeHypoxemia";
    mode = "bad";
  } else if (po2 < 80) {
    labelKey = "hypoxemia";
    mode = "warn";
  }

  let ratio: number | null = null;
  if (fio2 !== null && fio2 > 0) {
    ratio = po2 / (fio2 / 100);
    if (ratio <= 100) {
      labelKey = po2 < 60 ? "combinedSevere" : "pfSevere";
      mode = worseMode(mode, "bad");
    } else if (ratio <= 200) {
      labelKey = po2 < 60 ? "combinedSevere" : "pfModerate";
      mode = worseMode(mode, "bad");
    } else if (ratio <= 300) {
      labelKey = po2 < 60 ? "combinedModerate" : "pfImpaired";
      mode = worseMode(mode, "warn");
    }
  }

  return { labelKey, detailKey: "standard", mode, po2mmHg: po2, ratio };
}

function dkaBlock(
  ph: number | null,
  hco3: number | null,
  glucose: number | null,
  ketones: number | null
): AbgDkaResult {
  const glucoseCriterion = glucose !== null && glucose > 11;
  const acidCriterion = (ph !== null && ph < 7.3) || (hco3 !== null && hco3 < 18);
  const ketoneCriterion = ketones !== null && ketones >= 3;

  if (!glucoseCriterion && !acidCriterion && !ketoneCriterion) {
    return {
      labelKey: "none",
      detailKey: "none",
      mode: "info",
      severity: null,
      glucoseCriterion,
      acidCriterion,
      ketoneCriterion,
    };
  }

  if (acidCriterion && ketoneCriterion && !glucoseCriterion) {
    return {
      labelKey: "possibleEuglycemic",
      detailKey: "possibleEuglycemic",
      mode: "warn",
      severity: determineDkaSeverity(ph, hco3),
      glucoseCriterion,
      acidCriterion,
      ketoneCriterion,
    };
  }

  if (glucoseCriterion && acidCriterion && ketoneCriterion) {
    return {
      labelKey: "compatible",
      detailKey: "compatible",
      mode: "bad",
      severity: determineDkaSeverity(ph, hco3),
      glucoseCriterion,
      acidCriterion,
      ketoneCriterion,
    };
  }

  return {
    labelKey: "incomplete",
    detailKey: "incomplete",
    mode: "warn",
    severity: null,
    glucoseCriterion,
    acidCriterion,
    ketoneCriterion,
  };
}

function determineDkaSeverity(ph: number | null, hco3: number | null): "mild" | "moderate" | "severe" {
  if ((ph !== null && ph < 7.0) || (hco3 !== null && hco3 < 10)) {
    return "severe";
  }
  if ((ph !== null && ph < 7.24) || (hco3 !== null && hco3 < 15)) {
    return "moderate";
  }
  return "mild";
}

function buildFlags(input: AbgInput, ref: AbgReferenceRange, ag: AbgAnionGapResult): AbgFlag[] {
  const flags: AbgFlag[] = [];
  const pco2MmHg = toMmHg(input.pco2, input.unit);

  if (input.sample === "venous") flags.push({ code: "venousSample", mode: "info" });
  if (input.ph === null) flags.push({ code: "missingPh", mode: "warn" });
  if (pco2MmHg !== null && pco2MmHg < ref.pco2Low) flags.push({ code: "lowPco2", mode: "warn", value: input.pco2, unit: input.unit });
  if (pco2MmHg !== null && pco2MmHg > ref.pco2High) flags.push({ code: "highPco2", mode: "bad", value: input.pco2, unit: input.unit });
  if (input.hco3 !== null && input.hco3 < ref.hco3Low) flags.push({ code: "lowHco3", mode: "bad", value: input.hco3, unit: "mmol/L" });
  if (input.hco3 !== null && input.hco3 > ref.hco3High) flags.push({ code: "highHco3", mode: "warn", value: input.hco3, unit: "mmol/L" });
  if (input.be !== null && input.be < ref.beLow) flags.push({ code: "negativeBe", mode: "bad", value: input.be, unit: "mmol/L" });
  if (input.be !== null && input.be > ref.beHigh) flags.push({ code: "positiveBe", mode: "warn", value: input.be, unit: "mmol/L" });
  if (input.lactate !== null && input.lactate > 2) flags.push({ code: "highLactate", mode: "bad", value: input.lactate, unit: "mmol/L" });
  if (ag.ag !== null && ag.ag > 12) flags.push({ code: "highAnionGap", mode: ag.ag > 20 ? "bad" : "warn", value: ag.ag, unit: "mmol/L" });
  if (input.glucose !== null && input.glucose > 11) flags.push({ code: "highGlucose", mode: "warn", value: input.glucose, unit: "mmol/L" });
  if (input.ketones !== null && input.ketones >= 3) flags.push({ code: "highKetones", mode: "bad", value: input.ketones, unit: "mmol/L" });
  if (flags.length === 0) flags.push({ code: "noClearAbnormalities", mode: "ok" });

  return flags;
}

export function analyzeAbg(input: AbgInput): AbgAnalysis {
  const reference = getAbgReference(input.sample);
  const pco2MmHg = toMmHg(input.pco2, input.unit);
  const po2MmHg = toMmHg(input.po2, input.unit);
  const ph = classifyPh(input.ph, reference);
  const primary = identifyPrimary(input.ph, ph.direction, pco2MmHg, input.hco3, input.be, reference);
  const compensationResult = compensation(primary.key, pco2MmHg, input.hco3, input.course);
  const anionGapResult = anionGap(input.na, input.k, input.cl, input.hco3, input.albumin);
  const oxygenationResult = oxygenation(input.sample, po2MmHg, input.fio2);
  const dkaResult = dkaBlock(input.ph, input.hco3, input.glucose, input.ketones);
  const flags = buildFlags(input, reference, anionGapResult);

  return {
    reference,
    ph,
    primary,
    compensation: compensationResult,
    anionGap: anionGapResult,
    oxygenation: oxygenationResult,
    dka: dkaResult,
    flags,
  };
}
