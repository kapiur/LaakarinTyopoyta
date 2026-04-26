import assert from 'assert';
import { getTemplateFields } from '../lib/templates/parser';
import { renderTemplate } from '../lib/templates/renderer';

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
    value: 'kyllä',
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
    value: 'kyllä',
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

function run() {
  testSelectField();
  testShowIfInputField();
  testShowIfSelectField();
  testHiddenConditionalFieldRendering();
  testVisibleConditionalFieldRendering();

  console.log('Template parser tests passed.');
}

run();
