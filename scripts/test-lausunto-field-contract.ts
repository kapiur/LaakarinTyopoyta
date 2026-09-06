import assert from "node:assert/strict";
import {
  materializeGeneratedLausuntoFields,
  type LausuntoFieldTemplate,
} from "../lib/lausunto/fieldTemplates";

const template: LausuntoFieldTemplate[] = [
  {
    key: "sairauden_kulku",
    label: "Sairauksien alkuvaihe, kehitys ja oireisto",
    enabled: true,
    required: true,
    responseType: "text",
    order: 1,
  },
  {
    key: "apuvalineet",
    label: "Käyttääkö potilas sairauden vuoksi apuvälineitä?",
    enabled: true,
    required: false,
    responseType: "yes_no_with_explanation",
    order: 2,
  },
];

const generated = materializeGeneratedLausuntoFields([
  {
    key: "apuvalineet",
    label: "TOIMINTAKYKY",
    content: "Ei. Apuvälineiden käytöstä ei ole tietoa.",
    required: true,
    omitted: true,
    responseType: "text",
  },
  {
    key: "sairauden_kulku",
    label: "OLENNAISET TIEDOT",
    content: "Oireet ovat jatkuneet kaksi vuotta.",
    required: false,
    omitted: true,
  },
], template, "b_lausunto");

assert.deepEqual(generated, [
  {
    key: "sairauden_kulku",
    label: "Sairauksien alkuvaihe, kehitys ja oireisto",
    content: "Oireet ovat jatkuneet kaksi vuotta.",
    required: true,
    omitted: false,
    responseType: "text",
  },
  {
    key: "apuvalineet",
    label: "Käyttääkö potilas sairauden vuoksi apuvälineitä?",
    content: "Ei. Apuvälineiden käytöstä ei ole tietoa.",
    required: false,
    omitted: false,
    responseType: "yes_no_with_explanation",
  },
]);

const missing = materializeGeneratedLausuntoFields([], template, "b_lausunto");
assert.equal(missing?.length, 2);
assert.equal(missing?.[0].label, template[0].label);
assert.equal(missing?.[0].content, "");

console.log("PASS: generated lausunto fields preserve configured names, order and settings.");
