import { anonymizePatientText } from '../lib/privacy/anonymizePatientText';

type TestCase = {
  name: string;
  input: string;
  expectedFragments: string[];
  forbiddenFragments: string[];
};

const syntheticHetu = '13' + '1052' + '-' + '308T';
const syntheticEmail = 'patient.name' + '@' + 'example.com';
const syntheticPhone = '+358' + ' 40 ' + '123 ' + '4567';
const syntheticDob = '13' + '.10' + '.1952';
const syntheticName = 'Matti' + ' ' + 'Meikalainen';
const syntheticAddress = 'Esimerkkikatu' + ' ' + '12 A';

const cases: TestCase[] = [
  {
    name: 'Finnish personal identity code is redacted',
    input: `Potilaan henkilötunnus on ${syntheticHetu} ja asia koskee kontrollia.`,
    expectedFragments: ['[HETU]'],
    forbiddenFragments: [syntheticHetu],
  },
  {
    name: 'Email is redacted',
    input: `Yhteydenotto sähköpostilla ${syntheticEmail}.`,
    expectedFragments: ['[EMAIL]'],
    forbiddenFragments: [syntheticEmail],
  },
  {
    name: 'Finnish phone number is redacted',
    input: `Puhelinnumero ${syntheticPhone} lisätietoja varten.`,
    expectedFragments: ['[PHONE]'],
    forbiddenFragments: [syntheticPhone],
  },
  {
    name: 'Date of birth with context is redacted',
    input: `Potilas synt. ${syntheticDob}, tulee kontrolliin.`,
    expectedFragments: ['synt. [DATE_OF_BIRTH]'],
    forbiddenFragments: [syntheticDob],
  },
  {
    name: 'Explicit patient name is redacted',
    input: `Potilas: ${syntheticName}. Oireena huimaus.`,
    expectedFragments: ['Potilas: [NAME]'],
    forbiddenFragments: [syntheticName],
  },
  {
    name: 'Street address is redacted',
    input: `Osoite on ${syntheticAddress}. Potilas asuu yksin.`,
    expectedFragments: ['[ADDRESS]'],
    forbiddenFragments: [syntheticAddress],
  },
];

let failed = 0;

for (const testCase of cases) {
  const result = anonymizePatientText(testCase.input);

  for (const expected of testCase.expectedFragments) {
    if (!result.sanitizedText.includes(expected)) {
      failed += 1;
      console.error(`FAIL ${testCase.name}: expected fragment missing: ${expected}`);
      console.error(result.sanitizedText);
    }
  }

  for (const forbidden of testCase.forbiddenFragments) {
    if (result.sanitizedText.includes(forbidden)) {
      failed += 1;
      console.error(`FAIL ${testCase.name}: forbidden fragment still present`);
      console.error(result.sanitizedText);
    }
  }
}

if (failed > 0) {
  console.error(`Privacy anonymizer tests failed: ${failed}`);
  process.exit(1);
}

console.log(`Privacy anonymizer tests passed: ${cases.length}`);
