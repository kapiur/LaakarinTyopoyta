import assert from 'assert';
import { calculateBmi, classifyBmi } from '../lib/calculators/modules/bmi/formulas';
import { calculateCockcroftGault, classifyGfr } from '../lib/calculators/modules/gfr/formulas';
import { assessVteRisk, calculateVteScore } from '../lib/calculators/modules/vte/formulas';
import { assessPeRisk, calculatePeScore, getAgeAdjustedDdimerThreshold } from '../lib/calculators/modules/pe/formulas';
import {
  assessChadsVascRisk,
  assessHasBledRisk,
  calculateChadsVascScore,
  calculateHasBledScore,
} from '../lib/calculators/modules/chads/formulas';
import { assessCadRisk, countCadRiskFactors, getCadFactorBucket } from '../lib/calculators/modules/cad/formulas';

function testBmi() {
  assert.equal(calculateBmi(175, 75)?.toFixed(1), '24.5');
  assert.equal(calculateBmi(0, 75), null);
  assert.equal(classifyBmi(17.9), 'underweight');
  assert.equal(classifyBmi(24.5), 'normal');
  assert.equal(classifyBmi(32), 'obesity1');
}

function testGfr() {
  assert.equal(Math.round(calculateCockcroftGault(65, 75, 100, 'male') ?? 0), 69);
  assert.equal(Math.round(calculateCockcroftGault(65, 75, 100, 'female') ?? 0), 59);
  assert.equal(calculateCockcroftGault(65, 75, 0, 'male'), null);
  assert.equal(classifyGfr(95), 'normal');
  assert.equal(classifyGfr(52), 'mildModerate');
  assert.equal(classifyGfr(12), 'kidneyFailure');
}

function testVte() {
  const lowScore = calculateVteScore({});
  assert.equal(lowScore, 0);
  assert.equal(assessVteRisk(lowScore).risk, 'low');

  const moderateScore = calculateVteScore({ cancer: 1, immob: 1, alt: -2, prev: 1 });
  assert.equal(moderateScore, 1);
  assert.equal(assessVteRisk(moderateScore).risk, 'moderate');

  const highScore = calculateVteScore({ cancer: 1, immob: 1, bed: 1 });
  assert.equal(highScore, 3);
  assert.equal(assessVteRisk(highScore).risk, 'high');
}

function testPe() {
  assert.equal(calculatePeScore({}), 0);
  assert.equal(getAgeAdjustedDdimerThreshold(45), '0.5');
  assert.equal(getAgeAdjustedDdimerThreshold(68), '0.7');

  const low = assessPeRisk(calculatePeScore({}), 45);
  assert.equal(low.risk, 'low');
  assert.equal(low.recommendationFi, 'D-dimeeri. Jos < 1.0, PE poissuljettu.');

  const moderate = assessPeRisk(calculatePeScore({ vtesigns: 3 }), 68);
  assert.equal(moderate.risk, 'moderate');
  assert.equal(moderate.dDimerThreshold, '0.7');
  assert.ok(moderate.recommendationFi.includes('0.7'));

  const high = assessPeRisk(calculatePeScore({ vtesigns: 3, altpe: 3, hr: 1.5 }), 60);
  assert.equal(high.risk, 'high');
}

function testChadsHasBled() {
  const chadsZero = calculateChadsVascScore({
    chf: false,
    hypertension: false,
    age75Plus: false,
    age65to74: false,
    diabetes: false,
    strokeOrTia: false,
    vascularDisease: false,
    femaleSex: true,
  });
  assert.equal(chadsZero, 0);

  const chadsScore = calculateChadsVascScore({
    chf: true,
    hypertension: true,
    age75Plus: false,
    age65to74: true,
    diabetes: true,
    strokeOrTia: false,
    vascularDisease: true,
    femaleSex: true,
  });
  assert.equal(chadsScore, 6);
  assert.equal(assessChadsVascRisk(chadsScore).annualStrokeRiskPercent, 9.8);

  const hasBledScore = calculateHasBledScore({
    systolicBpOver160: true,
    renal: true,
    liver: false,
    stroke: false,
    priorBleeding: true,
    labileInr: false,
    ageOver65: true,
    drugs: false,
    alcohol: false,
  });
  assert.equal(hasBledScore, 4);
  assert.equal(assessHasBledRisk(hasBledScore).riskLevel, 'high');
}

function testCad() {
  const factors = {
    family: true,
    smoking: true,
    dyslipidemia: false,
    diabetes: false,
    hypertension: false,
  };

  assert.equal(countCadRiskFactors(factors), 2);
  assert.equal(getCadFactorBucket(0), '0-1');
  assert.equal(getCadFactorBucket(2), '2-3');
  assert.equal(getCadFactorBucket(4), '4-5');

  const low = assessCadRisk({
    ageRange: '40-49',
    sex: 'female',
    symptoms: 'other',
    factors: {
      family: false,
      smoking: false,
      dyslipidemia: false,
      diabetes: false,
      hypertension: false,
    },
  });
  assert.equal(low.probability, 1);
  assert.equal(low.riskLevel, 'low');

  const elevated = assessCadRisk({
    ageRange: '60-69',
    sex: 'male',
    symptoms: 'typical',
    factors: {
      family: true,
      smoking: true,
      dyslipidemia: true,
      diabetes: true,
      hypertension: false,
    },
  });
  assert.equal(elevated.factorBucket, '4-5');
  assert.equal(elevated.probability, 39);
  assert.equal(elevated.riskLevel, 'elevated');
}

function run() {
  testBmi();
  testGfr();
  testVte();
  testPe();
  testChadsHasBled();
  testCad();

  console.log('Calculator formula tests passed.');
}

run();
