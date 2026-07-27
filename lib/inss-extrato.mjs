const invaliditySpecies = new Set(["4", "5", "6", "32", "33", "34", "51", "83", "92"]);
const bpcLoasSpecies = new Set(["87", "88"]);

export const CONSIGNABLE_INSS_SPECIES = Object.freeze([
  "1", "2", "3", "4", "5", "6", "7", "8", "11", "12", "18", "19",
  "20", "21", "22", "23", "24", "26", "27", "28", "29", "30", "32",
  "33", "34", "37", "38", "40", "41", "42", "43", "44", "45", "46",
  "49", "51", "52", "54", "55", "56", "57", "58", "59", "60", "72",
  "78", "81", "82", "83", "84", "87", "88", "92", "93", "96",
]);

export const NON_CONSIGNABLE_INSS_SPECIES = Object.freeze([
  "9", "10", "13", "15", "25", "31", "35", "36", "39", "47", "48",
  "50", "53", "61", "62", "63", "64", "65", "66", "67", "68", "69",
  "70", "71", "73", "74", "75", "76", "77", "79", "80", "85", "86",
  "89", "90", "91", "94", "95", "97", "98", "99",
]);

const consignableSpecies = new Set(CONSIGNABLE_INSS_SPECIES);
const nonConsignableSpecies = new Set(NON_CONSIGNABLE_INSS_SPECIES);

export const INSS_GENERAL_RULES = Object.freeze({
  effectiveFrom: "19/05/2026",
  loanRateCeiling: 1.85,
  cardRateCeiling: 2.46,
  maxLoanContracts: 13,
  maxCardContracts: 2,
  maxBpcCardContracts: 1,
  maxTerm: 108,
  regularLoanMargin: Object.freeze({
    noCard: 40,
    oneCard: 35,
    twoCards: 30,
  }),
  bpcLoanMargin: Object.freeze({
    noCard: 35,
    oneCard: 30,
  }),
});

export function getInssSpeciesStatus(code) {
  const normalizedCode = String(code || "").replace(/^0+/, "") || "";
  if (consignableSpecies.has(normalizedCode)) {
    return {
      code: normalizedCode,
      status: "consignable",
      label: "Consignável",
      reason:
        "A espécie consta na lista oficial de espécies consignáveis do INSS.",
    };
  }
  if (nonConsignableSpecies.has(normalizedCode)) {
    return {
      code: normalizedCode,
      status: "non_consignable",
      label: "Não consignável",
      reason:
        "A espécie consta na lista oficial de espécies não consignáveis do INSS.",
    };
  }
  return {
    code: normalizedCode,
    status: "unknown",
    label: "Exige revisão",
    reason:
      "A espécie não foi localizada nas listas fornecidas e precisa de validação manual.",
  };
}

const moneyPattern = "-?[\\d.]+,\\d{2}";

function firstMatch(text, pattern, fallback = "") {
  return text.match(pattern)?.[1]?.trim() || fallback;
}

export function parseBrazilianMoney(value) {
  if (!value) return 0;
  return Number(value.replace(/\./g, "").replace(",", "."));
}

export function calculateMonthlyRate(balance, installment, remaining) {
  if (remaining <= 0 || installment <= 0 || balance <= 0) return 0;
  if (installment * remaining <= balance) return 0;

  let low = 0;
  let high = 0.1;

  for (let index = 0; index < 90; index += 1) {
    const rate = (low + high) / 2;
    const presentValue =
      (installment * (1 - Math.pow(1 + rate, -remaining))) / rate;

    if (presentValue > balance) low = rate;
    else high = rate;
  }

  return ((low + high) / 2) * 100;
}

export function maskDocument(value) {
  if (!value) return "Não localizado";
  const visible = value.replace(/\D/g, "").slice(-4);
  return `•••• ${visible}`;
}

