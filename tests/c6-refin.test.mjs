import assert from "node:assert/strict";
import test from "node:test";

import {
  formatCpf,
  normalizeC6Offers,
  onlyCpfDigits,
  validateCpf,
} from "../lib/c6-refin.mjs";

test("formata e limita CPF sem guardar caracteres extras", () => {
  assert.equal(onlyCpfDigits("123.456.789-09abc"), "12345678909");
  assert.equal(formatCpf("12345678909"), "123.456.789-09");
});

test("valida os dígitos verificadores do CPF", () => {
  assert.equal(validateCpf("123.456.789-09"), true);
  assert.equal(validateCpf("111.111.111-11"), false);
  assert.equal(validateCpf("123.456.789-00"), false);
});

test("normaliza o retorno relevante da simulação C6", () => {
  assert.deepEqual(
    normalizeC6Offers(
      [
        {
          tabela: "C6108",
          descricaoTabela: "REFIN INSS",
          taxaJuros: "1,80%",
          valorParcela: "R$ 350,00",
          valorCli: "R$ 2.480,00",
        },
      ],
      "108",
    ),
    [
      {
        table: "C6108",
        description: "REFIN INSS",
        monthlyRate: "1,80%",
        installment: "R$ 350,00",
        clientValue: "R$ 2.480,00",
        term: "108",
      },
    ],
  );
});
