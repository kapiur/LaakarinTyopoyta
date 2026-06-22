import { anonymizePatientText, type AnonymizationMode } from '../lib/privacy/anonymizePatientText';
import { preparePrivacyPayload } from '../lib/privacy/gateway';

type TestCase = {
  name: string;
  input: string;
  mode?: AnonymizationMode;
  expectedFragments: string[];
  forbiddenFragments: string[];
};

const syntheticHetu = '13' + '1052' + '-' + '308T';
const syntheticModernHetu = '01' + '0120' + 'B' + '123A';
const syntheticEmail = 'patient.name' + '@' + 'example.com';
const syntheticPhone = '+358' + ' 40 ' + '123 ' + '4567';
const syntheticLocalPhone = '045' + '117' + '4031';
const syntheticRuPhone = '+7' + ' 999 ' + '123-45-67';
const syntheticEnPhone = '+44' + ' 20 ' + '7946 ' + '0958';
const syntheticDob = '13' + '.10' + '.1952';
const syntheticBareDob = '10' + '.11' + '.1980';
const syntheticName = 'Matti' + ' ' + 'Meikalainen';
const syntheticSpouseName = 'Anna' + ' ' + 'Virtanen';
const syntheticStaffName = 'Laura' + ' ' + 'Laaksonen';
const syntheticPhysioName = 'Pekka' + ' ' + 'Korhonen';
const syntheticNameFromUserExample = 'Iurii' + ' ' + 'Kapustin';
const syntheticAddress = 'Esimerkkikatu' + ' ' + '12 A';
const syntheticLongAddress = 'Vanha Esimerkkitie' + ' ' + '12 A as 4, 00100 Helsinki';
const clinicalHeadingSample = [
  'Esitiedot',
  '',
  'Kts. yst. kollega Emma Karstusen potilasteksti 8.10.2025 ja diabeteshoitajien edeltavat tekstit.',
  'Potilaan HbA1c ollut viime syksyssa tasolla 99 ja Libressa TIR ollut ainoastaan 11%.',
  '',
  'Suunnitelma',
  '',
  'Hoitaja opastanut Tresiban annoslaskun ad 26 ky x1 aamuisin.',
].join('\n');
const commaNameSample = 'Romanenko, Olga (Terveyskeskuslaakari) tarkisti laboratorion tulokset 23.02.2026.';
const blockedLongClinicalSample = [
  '07.05.2026VOMANYD2',
  '',
  'HOI',
  'L17',
  'Jalan/varpaan oire/vaiva',
  'Meiseri, Heidi (Sairaanhoitaja)',
  'Hoidon syy',
  'L17 Jalan/varpaan oire/vaiva',
  'Esitiedot',
  'Ollut eilen yhteydessa kiirelinjalle.',
  'Kts. 7.5 HOI teksti.',
  'Nykytila',
  'Tulee ohjatusti kiirevastaanotolle.',
  'Suunnitelma',
  'Laitetaan laakarin arvioon.',
  '07.05.2026Keusote Digitiimi, Keski-Uudenmaan hyvinvointialue',
].join('\n');