export function parseInssExtract(rawText) {
  const text = rawText
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();

  const client = {
    name: firstMatch(text, /Nome:\s*(.+?)\s+Benef[ií]cio:/i, "Cliente não identificado"),
    benefit: firstMatch(text, /Benef[ií]cio:\s*([\d.-]+)/i),
    cpf: firstMatch(text, /CPF:\s*([\d.-]+)/i),
    birthDate: firstMatch(text, /Data Nascimento:\s*(\d{2}\/\d{2}\/\d{4})/i),
    speciesCode: firstMatch(text, /Esp[eé]cie:\s*(\d+)/i),
    species: firstMatch(
      text,
      /Esp[eé]cie:\s*\d+\s*-\s*(.+?)\s+Idade:/i,
      "Espécie não identificada",
    ),
    ageYears: Number(firstMatch(text, /Idade:\s*(\d+)\s*Anos?/i, "0")),
    ageMonths: Number(
      firstMatch(text, /Idade:\s*\d+\s*Anos?\s*(\d+)?\s*meses?/i, "0"),
    ),
    city: firstMatch(text, /Cidade:\s*(.+?)\s+UF:/i),
    state: firstMatch(text, /UF:\s*([A-Z]{2})\s+CEP:/i),
  };

  const banking = {
    paymentMethod: firstMatch(text, /Meio de Pagamento:\s*(.+?)(?:\n|Código Banco:)/i),
    bankCode: firstMatch(text, /Código Banco:\s*(\d+)/i),
    bank: firstMatch(text, /Código Banco:\s*\d+\s+Banco:\s*(.+?)\s+Agencia:/i),
  };

  const financial = {
    benefitValue: parseBrazilianMoney(
      firstMatch(text, new RegExp(`Valor Benef[ií]cio:\\s*R\\$\\s*(${moneyPattern})`, "i")),
    ),
    consignedValue: parseBrazilianMoney(
      firstMatch(text, new RegExp(`Valor Consignado:\\s*R\\$\\s*(${moneyPattern})`, "i")),
    ),
    availableMargin: parseBrazilianMoney(
      firstMatch(text, new RegExp(`Margem Dispon[ií]vel:\\s*R\\$\\s*(${moneyPattern})`, "i")),
    ),
  };

  const contractsStart = text.search(/\nContratos\s*\n/i);
  const contractsEnd = text.search(/\nValores Totais\b/i);
  const contractsText =
    contractsStart >= 0
      ? text.slice(contractsStart, contractsEnd > contractsStart ? contractsEnd : undefined)
      : "";
  const compactContracts = contractsText.replace(/\s+/g, " ");

  const contractPattern = new RegExp(
    [
      "(\\d{3})\\s*-\\s*(.+?)",
      "(\\d{2}\\/\\d{2}\\/\\d{2})",
      "(\\d{2}\\/\\d{2})",
      "(\\d{2}\\/\\d{2})",
      `R\\$\\s*(${moneyPattern})`,
      `R\\$\\s*(${moneyPattern})`,
      `R\\$\\s*(${moneyPattern})`,
      "([\\d.,]+)%",
      "(\\d{1,3})\\/(\\d{1,3})",
      "(\\d{1,3})",
      "(\\S+)",
      `R\\$\\s*(${moneyPattern})`,
      `R\\$\\s*(${moneyPattern})`,
    ].join("\\s+"),
    "g",
  );

  const contracts = [];
  for (const match of compactContracts.matchAll(contractPattern)) {
    const payoff = parseBrazilianMoney(match[7]);
    const installment = parseBrazilianMoney(match[8]);
    const paid = Number(match[10]);
    const total = Number(match[11]);
    const remaining = Number(match[12]);

    contracts.push({
      bankCode: match[1],
      bank: match[2].trim(),
      registeredAt: match[3],
      start: match[4],
      end: match[5],
      financed: parseBrazilianMoney(match[6]),
      payoff,
      installment,
      approximateRate: Number(match[9].replace(",", ".")),
      paid,
      total,
      remaining,
      contractNumber: match[13],
      refinanceAvailable: parseBrazilianMoney(match[14]),
      portabilityAvailable: parseBrazilianMoney(match[15]),
      calculatedRate: calculateMonthlyRate(payoff, installment, remaining),
    });
  }

  return {
    client,
    banking,
    financial,
    contracts,
  };
}

