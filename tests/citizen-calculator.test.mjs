import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateCitizenFinancing,
  parseCitizenNumber,
} from "../lib/citizen-calculator.mjs";

test("parses Brazilian decimal and monetary input", () => {
  assert.equal(parseCitizenNumber("1,99"), 1.99);
  assert.equal(parseCitizenNumber("R$ 31.513,24"), 31513.24);
  assert.equal(parseCitizenNumber(""), null);
});

test("calculates each missing field with fixed installments", () => {
  const months = calculateCitizenFinancing({
    months: null,
    monthlyRate: 1,
    installment: 261.5,
    financed: 2000,
  });
  assert.ok(Math.abs(months.value - 8) < 0.01);

  const rate = calculateCitizenFinancing({
    months: 10,
    monthlyRate: null,
    installment: 86,
    financed: 750,
  });
  assert.ok(rate.value > 2 && rate.value < 3);

  const installment = calculateCitizenFinancing({
    months: 4,
    monthlyRate: 1.99,
    installment: null,
    financed: 1290,
  });
  assert.ok(installment.value > 330 && installment.value < 340);

  const financed = calculateCitizenFinancing({
    months: 24,
    monthlyRate: 1.99,
    installment: 935,
    financed: null,
  });
  assert.ok(financed.value > 17000 && financed.value < 19000);
});

test("requires exactly one blank field", () => {
  assert.throws(
    () =>
      calculateCitizenFinancing({
        months: 84,
        monthlyRate: null,
        installment: null,
        financed: 20000,
      }),
    /exatamente três campos/,
  );
});
