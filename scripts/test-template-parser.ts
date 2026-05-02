import assert from 'assert';
import { getTemplateFields } from '../lib/templates/parser';
import { renderTemplate } from '../lib/templates/renderer';
import { validateTemplate } from '../lib/templates/validation';

function testSelectField() {
  const fields = getTemplateFields('Yleistila {{yleistila:select:hyvä,kohtalainen,heikko}}.');

  assert.equal(fields.length, 1);
  assert.equal(fields[0].id, 'yleistila');
  assert.equal(fields[0].type, 'select');
  assert.deepEqual(fields[0].options, ['hyvä', 'kohtalainen', 'heikko']);
}

function testShowIfInputField() {
  const fields = getTemplateFields('Kipu {{kipu:select:ei,kyllä}}. {{kipukuvaus:input:showIf:kipu=kyllä}}');
  const dependentField = fields.find((field) => field.id === 'kipukuvaus');

  assert.ok(dependentField);
  assert.deepEqual(dependentField?.condition, {
    parentId: 'kipu',
    operator: 'equals',
    value: 'kyllä',
    values: undefined,
  });
}

function testShowIfSelectField() {
  const fields = getTemplateFields('{{infektio:select:ei,kyllä}} {{infektion_lahde:select:virtsatie,keuhko,iho,muu:showIf:infektio=kyllä}}');
  const dependentField = fields.find((field) => field.id === 'infektion_lahde');

  assert.ok(dependentField);
  assert.equal(dependentField?.type, 'select');
  assert.deepEqual(dependentField?.options, ['virtsatie', 'keuhko', 'iho', 'muu']);
  assert.deepEqual(dependentField?.condition, {
    parentId: 'infektio',
    operator: 'equals',
    value: 'kyllä',
    values: undefined,
  });
}

function testExtendedFieldTypes() {
  const content = [
    '{{kipu:radio:ei kipua|lievä kipu|kohtalainen kipu|voimakas kipu:label:Kivun voimakkuus:default:ei kipua}}',
    '{{lisaoireet:multiselect:huimaus|pahoinvointi|oksentelu:label:Lisäoireet}}',
    '{{kuume:checkbox:label:Kuume}}',
    '{{kontrolli_pvm:date:label:Kontrollipäivä}}',
    '{{crp:number:label:CRP:placeholder:arvo}}',
  ].join(' ');

  const fields = getTemplateFields(content);

  assert.equal(fields.find((field) => field.id === 'kipu')?.type, 'radio');
  assert.deepEqual(fields.find((field) => field.id === 'kipu')?.options, [
    'ei kipua',
    'lievä kipu',
    'kohtalainen kipu',
    'voimakas kipu',
  ]);
  assert.equal(fields.find((field) => field.id === 'kipu')?.label, 'Kivun voimakkuus');
  assert.equal(fields.find((field) => field.id === 'kipu')?.defaultValue, 'ei kipua');
  assert.equal(fields.find((field) => field.id === 'lisaoireet')?.type, 'multiselect');
  assert.equal(fields.find((field) => field.id === 'kuume')?.type, 'checkbox');
  assert.equal(fields.find((field) => field.id === 'kontrolli_pvm')?.type, 'date');
  assert.equal(fields.find((field) => field.id === 'crp')?.type, 'number');
  assert.equal(fields.find((field) => field.id === 'crp')?.placeholder, 'arvo');
}

function testExtendedConditions() {
  const content = [
    '{{kipu:radio:ei kipua|lievä kipu|kohtalainen kipu|voimakas kipu}}',
    '{{kipukuvaus:textarea:showIfAny:kipu=kohtalainen kipu|voimakas kipu}}',
    '{{lisaoireet:multiselect:huimaus|pahoinvointi|oksentelu}}',
    '{{huimaus_kuvaus:textarea:showIfIncludes:lisaoireet=huimaus}}',
    '{{ei_kuumetta_teksti:input:showIfNot:kuume=kyllä}}',
    '{{tyhja_kentta:input:showIfEmpty:kommentti}}',
    '{{taytetty_kentta:input:showIfNotEmpty:kommentti}}',
  ].join(' ');

  const fields = getTemplateFields(content);

  assert.deepEqual(fields.find((field) => field.id === 'kipukuvaus')?.condition, {
    parentId: 'kipu',
    operator: 'in',
    values: ['kohtalainen kipu', 'voimakas kipu'],
  });
  assert.deepEqual(fields.find((field) => field.id === 'huimaus_kuvaus')?.condition, {
    parentId: 'lisaoireet',
    operator: 'includes',
    value: 'huimaus',
    values: ['huimaus'],
  });
  assert.deepEqual(fields.find((field) => field.id === 'ei_kuumetta_teksti')?.condition, {
    parentId: 'kuume',
    operator: 'notEquals',
    value: 'kyllä',
    values: undefined,
  });
  assert.deepEqual(fields.find((field) => field.id === 'tyhja_kentta')?.condition, {
    parentId: 'kommentti',
    operator: 'empty',
  });
  assert.deepEqual(fields.find((field) => field.id === 'taytetty_kentta')?.condition, {
    parentId: 'kommentti',
    operator: 'notEmpty',
  });
}

