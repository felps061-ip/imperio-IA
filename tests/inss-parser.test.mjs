import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeInssExtract,
  calculateMonthlyRate,
  getInssSpeciesStatus,
  INSS_GENERAL_RULES,
  parseInssExtract,
} from "../lib/inss-extrato.mjs";

const extractFixture = `
Dados Cadastrais:
Nome: CLIENTE DE TESTE Beneficio: 000.000.000-0 CPF: 000.000.000-00 Data Nascimento: 01/01/1960
Endereço: ENDERECO DE TESTE Espécie: 41 - APOSENTADORIA POR IDADE Idade: 66 Anos 7 meses
Bairro: CENTRO Cidade: BRASILIA UF: DF CEP: 00.000-000
Dados Bancários:
Meio de Pagamento: CARTAO MAGNETICO
Código Banco: 069 Banco: BANCO PAGADOR Agencia: 1 Conta:
Dados Financeiros
Valor Benefício: R$ 2.194,03 Descontos: R$ 0,00 Liquido: R$ 2.194,03
Margem Consignável: R$ 877,61 Valor Consignado: R$ 753,00 Margem Disponível: R$ 124,61 Margem Cartão: R$ 109,70
Contratos
Banco Averbado Inicio Fim Financiado Quitação Parcela Taxa Aprox. Prazo Resta Nº Contrato Refin. Disp. Porta. Disp.
626 - C6 CONSIG 10/10/25 11/25 10/33 R$ 31.281,49 R$ 31.513,24 R$ 753,00 1,94% 09/96 87 CONTRATO-TESTE R$ -6,96 R$ 1.953,43
Valores Totais R$ 31.281,49 R$ 31.513,24 R$ 753,00 R$ -6,96 R$ 1.953,43
`;

test("extracts the structured INSS fields and contract table", () => {
  const parsed = parseInssExtract(extractFixture);

  assert.equal(parsed.client.name, "CLIENTE DE TESTE");
  assert.equal(parsed.client.speciesCode, "41");
  assert.equal(parsed.client.ageYears, 66);
  assert.equal(parsed.client.city, "BRASILIA");
  assert.equal(parsed.client.state, "DF");
  assert.equal(parsed.financial.availableMargin, 124.61);
  assert.equal(parsed.contracts.length, 1);
  assert.equal(parsed.contracts[0].bankCode, "626");
  assert.equal(parsed.contracts[0].paid, 9);
  assert.equal(parsed.contracts[0].total, 96);
  assert.equal(parsed.contracts[0].remaining, 87);
  assert.ok(parsed.contracts[0].calculatedRate > 1.8);
});

test("compares an extracted contract against all 15 INSS rulebooks", () => {
  const analysis = analyzeInssExtract(extractFixture);
  const contract = analysis.contracts[0];
  const possibleBanks = contract.possible.map((item) => item.bank);
  const blockedBanks = contract.blocked.map((item) => item.bank);
  const reviewBanks = contract.review.map((item) => item.bank);

  assert.equal(contract.offers.length, 15);
  assert.deepEqual(possibleBanks, [
    "Digio",
    "Total Cash",
    "iCred",
    "Acredto",
    "Daycoval",
    "Quero Mais Crédito",
    "Finanto",
    "BMG",
    "Happy",
    "Banrisul",
  ]);
  assert.equal(contract.possible[0].mode, "Portabilidade + refin");
  assert.equal(contract.possible.at(-1).mode, "Portabilidade pura");
  assert.ok(blockedBanks.includes("Quali"));
  assert.ok(blockedBanks.includes("Facta"));
  assert.ok(blockedBanks.includes("C6 Bank"));
  assert.ok(blockedBanks.includes("BRB"));
  assert.deepEqual(reviewBanks, ["PAN"]);
});

test("recalculates the monthly rate from payoff, installment and remaining term", () => {
  const rate = calculateMonthlyRate(31513.24, 753, 87);
  assert.ok(rate > 1.8 && rate < 2.1);
});

test("uses the official species list as a global eligibility gate", () => {
  assert.equal(getInssSpeciesStatus("41").status, "consignable");
  assert.equal(getInssSpeciesStatus("31").status, "non_consignable");
  assert.equal(getInssSpeciesStatus("100").status, "unknown");

  const nonConsignable = analyzeInssExtract(
    extractFixture.replace("Espécie: 41", "Espécie: 31"),
  );
  assert.equal(nonConsignable.speciesStatus.status, "non_consignable");
  assert.equal(nonConsignable.contracts[0].possible.length, 0);
  assert.equal(nonConsignable.contracts[0].blocked.length, 15);
  assert.ok(
    nonConsignable.contracts[0].blocked.every((item) =>
      item.reason.includes("Espécie 31 não consignável"),
    ),
  );
});

test("sends an unlisted species to manual review instead of approving it", () => {
  const unknown = analyzeInssExtract(
    extractFixture.replace("Espécie: 41", "Espécie: 100"),
  );

  assert.equal(unknown.speciesStatus.status, "unknown");
  assert.equal(unknown.contracts[0].possible.length, 0);
  assert.equal(unknown.contracts[0].review.length, 15);
});

test("applies the July 2026 geographic restrictions", () => {
  const restricted = analyzeInssExtract(
    extractFixture
      .replace("626 - C6 CONSIG", "029 - BANCO DE ORIGEM")
      .replace("UF: DF", "UF: AP"),
  );
  const decisions = new Map(
    restricted.contracts[0].offers.map((item) => [item.bank, item]),
  );

  assert.equal(decisions.get("Finanto").status, "blocked");
  assert.equal(decisions.get("iCred").status, "blocked");
  assert.equal(decisions.get("Total Cash").status, "review");
  assert.match(decisions.get("Total Cash").reason, /Formalização híbrida/);
  assert.equal(decisions.get("BRB").status, "blocked");

  const municipal = analyzeInssExtract(
    extractFixture
      .replace("626 - C6 CONSIG", "029 - BANCO DE ORIGEM")
      .replace("Cidade: BRASILIA UF: DF", "Cidade: POÇOS DE CALDAS UF: MG"),
  );
  const daycoval = municipal.contracts[0].offers.find(
    (item) => item.bank === "Daycoval",
  );
  assert.equal(daycoval.status, "review");
  assert.match(daycoval.reason, /Formalização híbrida/);
});

test("blocks Total Cash portability for species 32", () => {
  const analysis = analyzeInssExtract(
    extractFixture
      .replace("Espécie: 41", "Espécie: 32")
      .replace("626 - C6 CONSIG", "029 - BANCO DE ORIGEM"),
  );
  const totalCash = analysis.contracts[0].offers.find(
    (item) => item.bank === "Total Cash",
  );

  assert.equal(analysis.speciesStatus.status, "consignable");
  assert.equal(totalCash.status, "blocked");
  assert.match(totalCash.reason, /suspensas para a espécie 32/);
});

test("exposes the current INSS ceiling, margins, term and contract limits", () => {
  assert.equal(INSS_GENERAL_RULES.loanRateCeiling, 1.85);
  assert.equal(INSS_GENERAL_RULES.regularLoanMargin.noCard, 40);
  assert.equal(INSS_GENERAL_RULES.bpcLoanMargin.oneCard, 30);
  assert.equal(INSS_GENERAL_RULES.maxTerm, 108);
  assert.equal(INSS_GENERAL_RULES.maxLoanContracts, 13);
});