const cases: TestCase[] = [
  {
    name: 'Finnish personal identity code is redacted',
    input: `Potilaan henkilötunnus on ${syntheticHetu} ja asia koskee kontrollia.`,
    expectedFragments: ['[HETU]'],
    forbiddenFragments: [syntheticHetu],
  },
  {
    name: 'Modern Finnish identity code separator is redacted',
    input: `Potilaan henkilötunnus on ${syntheticModernHetu} ja asia koskee kontrollia.`,
    expectedFragments: ['[HETU]'],
    forbiddenFragments: [syntheticModernHetu],
  },
  {
    name: 'Incomplete Finnish identity-like code is not treated as HETU',
    input: `Koodi 101180-287 ei yksin riitä henkilötunnukseksi.`,
    expectedFragments: ['101180-287'],
    forbiddenFragments: ['[HETU]'],
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
    name: 'Russian labelled phone number is redacted',
    input: `Телефон: ${syntheticRuPhone}.`,
    expectedFragments: ['Телефон [PHONE]'],
    forbiddenFragments: [syntheticRuPhone],
  },
  {
    name: 'English labelled phone number is redacted',
    input: `Phone: ${syntheticEnPhone}.`,
    expectedFragments: ['Phone [PHONE]'],
    forbiddenFragments: [syntheticEnPhone],
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
    name: 'Patient role followed by capitalized name is redacted without removing the role word',
    input: 'Пациент Юрий Иванов жалуется на слабость.',
    expectedFragments: ['Пациент [NAME] жалуется на слабость.'],
    forbiddenFragments: ['Юрий Иванов'],
  },
  {
    name: 'Patient role followed by clinical verb is not treated as a name',
    input: 'Пациент жалуется на слабость и кашель.',
    expectedFragments: ['Пациент жалуется на слабость и кашель.'],
    forbiddenFragments: ['[NAME]'],
  },
  {
    name: 'Bare name and bare date near identifiers are redacted',
    input: `${syntheticNameFromUserExample} ${syntheticHetu} ${syntheticBareDob} ${syntheticLocalPhone}`,
    expectedFragments: ['[NAME]', '[HETU]', '[DATE_OF_BIRTH]', '[PHONE]'],
    forbiddenFragments: [syntheticNameFromUserExample, syntheticHetu, syntheticBareDob, syntheticLocalPhone],
  },
  {
    name: 'Relative words are normalized to generic Omainen before redacted name',
    input: `Vaimo ${syntheticSpouseName} soitti. Tyttö kertoo oireista.`,
    expectedFragments: ['Omainen [NAME]', 'Tyttö kertoo oireista'],
    forbiddenFragments: [syntheticSpouseName, 'Vaimo '],
  },
  {
    name: 'Healthcare staff names are normalized to generic professional',
    input: `Lääkäri ${syntheticStaffName} arvioi tilanteen. Fysioterapeutti ${syntheticPhysioName} suositteli harjoitteita.`,
    expectedFragments: ['Ammattilainen [NAME] arvioi tilanteen', 'Ammattilainen [NAME] suositteli harjoitteita'],
    forbiddenFragments: [syntheticStaffName, syntheticPhysioName, 'Lääkäri ', 'Fysioterapeutti '],
  },
  {
    name: 'Allowlisted organization-like names are not redacted as person names',
    input: `Käypä Hoito ja Keski Uudenmaan hyvinvointialue. Potilas synt. ${syntheticDob}, puhelin ${syntheticLocalPhone}.`,
    expectedFragments: ['Käypä Hoito', 'Keski Uudenmaan', '[DATE_OF_BIRTH]', '[PHONE]'],
    forbiddenFragments: [syntheticDob, syntheticLocalPhone],
  },
  {
    name: 'Street address is redacted',
    input: `Osoite on ${syntheticAddress}. Potilas asuu yksin.`,
    expectedFragments: ['[ADDRESS]'],
    forbiddenFragments: [syntheticAddress],
  },
  {
    name: 'Long street address with apartment and postcode is redacted',
    input: `Potilas asuu osoitteessa ${syntheticLongAddress}.`,
    expectedFragments: ['asuu osoitteessa [ADDRESS]'],
    forbiddenFragments: [syntheticLongAddress],
  },
  {
    name: 'Russian labelled patient details are redacted',
    input: 'Имя пациента: Юрий Капустин. Дата рождения 1980-11-10. Адрес: ул Ленина 15, кв 8.',
    expectedFragments: ['Имя пациента [NAME]', 'Дата рождения [DATE_OF_BIRTH]', 'Адрес [ADDRESS]'],
    forbiddenFragments: ['Юрий Капустин', '1980-11-10', 'ул Ленина 15, кв 8'],
  },
  {
    name: 'English address is redacted',
    input: 'Address: 45 King Street, Apt 3.',
    expectedFragments: ['Address [ADDRESS]'],
    forbiddenFragments: ['45 King Street, Apt 3'],
  },
  {
    name: 'Already sanitized labelled address is not re-detected',
    input: 'Potilas asuu osoitteessa [ADDRESS].',
    expectedFragments: ['Potilas asuu osoitteessa [ADDRESS].'],
    forbiddenFragments: [],
  },
  {
    name: 'Clinical dates are preserved in chat mode without identifying context',
    input: `Leikkaus tehty 12.3.2024. Kontrolli 15.4.2024.`,
    mode: 'chat',
    expectedFragments: ['12.3.2024', '15.4.2024'],
    forbiddenFragments: ['[DATE]'],
  },
  {
    name: 'Exact dates are redacted in storage mode',
    input: `Leikkaus tehty 12.3.2024. Kontrolli 15.4.2024.`,
    mode: 'storage',
    expectedFragments: ['[DATE]'],
    forbiddenFragments: ['12.3.2024', '15.4.2024'],
  },
  {
    name: 'Clinical headings acronyms and references are not treated as names in clinical transform mode',
    input: clinicalHeadingSample,
    mode: 'clinicalTransform',
    expectedFragments: ['Kts. yst. kollega [NAME] potilasteksti [DATE]', 'Potilaan HbA1c', 'Libressa TIR', 'Suunnitelma', 'Hoitaja opastanut'],
    forbiddenFragments: ['[NAME]1c', '[NAME] ollut ainoastaan', '[NAME]. yst.', '[NAME] opastanut'],
  },
  {
    name: 'Comma separated clinician name is redacted',
    input: commaNameSample,
    mode: 'clinicalTransform',
    expectedFragments: ['Ammattilainen [NAME]'],
    forbiddenFragments: ['Romanenko, Olga'],
  },
];

let failed = 0;

for (const testCase of cases) {
  const result = anonymizePatientText(testCase.input, { mode: testCase.mode ?? 'chat' });

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
      console.error(`FAIL ${testCase.name}: forbidden fragment still present: ${forbidden}`);
      console.error(result.sanitizedText);
    }
  }
}

const gatewayCases = [
  {
    name: 'Clinical transform gateway allows sanitized long note with dates and staff names',
    input: [
      '03.03.2026',
      'LAB',
      'E87.6',
      'Hypokalemia',
      'Romanenko, Olga Terveyskeskuslaakari',
      'Tutkimukset',
      '23.02.2026 12:29 P -CRP <4',
      '03.03.2026VOMANYD2',
      'Suunnitelma',
      'Tulospostia tarkistettu, potilas kaynyt verikokeissa 23.2.26.',
    ].join('\n'),
  },
  {
    name: 'Clinical transform gateway does not hard-block long clinical note headings and staff signatures',
    input: blockedLongClinicalSample,
  },
];

for (const testCase of gatewayCases) {
  const result = preparePrivacyPayload([
    { key: 'content', value: testCase.input, mode: 'clinicalTransform', localeKeys: ['fi'] },
  ]);

  if (result.privacy.blocked) {
    failed += 1;
    console.error(`FAIL ${testCase.name}: gateway blocked sanitized clinical transform payload`);
    console.error(JSON.stringify(result.privacy, null, 2));
    console.error(result.sanitized.content);
  }
}

if (failed > 0) {
  console.error(`Privacy anonymizer tests failed: ${failed}`);
  process.exit(1);
}

console.log(`Privacy anonymizer tests passed: ${cases.length}`);