function testHiddenConditionalFieldRendering() {
  const content = 'Kipu {{kipu:select:ei,kyllä}}. {{kipukuvaus:input:showIf:kipu=kyllä}}';
  const rendered = renderTemplate(content, { kipu: 'ei', kipukuvaus: 'Kova kipu vasemmalla' });

  assert.equal(rendered, 'Kipu ei.');
}

function testVisibleConditionalFieldRendering() {
  const content = 'Kipu {{kipu:select:ei,kyllä}}. {{kipukuvaus:input:showIf:kipu=kyllä}}';
  const rendered = renderTemplate(content, { kipu: 'kyllä', kipukuvaus: 'Kova kipu vasemmalla' });

  assert.equal(rendered, 'Kipu kyllä. Kova kipu vasemmalla');
}

function testExtendedRendering() {
  const content = [
    'Kipu {{kipu:radio:ei kipua|lievä kipu|kohtalainen kipu|voimakas kipu:default:ei kipua}}.',
    '{{kipukuvaus:textarea:showIfAny:kipu=kohtalainen kipu|voimakas kipu}}',
    'Lisäoireet: {{lisaoireet:multiselect:huimaus|pahoinvointi|oksentelu}}.',
    '{{huimaus_kuvaus:textarea:showIfIncludes:lisaoireet=huimaus}}',
    'Kontrolli {{kontrolli_pvm:date}}.',
  ].join(' ');

  const rendered = renderTemplate(content, {
    kipu: 'voimakas kipu',
    kipukuvaus: 'Kipu paikantuu mediaaliselle nivelraolle.',
    lisaoireet: 'huimaus,pahoinvointi',
    huimaus_kuvaus: 'Huimausta esiintyy pystyasennossa.',
    kontrolli_pvm: '2026-05-02',
  });

  assert.equal(
    rendered,
    'Kipu voimakas kipu. Kipu paikantuu mediaaliselle nivelraolle. Lisäoireet: huimaus, pahoinvointi. Huimausta esiintyy pystyasennossa. Kontrolli 2.5.2026.',
  );
}

function testValidTemplateValidation() {
  const result = validateTemplate([
    '{{kipu:radio:ei kipua|lievä kipu|kohtalainen kipu|voimakas kipu:default:ei kipua}}',
    '{{kipukuvaus:textarea:showIfAny:kipu=kohtalainen kipu|voimakas kipu}}',
    '{{lisaoireet:multiselect:huimaus|pahoinvointi|oksentelu}}',
    '{{huimaus_kuvaus:textarea:showIfIncludes:lisaoireet=huimaus}}',
  ].join(' '));

  assert.equal(result.ok, true);
  assert.equal(result.errors.length, 0);
}

function testInvalidTemplateValidation() {
  const result = validateTemplate([
    '{{kipu:select}}',
    '{{kipukuvaus:textarea:showIf:puuttuva=kyllä}}',
    '{{bad-name:input}}',
    '{{oire:radio:ei|kyllä:default:muu}}',
  ].join(' '));

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((issue) => issue.message.includes('has no options')));
  assert.ok(result.errors.some((issue) => issue.message.includes('missing field')));
  assert.ok(result.errors.some((issue) => issue.message.includes('invalid technical name')));
  assert.ok(result.warnings.some((issue) => issue.message.includes('default value outside')));
}

function run() {
  testSelectField();
  testShowIfInputField();
  testShowIfSelectField();
  testExtendedFieldTypes();
  testExtendedConditions();
  testHiddenConditionalFieldRendering();
  testVisibleConditionalFieldRendering();
  testExtendedRendering();
  testValidTemplateValidation();
  testInvalidTemplateValidation();

  console.log('Template parser tests passed.');
}

run();