function offer(bank, status, reason, mode, version, score) {
  return { bank, status, reason, mode, version, score };
}

function portabilityPriority(mode) {
  const normalizedMode = String(mode || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

  if (normalizedMode.includes("REFIN")) return 0;
  if (normalizedMode.includes("PURA")) return 2;
  return 1;
}

function monthsSince(dateValue, now = new Date()) {
  const [day, month, shortYear] = dateValue.split("/").map(Number);
  const year = 2000 + shortYear;
  const date = new Date(year, month - 1, day);
  return Math.max(
    0,
    (now.getFullYear() - date.getFullYear()) * 12 +
      now.getMonth() -
      date.getMonth(),
  );
}

function assessQuali(extract, contract) {
  const blockedOrigins = new Set(["012", "626", "643", "329", "394"]);
  if (blockedOrigins.has(contract.bankCode)) {
    return offer(
      "Quali",
      "blocked",
      `O banco de origem ${contract.bankCode} consta como não portado.`,
      "Portabilidade",
      "v1.0",
      0,
    );
  }
  if (extract.financial.availableMargin < 0) {
    return offer("Quali", "blocked", "O roteiro não aceita margem negativa.", "Portabilidade", "v1.0", 0);
  }
  if (contract.payoff < 2000) {
    return offer("Quali", "blocked", "Saldo de quitação abaixo de R$ 2.000.", "Portabilidade", "v1.0", 0);
  }
  const sourceMinimum = ["623", "707"].includes(contract.bankCode) ? 12 : 1;
  const balanceMinimum = contract.payoff < 6000 ? 15 : 1;
  const requiredPaid = Math.max(sourceMinimum, balanceMinimum);
  if (contract.paid < requiredPaid) {
    return offer(
      "Quali",
      "blocked",
      `Exige ao menos ${requiredPaid} parcelas pagas para este saldo/origem.`,
      "Portabilidade",
      "v1.0",
      0,
    );
  }
  const specialSpecies = invaliditySpecies.has(extract.client.speciesCode);
  const finalAgeLimit = specialSpecies ? 74.75 : 80.75;
  if (extract.client.ageYears + contract.remaining / 12 >= finalAgeLimit) {
    return offer(
      "Quali",
      "review",
      "O prazo precisa ser reduzido para respeitar a idade no fim do contrato.",
      "Portabilidade + refin",
      "v1.0",
      45,
    );
  }
  return offer(
    "Quali",
    "eligible",
    `Saldo e quantidade paga atendem ao mínimo de ${requiredPaid} parcela(s).`,
    "Portabilidade + refin",
    "v1.0",
    88,
  );
}

function assessFacta(extract, contract) {
  if (contract.bankCode === "935") {
    return offer("Facta", "blocked", "Contrato de carteira própria Facta.", "Portabilidade", "mai/26", 0);
  }
  if (["012", "917"].includes(contract.bankCode)) {
    return offer("Facta", "blocked", "Banco de origem não portado pelo roteiro.", "Portabilidade", "mai/26", 0);
  }
  if (extract.client.ageYears > 72) {
    return offer("Facta", "blocked", "Idade acima do limite de portabilidade.", "Portabilidade", "mai/26", 0);
  }
  const minimumPaid = {
    "121": 15,
    "318": 12,
    "623": 30,
    "626": 12,
    "707": 24,
  }[contract.bankCode] ?? 0;
  if (contract.paid < minimumPaid) {
    return offer(
      "Facta",
      "blocked",
      `Para a origem ${contract.bankCode}, exige ${minimumPaid} parcelas pagas; foram encontradas ${contract.paid}.`,
      "Portabilidade",
      "mai/26",
      0,
    );
  }
  if (contract.installment < 50) {
    return offer("Facta", "blocked", "Parcela abaixo do mínimo de R$ 50.", "Portabilidade", "mai/26", 0);
  }
  return offer(
    "Facta",
    "eligible",
    "Quantidade paga, parcela e idade atendem; o roteiro aceita margem negativa.",
    "Portabilidade + refin",
    "mai/26",
    92,
  );
}

function assessBmg(extract, contract) {
  if (contract.bankCode === "318") {
    return offer("BMG", "blocked", "Contrato já pertence ao BMG.", "Portabilidade", "19/05", 0);
  }
  if (extract.client.ageYears > 75) {
    return offer("BMG", "blocked", "Idade acima do limite do roteiro.", "Portabilidade", "19/05", 0);
  }
  if (contract.paid < 1) {
    return offer("BMG", "blocked", "Exige pelo menos 1 parcela paga.", "Portabilidade", "19/05", 0);
  }
  if (extract.financial.availableMargin < 0) {
    return offer("BMG", "blocked", "O roteiro não aceita portabilidade com margem negativa.", "Portabilidade", "19/05", 0);
  }
  return offer(
    "BMG",
    "eligible",
    "Idade, margem e mínimo de 1 parcela paga atendidos; confirmar a tabela comercial.",
    "Portabilidade + refin",
    "19/05",
    82,
  );
}

function assessPan(_extract, contract) {
  if (contract.bankCode === "623") {
    return offer("PAN", "blocked", "Contrato já pertence ao PAN.", "Portabilidade", "117", 0);
  }
  return offer(
    "PAN",
    "review",
    "O enquadramento depende da tabela comercial vigente e da validação do banco de origem.",
    "Portabilidade",
    "117",
    42,
  );
}

function assessBanrisul(extract, contract) {
  if (contract.bankCode === "041") {
    return offer("Banrisul", "blocked", "Contrato já pertence ao Banrisul.", "Portabilidade", "jul/26", 0);
  }
  if (contract.payoff < 5000) {
    return offer("Banrisul", "blocked", "Saldo devedor abaixo de R$ 5.000.", "Portabilidade", "jul/26", 0);
  }
  if (contract.installment < 8) {
    return offer("Banrisul", "blocked", "Parcela abaixo do mínimo de R$ 8.", "Portabilidade", "jul/26", 0);
  }
  if (extract.client.ageYears + contract.remaining / 12 >= 78) {
    return offer(
      "Banrisul",
      "review",
      "É necessário reduzir o prazo para terminar antes dos 78 anos.",
      "Portabilidade manual",
      "jul/26",
      36,
    );
  }
  const canRefinance = contract.paid >= 12;
  return offer(
    "Banrisul",
    "eligible",
    canRefinance
      ? "Saldo, parcela e mínimo de 12 pagas atendem à portabilidade com refin."
      : "Saldo e parcela atendem à portabilidade pura; o refin exige 12 pagas.",
    canRefinance ? "Portabilidade + refin" : "Portabilidade pura",
    "jul/26",
    canRefinance ? 91 : 83,
  );
}

function icredLimit(age) {
  if (age <= 61) return { maxValue: 100000, term: 96 };
  if (age === 62) return { maxValue: 90000, term: 96 };
  if (age === 63) return { maxValue: 80000, term: 96 };
  if (age === 64) return { maxValue: 70000, term: 96 };
  if (age === 65) return { maxValue: 60000, term: 96 };
  if (age === 66) return { maxValue: 50000, term: 96 };
  if (age === 67) return { maxValue: 40000, term: 96 };
  if (age === 68) return { maxValue: 30000, term: 96 };
  if (age === 69) return { maxValue: 25000, term: 96 };
  if (age === 70) return { maxValue: 25000, term: 84 };
  if (age === 71) return { maxValue: 25000, term: 72 };
  if (age === 72) return { maxValue: 25000, term: 60 };
  if (age === 73) return { maxValue: 25000, term: 48 };
  return null;
}

function assessIcred(extract, contract) {
  if (bpcLoasSpecies.has(extract.client.speciesCode)) {
    return offer(
      "iCred",
      "blocked",
      "O roteiro informa suspensão temporária para BPC/LOAS (espécies 87 e 88).",
      "Portabilidade",
      "jul/26",
      0,
    );
  }
  const limit = icredLimit(extract.client.ageYears);
  if (!limit) {
    return offer("iCred", "blocked", "O roteiro não opera a partir de 74 anos.", "Portabilidade", "jul/26", 0);
  }
  if (contract.payoff > limit.maxValue) {
    return offer(
      "iCred",
      "blocked",
      `Saldo acima do limite de ${formatMoney(limit.maxValue)} para a idade.`,
      "Portabilidade + refin",
      "jul/26",
      0,
    );
  }
  if (contract.payoff < 2900) {
    return offer(
      "iCred",
      "blocked",
      "Saldo e troco mínimo não alcançam o ticket de R$ 3.000.",
      "Portabilidade + refin",
      "jul/26",
      0,
    );
  }
  if (contract.paid < 1) {
    return offer("iCred", "blocked", "Exige pelo menos 1 parcela paga.", "Portabilidade", "jul/26", 0);
  }
  return offer(
    "iCred",
    "eligible",
    `Ticket mínimo e limite etário atendidos; prazo disponível de até ${limit.term} meses.`,
    "Portabilidade + refin",
    "jul/26",
    90,
  );
}

function assessFinanto(extract, contract) {
  if (bpcLoasSpecies.has(extract.client.speciesCode)) {
    return offer(
      "Finanto",
      "blocked",
      "O roteiro informa suspensão temporária para BPC/LOAS (espécies 87 e 88).",
      "Portabilidade",
      "jul/26",
      0,
    );
  }
  if (extract.client.ageYears > 70) {
    return offer("Finanto", "blocked", "Idade fora da política operacional.", "Portabilidade", "jul/26", 0);
  }
  if (contract.installment >= 50) {
    return offer(
      "Finanto",
      "eligible",
      extract.financial.availableMargin < 0
        ? "Margem negativa pode ser abatida na portabilidade com refin; simular o troco mínimo."
        : "Parcela enquadrada nas tabelas Essencial, Select ou Prime; simular o troco mínimo.",
      "Portabilidade + refin",
      "jul/26",
      84,
    );
  }
  if (contract.payoff >= 8000 && extract.financial.availableMargin >= 0) {
    return offer(
      "Finanto",
      "eligible",
      "Portabilidade pura disponível pelo saldo devedor; usar somente se o refinanciamento não for viável.",
      "Portabilidade pura",
      "jul/26",
      76,
    );
  }
  return offer(
    "Finanto",
    "blocked",
    "Parcela abaixo do mínimo de R$ 50 e saldo insuficiente para portabilidade pura.",
    "Portabilidade",
    "jul/26",
    0,
  );
}

function assessDigio(extract, contract) {
  if (contract.bankCode === "335") {
    return offer("Digio", "blocked", "Contrato já pertence ao Digio.", "Portabilidade", "V21", 0);
  }
  if (invaliditySpecies.has(extract.client.speciesCode) && extract.client.ageYears < 60) {
    return offer("Digio", "blocked", "Espécie de invalidez exige idade mínima de 60 anos.", "Portabilidade", "V21", 0);
  }
  if (extract.client.ageYears > 78) {
    return offer("Digio", "blocked", "Idade acima do limite operacional.", "Portabilidade", "V21", 0);
  }
  if (extract.financial.availableMargin < 0) {
    return offer(
      "Digio",
      "review",
      "A margem negativa não pode ser deduzida da parcela; exige ajuste da operação.",
      "Portabilidade + refin",
      "V21",
      48,
    );
  }
  return offer(
    "Digio",
    "eligible",
    "O refin da portabilidade não exige mínimo de parcelas pagas.",
    "Portabilidade + refin",
    "V21",
    94,
  );
}

function assessDaycoval(extract, contract) {
  if (contract.bankCode === "707") {
    return offer("Daycoval", "blocked", "Contrato já pertence ao Daycoval.", "Portabilidade", "jul/26", 0);
  }
  if (extract.client.ageYears > 72) {
    return offer("Daycoval", "blocked", "Idade acima da faixa de portabilidade do roteiro.", "Portabilidade", "jul/26", 0);
  }
  if (invaliditySpecies.has(extract.client.speciesCode) && extract.client.ageYears < 40) {
    return offer("Daycoval", "blocked", "Espécie de invalidez fora da idade mínima.", "Portabilidade", "jul/26", 0);
  }
  if (contract.installment < 20) {
    return offer("Daycoval", "blocked", "Parcela abaixo do mínimo de R$ 20.", "Portabilidade", "jul/26", 0);
  }
  return offer(
    "Daycoval",
    "eligible",
    extract.financial.availableMargin < 0
      ? "Permite margem negativa na portabilidade com refin; saldo final depende da CIP."
      : "Idade, espécie e parcela atendem; saldo final depende da CIP.",
    "Portabilidade + refin",
    "jul/26",
    86,
  );
}

function assessC6(extract, contract) {
  if (contract.bankCode === "626" || contract.bankCode === "336") {
    return offer("C6 Bank", "blocked", "Contrato já pertence ao grupo C6.", "Portabilidade", "jul/26", 0);
  }
  if (contract.payoff < 1950) {
    return offer(
      "C6 Bank",
      "blocked",
      "Saldo mais o troco mínimo não alcançam o ticket de R$ 2.000.",
      "Portabilidade",
      "jul/26",
      0,
    );
  }
  return offer(
    "C6 Bank",
    "eligible",
    extract.financial.availableMargin < 0
      ? "Ticket atendido; a margem negativa deve ser abatida de uma única parcela."
      : "Ticket mínimo atendido; priorizar o refinanciamento e manter a portabilidade pura como alternativa.",
    "Portabilidade + refin",
    "jul/26",
    89,
  );
}

function assessBrb(extract, contract) {
  if (bpcLoasSpecies.has(extract.client.speciesCode)) {
    return offer(
      "BRB",
      "blocked",
      "O roteiro não concede operação para BPC/LOAS (espécies 87 e 88).",
      "Portabilidade",
      "jan/26",
      0,
    );
  }
  if (["121", "336", "380", "626"].includes(contract.bankCode)) {
    return offer(
      "BRB",
      "blocked",
      `O roteiro lista a origem ${contract.bankCode} entre os bancos não portados.`,
      "Portabilidade",
      "jan/26",
      0,
    );
  }
  if (contract.payoff < 4000.01) {
    return offer("BRB", "blocked", "Saldo abaixo do mínimo conservador de R$ 4.000,01.", "Portabilidade", "jan/26", 0);
  }
  if (monthsSince(contract.registeredAt) < 12) {
    return offer("BRB", "blocked", "O contrato ainda não completou mais de 360 dias.", "Portabilidade", "jan/26", 0);
  }
  if (contract.payoff > 150000) {
    return offer("BRB", "blocked", "Saldo acima do limite de R$ 150.000 por CPF.", "Portabilidade", "jan/26", 0);
  }
  if (extract.financial.availableMargin < 0) {
    return offer(
      "BRB",
      "review",
      "Margem negativa exige portabilidade com refin e abatimento na simulação.",
      "Portabilidade + refin",
      "jan/26",
      50,
    );
  }
  return offer(
    "BRB",
    "eligible",
    "Saldo e tempo do contrato atendem aos mínimos objetivos.",
    "Portabilidade + refin",
    "jan/26",
    80,
  );
}

function assessHappy(extract, contract) {
  if (extract.client.ageYears < 21) {
    return offer("Happy", "blocked", "Idade abaixo do mínimo de 21 anos.", "Portabilidade", "V03", 0);
  }
  if (extract.client.ageYears + contract.remaining / 12 >= 79.9) {
    return offer(
      "Happy",
      "review",
      "É necessário ajustar o prazo para terminar antes de 79 anos e 11 meses.",
      "Portabilidade",
      "V03",
      46,
    );
  }
  if (contract.payoff > 85000) {
    return offer("Happy", "blocked", "Saldo acima do limite de R$ 85.000.", "Portabilidade", "V03", 0);
  }
  return offer(
    "Happy",
    "eligible",
    "Idade final, saldo e produto de portabilidade atendem ao roteiro.",
    "Portabilidade pura",
    "V03",
    87,
  );
}

function assessAcredto(extract, contract) {
  if (contract.payoff < 4000) {
    return offer(
      "Acredto",
      "blocked",
      "Saldo abaixo de R$ 4.000 para portabilidade com refin.",
      "Portabilidade",
      "24/07/26",
      0,
    );
  }
  if (extract.financial.availableMargin < 0) {
    return offer(
      "Acredto",
      "review",
      "O material não define o tratamento da margem negativa; validar na simulação.",
      "Portabilidade + refin",
      "24/07/26",
      48,
    );
  }
  return offer(
    "Acredto",
    "eligible",
    contract.payoff >= 6000
      ? "Saldo atende às duas modalidades; priorizar o refinanciamento e deixar a portabilidade pura como alternativa."
      : "Saldo atende à portabilidade com refin; portabilidade pura exige R$ 6.000.",
    "Portabilidade + refin",
    "24/07/26",
    contract.payoff >= 6000 ? 90 : 82,
  );
}

function assessQueroMais(extract, contract) {
  if (contract.installment < 20) {
    return offer(
      "Quero Mais Crédito",
      "blocked",
      "Parcela abaixo do mínimo de R$ 20.",
      "Portabilidade + refin",
      "jul/26",
      0,
    );
  }
  return offer(
    "Quero Mais Crédito",
    "eligible",
    extract.financial.availableMargin < 0
      ? "Permite reduzir margem negativa em uma única parcela; exige refin vinculado."
      : "Parcela mínima atendida; o produto exige portabilidade com refin.",
    "Portabilidade + refin",
    "jul/26",
    85,
  );
}

function assessTotalCash(extract, contract) {
  if (extract.client.speciesCode === "32") {
    return offer(
      "Total Cash",
      "blocked",
      "Operações de portabilidade estão suspensas para a espécie 32.",
      "Portabilidade",
      "jul/26",
      0,
    );
  }
  if (contract.payoff < 3900) {
    return offer(
      "Total Cash",
      "blocked",
      "Saldo mais o troco mínimo de R$ 100 não alcançam o ticket de R$ 4.000.",
      "Portabilidade",
      "jul/26",
      0,
    );
  }
  return offer(
    "Total Cash",
    "eligible",
    contract.payoff >= 4000
      ? "Ticket atendido; priorizar o refinanciamento e deixar a portabilidade pura como alternativa."
      : "Ticket atendido somente com o troco mínimo do refinanciamento.",
    "Portabilidade + refin",
    "jul/26",
    contract.payoff >= 4000 ? 93 : 81,
  );
}

function normalizeLocation(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function applyGeographicRestriction(item, extract) {
  const age = extract.client.ageYears;
  const state = normalizeLocation(extract.client.state);
  const city = normalizeLocation(extract.client.city);
  const hybridStates = new Set(["AP", "PB", "RR", "TO"]);

  if (item.bank === "Facta" && state === "PI") {
    return {
      ...item,
      status: "blocked",
      score: 0,
      reason: "A Facta não atende clientes que recebem ou residem no Piauí.",
    };
  }

  if (item.bank === "Digio" && state === "GO" && city === "ORIZONA") {
    return {
      ...item,
      status: "blocked",
      score: 0,
      reason: "O Digio não atende clientes que recebem ou residem em Orizona/GO.",
    };
  }

  const blockedForOlder =
    age >= 60 &&
    ((item.bank === "Finanto" && hybridStates.has(state)) ||
      (item.bank === "iCred" &&
        new Set(["AP", "PB", "RS", "RR", "SC", "TO"]).has(state)));

  if (blockedForOlder) {
    return {
      ...item,
      status: "blocked",
      score: 0,
      reason: `${item.bank} não atende clientes de 60 anos ou mais nesta UF (${state}).`,
    };
  }

  if (age < 60 || item.status === "blocked") return item;

  const hybridBanks = new Set([
    "Banrisul",
    "BMG",
    "C6 Bank",
    "Daycoval",
    "Digio",
    "Facta",
    "PAN",
    "Quero Mais Crédito",
    "Total Cash",
  ]);
  const hybridCities = {
    Daycoval: new Set(["ITUMBIARA/GO", "POCOS DE CALDAS/MG", "TIMBIRAS/MA"]),
    Digio: new Set(["POCOS DE CALDAS/MG"]),
    "Quero Mais Crédito": new Set(["ITUMBIARA/GO", "POCOS DE CALDAS/MG"]),
  };
  const cityKey = `${city}/${state}`;
  const needsHybrid =
    (hybridBanks.has(item.bank) && hybridStates.has(state)) ||
    hybridCities[item.bank]?.has(cityKey);

  if (!needsHybrid) return item;

  return {
    ...item,
    status: "review",
    score: Math.min(item.score, 55),
    reason: `${item.reason} Formalização híbrida obrigatória para cliente de 60 anos ou mais nesta localidade.`,
  };
}

export function assessContract(extract, contract) {
  const speciesStatus = getInssSpeciesStatus(extract.client.speciesCode);
  let offers = [
    assessQuali(extract, contract),
    assessFacta(extract, contract),
    assessBmg(extract, contract),
    assessPan(extract, contract),
    assessBanrisul(extract, contract),
    assessIcred(extract, contract),
    assessFinanto(extract, contract),
    assessDigio(extract, contract),
    assessDaycoval(extract, contract),
    assessC6(extract, contract),
    assessBrb(extract, contract),
    assessHappy(extract, contract),
    assessAcredto(extract, contract),
    assessQueroMais(extract, contract),
    assessTotalCash(extract, contract),
  ];

  offers = offers.map((item) => applyGeographicRestriction(item, extract));

  if (speciesStatus.status === "non_consignable") {
    offers = offers.map((item) => ({
      ...item,
      status: "blocked",
      score: 0,
      reason: `Espécie ${speciesStatus.code} não consignável: ${speciesStatus.reason}`,
    }));
  } else if (speciesStatus.status === "unknown") {
    offers = offers.map((item) => ({
      ...item,
      status: "review",
      score: Math.min(item.score, 30),
      reason: `Espécie ${speciesStatus.code || "não identificada"} exige revisão: ${speciesStatus.reason}`,
    }));
  }

  return offers.sort((left, right) => {
    const statusOrder = { eligible: 0, review: 1, blocked: 2 };
    return (
      statusOrder[left.status] - statusOrder[right.status] ||
      portabilityPriority(left.mode) - portabilityPriority(right.mode) ||
      right.score - left.score
    );
  });
}

export function analyzeInssExtract(text) {
  const extract = parseInssExtract(text);
  if (!extract.contracts.length) {
    throw new Error(
      "Não consegui identificar a tabela de contratos. Verifique se o PDF é um extrato INSS com texto selecionável.",
    );
  }

  const contracts = extract.contracts.map((contract) => {
    const offers = assessContract(extract, contract);
    return {
      ...contract,
      offers,
      possible: offers.filter((item) => item.status === "eligible"),
      review: offers.filter((item) => item.status === "review"),
      blocked: offers.filter((item) => item.status === "blocked"),
    };
  });

  return {
    ...extract,
    speciesStatus: getInssSpeciesStatus(extract.client.speciesCode),
    contracts,
    analyzedAt: new Date().toISOString(),
  };
}

export function formatMoney(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}
