import assert from "node:assert/strict";
import {
  formatCalculatorNumber,
  normalizeCalculatorOutputLanguage,
} from "../lib/calculators/clinicalOutputLanguage";

assert.equal(normalizeCalculatorOutputLanguage("fi"), "fi");
assert.equal(normalizeCalculatorOutputLanguage("sv"), "sv");
assert.equal(normalizeCalculatorOutputLanguage("ru"), "ru");
assert.equal(normalizeCalculatorOutputLanguage("de"), "de");
assert.equal(normalizeCalculatorOutputLanguage("unsupported"), "en");

assert.equal(formatCalculatorNumber(12.5, 1, "fi"), "12,5");
assert.equal(formatCalculatorNumber(12.5, 1, "sv"), "12,5");
assert.equal(formatCalculatorNumber(12.5, 1, "ru"), "12,5");
assert.equal(formatCalculatorNumber(12.5, 1, "de"), "12,5");
assert.equal(formatCalculatorNumber(12.5, 1, "en"), "12.5");

console.log("Calculator output language tests passed.");
