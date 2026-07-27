"use client";

import { FormEvent, useRef, useState } from "react";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.mjs?url";

import {
  analyzeInssExtract,
  formatMoney,
  INSS_GENERAL_RULES,
  maskDocument,
} from "@/lib/inss-extrato.mjs";
import {
  calculateCitizenFinancing,
  formatCitizenResult,
  parseCitizenNumber,
} from "@/lib/citizen-calculator.mjs";

type View = "chat" | "rules" | "calculator";
type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  text: string;
};
type UploadState = "idle" | "reading" | "ready" | "error";
type OfferStatus = "eligible" | "review" | "blocked";
type BankOffer = {
  bank: string;
  status: OfferStatus;
  reason: string;
  mode: string;
  version: string;
  score: number;
};
type ContractAnalysis = {
  bankCode: string;
  bank: string;
  registeredAt: string;
  start: string;
  end: string;
  financed: number;
  payoff: number;
  installment: number;
  approximateRate: number;
  paid: number;
  total: number;
  remaining: number;
  contractNumber: string;
  refinanceAvailable: number;
  portabilityAvailable: number;
  calculatedRate: number;
  offers: BankOffer[];
  possible: BankOffer[];
  review: BankOffer[];
  blocked: BankOffer[];
};
type AnalysisResult = {
  client: {
    name: string;
    benefit: string;
    cpf: string;
    birthDate: string;
    speciesCode: string;
    species: string;
    ageYears: number;
    ageMonths: number;
    city: string;
    state: string;
  };
  banking: {
    paymentMethod: string;
    bankCode: string;
    bank: string;
  };
  financial: {
    benefitValue: number;
    consignedValue: number;
    availableMargin: number;
  };
  speciesStatus: {
    code: string;
    status: "consignable" | "non_consignable" | "unknown";
    label: string;
    reason: string;
  };
  contracts: ContractAnalysis[];
  analyzedAt: string;
};

const rulebooks = [
  {
    bank: "Quali",
    color: "blue",
    version: "v1.0",
    updated: "06 mai 2026",
    scope: "INSS · Empréstimo",
    status: "active",
    criteria: "Idade · saldo · prazo",
    detail:
      "Saldo, parcelas pagas, bancos de origem, idade final e espécies de invalidez.",
  },
  {
    bank: "Facta",
    color: "green",
    version: "jul/26",
    updated: "24 jul 2026",
    scope: "INSS · Empréstimo",
    status: "active",
    criteria: "Origem · parcela · margem",
    detail:
      "Mínimo por banco de origem, margem negativa, prazo e limite por idade.",
  },
  {
    bank: "BMG",
    color: "orange",
    version: "19/05",
    updated: "19 mai 2026",
    scope: "INSS · Empréstimo",
    status: "active",
    criteria: "Espécie · idade · margem",
    detail:
      "Espécies, faixa etária, margem, mínimo pago e confirmação pós-averbação.",
  },
  {
    bank: "PAN",
    color: "cyan",
    version: "117",
    updated: "18 mai 2026",
    scope: "INSS · Empréstimo",
    status: "active",
    criteria: "Espécie · prazo · margem",
    detail:
      "Espécies, idade, prazo, margem negativa e condições de formalização.",
  },
  {
    bank: "Banrisul",
    color: "violet",
    version: "jul/26",
    updated: "24 jul 2026",
    scope: "INSS · Empréstimo",
    status: "active",
    criteria: "Idade · valor · produto",
    detail:
      "Público, faixa etária, valor máximo, refinanciamento e documentação.",
  },
  {
    bank: "iCred",
    color: "lime",
    version: "jul/26",
    updated: "24 jul 2026",
    scope: "INSS · Empréstimo",
    status: "active",
    criteria: "Idade · benefício · produto",
    detail:
      "Prazo de até 96 meses, política etária, espécies, margem e regras de portabilidade.",
  },
  {
    bank: "Finanto",
    color: "emerald",
    version: "jul/26",
    updated: "24 jul 2026",
    scope: "INSS · Empréstimo",
    status: "active",
    criteria: "Saldo · parcela · pagas",
    detail:
      "Tabelas por produto, saldo e parcela mínimos, parcelas pagas e margem negativa.",
  },
  {
    bank: "Digio",
    color: "navy",
    version: "V21",
    updated: "02 mar 2026",
    scope: "INSS · Empréstimo",
    status: "active",
    criteria: "Espécie · idade · origem",
    detail:
      "Espécies elegíveis, invalidez a partir de 60 anos, bancos de origem e limites.",
  },
  {
    bank: "Daycoval",
    color: "aqua",
    version: "jul/26",
    updated: "24 jul 2026",
    scope: "INSS · Empréstimo",
    status: "active",
    criteria: "Idade · invalidez · CIP",
    detail:
      "Prazo de até 96 meses, idade, invalidez, portabilidade e saldo devedor via CIP.",
  },
  {
    bank: "C6 Bank",
    color: "black",
    version: "jul/26",
    updated: "24 jul 2026",
    scope: "INSS · Empréstimo",
    status: "active",
    criteria: "Produto · origem · invalidez",
    detail:
      "Margem livre, refinanciamento, portabilidade, bancos não aceitos e regras de invalidez.",
  },
  {
    bank: "BRB",
    color: "royal",
    version: "jan/26",
    updated: "jan 2026",
    scope: "INSS · Empréstimo",
    status: "active",
    criteria: "Idade · margem · portabilidade",
    detail:
      "Público, benefícios, política etária, valores máximos e regras por produto.",
  },
  {
    bank: "Happy",
    color: "turquoise",
    version: "V03",
    updated: "14 nov 2025",
    scope: "INSS · Empréstimo",
    status: "active",
    criteria: "Idade final · produto · valor",
    detail:
      "Produtos, espécies, idade final, prazo de até 96 meses e portabilidade com refin.",
  },
  {
    bank: "Acredto",
    color: "violet",
    version: "24/07",
    updated: "24 jul 2026",
    scope: "INSS · Empréstimo",
    status: "active",
    criteria: "Saldo · troco · múltiplos",
    detail:
      "Portabilidade pura a partir de R$ 6 mil, refin a partir de R$ 4 mil e até 13 contratos.",
  },
  {
    bank: "Quero Mais Crédito",
    color: "orange",
    version: "jul/26",
    updated: "15 jul 2026",
    scope: "INSS · Empréstimo",
    status: "active",
    criteria: "Parcela · margem · refin",
    detail:
      "Parcela mínima de R$ 20, refin obrigatório, margem negativa e formalização por localidade.",
  },
  {
    bank: "Total Cash",
    color: "cyan",
    version: "jul/26",
    updated: "15 jul 2026",
    scope: "INSS · Empréstimo",
    status: "active",
    criteria: "Ticket · espécie · produto",
    detail:
      "Ticket de R$ 4 mil, troco mínimo de R$ 100, portabilidade pura e suspensão da espécie 32.",
  },
  {
    bank: "Facta",
    color: "slate",
    version: "26/05",
    updated: "26 mai 2026",
    scope: "SIAPE · Próxima fase",
    status: "cataloged",
    criteria: "Base separada",
    detail:
      "Documento catalogado e separado do motor INSS para evitar cruzamento de regras.",
  },
];

const activeRulebookCount = rulebooks.filter(
  (rulebook) => rulebook.status === "active",
).length;

function statusLabel(status: OfferStatus) {
  if (status === "eligible") return "Possível";
  if (status === "review") return "Revisar";
  return "Não opera";
}

function operationalGuide(bank: string) {
  const guides: Record<string, string> = {
    Banrisul:
      "No Banrisul: acesse Venda 4.0, escolha a modalidade de portabilidade, informe o contrato, simule, complete agente e dados do cliente e siga para formalização. Na Port Especial, o refin ocorre depois da averbação.",
    "C6 Bank":
      "No C6: Cadastro > Proposta Consignado > Portabilidade. Informe origem, contrato, parcela, saldo e parcelas a vencer; calcule a oferta e, no refin, use a tabela correspondente à portabilidade antes de gravar.",
    Daycoval:
      "No Daycoval: valide primeiro no simulador, abra Simulação de Ofertas, escolha Port + Refin, informe os dados do contrato e use tabelas combinadas com a mesma numeração antes de gerar as propostas.",
    iCred:
      "No iCred: Simular INSS > iFlow, informe CPF e telefone, aguarde as ofertas, avance até Port + Refin, escolha a tabela e complete dados pessoais, endereço e pagamento antes de gravar.",
    "Quero Mais Crédito":
      "No Quero Mais: autentique com o token do app Correspondente Daycoval, abra Simulação de Ofertas, escolha Port + Refin, use as tabelas combinadas, complete os dados e gere as duas propostas.",
    "Total Cash":
      "No Total Cash: autorize a IN100, informe benefício e margem, cadastre contrato, saldo, parcela, prazo e taxa, inclua a proposta, complete dados bancários e pessoais e envie o link de assinatura.",
  };
  return guides[bank];
}

function refinancingGuide(bank: string) {
  const guides: Record<string, string> = {
    Banrisul:
      "Refin de carteira Banrisul: libera no mínimo R$ 200, parcela mínima R$ 8 e exige 5 pagas para contratos de R$ 5 mil ou mais, ou 10 pagas abaixo disso.",
    BMG:
      "Refin de carteira BMG: libera no mínimo R$ 50 e normalmente exige 5 parcelas pagas; contratos em 108 parcelas podem ter exceção.",
    BRB:
      "Refin de carteira BRB: libera no mínimo R$ 50, exige 6 parcelas pagas e não aceita parcelas em atraso.",
    "C6 Bank":
      "Refin de carteira C6: troco mínimo de R$ 700 ou 5% do financiado; exige 6 pagas nos prazos 84/96 ou 7% nos demais prazos.",
    Daycoval:
      "Refin de carteira Daycoval: libera no mínimo R$ 100, parcela mínima R$ 20 e exige 6 pagas em tabela normal; margem livre pode ter regra de 7 dias.",
    Digio:
      "Refin de carteira Digio: libera no mínimo R$ 250, não exige mínimo de parcelas pagas e não permite redução por margem negativa.",
    Facta:
      "Refin de carteira Facta: libera no mínimo R$ 100, parcela mínima R$ 50 e exige 4 parcelas pagas.",
    Finanto:
      "A Finanto está com refinanciamento de carteira suspenso, exceto redigitação de refin de portabilidade cancelado.",
    iCred:
      "Refin de carteira iCred: libera no mínimo R$ 100, exige 12 pagas e não aceita margem negativa. Na retenção, a tabela não remunera e há coobrigação até a 3ª parcela.",
    PAN:
      "Refin de carteira PAN: libera no mínimo R$ 50 e exige 9 pagas, ou taxa de até 1,80%; a tabela PAN13 possui regra própria.",
    "Quero Mais Crédito":
      "Refin de carteira Quero Mais: libera no mínimo R$ 100, parcela mínima R$ 20 e exige 6 pagas em tabela normal; margem livre pode ter regra de 7 dias.",
  };
  return guides[bank];
}

async function extractPdfText(file: File) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data });
  const pdf = await loadingTask.promise;
  const pageTexts: string[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      let pageText = "";

      for (const item of content.items) {
        if (!("str" in item)) continue;
        pageText += item.str;
        pageText += item.hasEOL ? "\n" : " ";
      }

      pageTexts.push(pageText);
    }
  } finally {
    await loadingTask.destroy();
  }

  return pageTexts.join("\n");
}

function normalizeChatText(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^\p{L}\p{N}%]+/gu, " ")
    .trim();
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(normalizeChatText(term)));
}

function assistantReply(
  question: string,
  analysis: AnalysisResult | null,
  history: ChatMessage[] = [],
) {
  const normalized = normalizeChatText(question);
  const activeRulebooks = rulebooks.filter(
    (rulebook) => rulebook.status === "active",
  );
  const bankAliases: Record<string, string[]> = {
    "C6 Bank": ["c6", "c6 bank"],
    iCred: ["icred", "i cred"],
    "Quero Mais Crédito": ["quero mais", "quero mais credito"],
    "Total Cash": ["total cash", "totalcash"],
  };
  const findMentionedBank = (text: string) =>
    activeRulebooks.find((rulebook) => {
      const aliases = [
        rulebook.bank,
        ...(bankAliases[rulebook.bank] ?? []),
      ].map(normalizeChatText);
      return aliases.some((alias) => text.includes(alias));
    });
  const previousContext = normalizeChatText(
    history
      .slice(-4)
      .map((message) => message.text)
      .join(" "),
  );
  const isFollowUp = includesAny(normalized, [
    "por que",
    "porque",
    "e esse",
    "e nele",
    "e nesse",
    "esse banco",
    "essa opção",
    "detalhe",
    "explique",
  ]);
  const mentionedBank =
    findMentionedBank(normalized) ??
    (isFollowUp ? findMentionedBank(previousContext) : undefined);
  const asksRefinancing = includesAny(normalized, [
    "refinanciamento de carteira",
    "refin de carteira",
    "retenção",
    "refinanciar no mesmo banco",
  ]);
  const asksClientData = includesAny(normalized, [
    "cliente",
    "nome",
    "idade",
    "benefício",
    "cpf",
    "dados cadastrais",
  ]);
  const asksContracts = includesAny(normalized, [
    "quantos contratos tem",
    "quantos contratos foram",
    "quantos contratos encontrou",
    "contratos encontrados",
    "resumo dos contratos",
    "quais contratos",
    "contrato do cliente",
  ]);
  const asksBankCatalog = includesAny(normalized, [
    "bancos cadastrados",
    "quais roteiros",
    "base de bancos",
    "lista de bancos",
  ]);
  const asksRoutes = includesAny(normalized, [
    "onde",
    "porta",
    "opera",
    "aceita",
    "qual banco",
    "quais bancos",
    "melhor banco",
    "melhores opções",
    "possibilidades",
    "rotas",
  ]);
  const asksBlocked = includesAny(normalized, [
    "bloque",
    "não aceita",
    "não opera",
    "impedido",
    "reprov",
    "motivo",
    "por que",
    "porque",
  ]);
  const needsExtract =
    asksClientData ||
    asksContracts ||
    (asksRoutes && !asksBankCatalog) ||
    asksBlocked ||
    includesAny(normalized, [
      "margem do cliente",
      "saldo",
      "quitação",
      "parcela",
      "pagas",
      "restantes",
      "taxa do contrato",
    ]);

  const greetingPhrases = new Set([
    "oi",
    "ola",
    "oi tudo bem",
    "ola tudo bem",
    "bom dia",
    "boa tarde",
    "boa noite",
    "e ai",
    "salve",
    "saudacoes",
  ]);

  if (greetingPhrases.has(normalized)) {
    return analysis
      ? "Olá! Como posso ajudar com esta análise? Você pode perguntar sobre contratos, margem, taxas, bancos possíveis ou motivos de bloqueio."
      : "Olá! Como posso ajudar? Faça uma pergunta sobre bancos, regras, portabilidade, margem ou refinanciamento. Para analisar um cliente, você também pode anexar o extrato INSS.";
  }

  if (
    includesAny(normalized, [
      "obrigado",
      "obrigada",
      "valeu",
      "agradeço",
      "agradeco",
    ]) &&
    normalized.split(" ").length <= 6
  ) {
    return "Por nada! Se precisar, faça outra pergunta sobre consignado ou envie um extrato para análise.";
  }

  if (
    includesAny(normalized, ["tchau", "até mais", "ate mais", "até logo"]) &&
    normalized.split(" ").length <= 5
  ) {
    return "Até mais! Quando precisar, estarei aqui para ajudar com as regras e análises de consignado.";
  }

  if (
    includesAny(normalized, [
      "o que você faz",
      "como funciona",
      "pode fazer",
      "ajuda",
      "comandos",
    ])
  ) {
    return analysis
      ? "Posso ajudar com: resumo dos contratos, margem, saldo de quitação, parcelas, taxas, bancos possíveis e motivos de bloqueio. Faça uma pergunta específica sobre o que deseja consultar."
      : "Posso ajudar com: bancos cadastrados, regras INSS, taxa teto, prazo, margem, portabilidade e refinanciamento. Para consultar um cliente, anexe o extrato INSS.";
  }

  if (!analysis && needsExtract) {
    return "Para responder isso com os dados reais do cliente, anexe primeiro o extrato INSS em PDF. Depois posso analisar contratos, margem, saldo, parcelas, taxas e bancos possíveis.";
  }

  if (
    !asksRefinancing &&
    mentionedBank &&
    includesAny(normalized, ["digitar", "simular", "passo", "fluxo", "portal"])
  ) {
    return (
      operationalGuide(mentionedBank.bank) ??
      `O fluxo de ${mentionedBank.bank} está catalogado, mas essa etapa depende do portal e da tabela comercial vigente. Primeiro confirme a elegibilidade no extrato e depois siga a esteira do banco.`
    );
  }

  if (asksRefinancing) {
    if (mentionedBank) {
      return (
        refinancingGuide(mentionedBank.bank) ??
        `O refinanciamento de carteira só pode ocorrer no mesmo banco do contrato. A regra detalhada de ${mentionedBank.bank} precisa ser confirmada na tabela vigente.`
      );
    }
    return "O refinanciamento de carteira só pode ser feito no mesmo banco do contrato ativo. Informe o banco para eu responder mínimo de parcelas pagas, troco, parcela e tratamento da margem.";
  }

  if (!analysis && mentionedBank) {
    return `${mentionedBank.bank} · ${mentionedBank.scope} · roteiro ${mentionedBank.version}, atualizado em ${mentionedBank.updated}. Critérios principais: ${mentionedBank.criteria}. ${mentionedBank.detail}`;
  }

  if (analysis && mentionedBank) {
    const decisions = analysis.contracts.slice(0, 4).map((contract) => {
      const decision = contract.offers.find(
        (item) => item.bank === mentionedBank.bank,
      );
      return `${contract.bank} · parcela ${formatMoney(contract.installment)}: ${statusLabel(decision?.status ?? "review")} — ${decision?.reason ?? "exige revisão"}`;
    });
    return `${mentionedBank.bank}: ${decisions.join(" | ")}`;
  }

  if (analysis && asksClientData) {
    const { client, financial } = analysis;
    return `Cliente: ${client.name || "não identificado"} · CPF ${maskDocument(client.cpf) || "não identificado"} · benefício ${maskDocument(client.benefit) || "não identificado"} · ${client.ageYears} anos e ${client.ageMonths} meses · espécie ${client.speciesCode || "não identificada"} (${client.species}). Benefício de ${formatMoney(financial.benefitValue)} e margem disponível de ${formatMoney(financial.availableMargin)}.`;
  }

  if (analysis && asksContracts) {
    if (!analysis.contracts.length) {
      return "Não encontrei contratos de empréstimo no extrato anexado.";
    }
    const summary = analysis.contracts
      .slice(0, 6)
      .map(
        (contract, index) =>
          `${index + 1}) ${contract.bank}, parcela ${formatMoney(contract.installment)}, ${contract.paid} pagas e ${contract.remaining} restantes, saldo ${formatMoney(contract.payoff)}`,
      )
      .join(" | ");
    return `Encontrei ${analysis.contracts.length} contrato(s): ${summary}.`;
  }

  if (analysis && includesAny(normalized, ["espécie", "especie"])) {
    return `A espécie ${analysis.speciesStatus.code || "não identificada"} está classificada como ${analysis.speciesStatus.label.toLocaleLowerCase("pt-BR")}. ${analysis.speciesStatus.reason} A aceitação final ainda varia conforme o roteiro de cada banco.`;
  }

  if (analysis && asksBlocked) {
    const blockedSummary = analysis.contracts
      .slice(0, 4)
      .map((contract) => {
        const blocked = contract.blocked
          .slice(0, 4)
          .map((offer) => `${offer.bank}: ${offer.reason}`)
          .join("; ");
        return `${contract.bank} · ${formatMoney(contract.installment)} — ${blocked || "nenhum bloqueio automático"}`;
      })
      .join(" | ");
    return `Principais bloqueios encontrados: ${blockedSummary}. A classificação é uma pré-análise e deve ser confirmada na condição comercial vigente.`;
  }

  if (analysis && asksRoutes) {
    if (analysis.contracts.length === 1) {
      const contract = analysis.contracts[0];
      const banks = contract.possible
        .slice(0, 8)
        .map((item) => `${item.bank} (${item.mode})`)
        .join(", ");
      return contract.possible.length
        ? `Para a parcela de ${formatMoney(contract.installment)} do ${contract.bank}, encontrei ${contract.possible.length} rota(s) possível(is): ${banks}. A ordem segue a pontuação dos roteiros cadastrados.`
        : `Não encontrei rota automática para a parcela de ${formatMoney(contract.installment)} do ${contract.bank}. Pergunte “por que foi bloqueado?” para ver os motivos.`;
    }

    const routes = analysis.contracts
      .slice(0, 5)
      .map((contract) => {
        const banks = contract.possible
          .slice(0, 4)
          .map((offer) => offer.bank)
          .join(", ");
        return `${contract.bank} · ${formatMoney(contract.installment)}: ${banks || "sem rota automática"}`;
      })
      .join(" | ");
    return `Melhores rotas por contrato: ${routes}. Abra a comparação completa para conferir todos os bancos e justificativas.`;
  }

  if (
    analysis &&
    includesAny(normalized, ["margem", "disponível", "disponivel"])
  ) {
    const { financial } = analysis;
    return `Benefício: ${formatMoney(financial.benefitValue)} · valor consignado: ${formatMoney(financial.consignedValue)} · margem disponível: ${formatMoney(financial.availableMargin)}. Margem negativa deve seguir o tratamento específico de cada banco.`;
  }

  if (analysis && includesAny(normalized, ["saldo", "quitação", "quitacao"])) {
    const balances = analysis.contracts
      .slice(0, 6)
      .map(
        (contract) =>
          `${contract.bank}: saldo de quitação ${formatMoney(contract.payoff)}`,
      )
      .join("; ");
    return `Saldos identificados no extrato: ${balances}. O valor definitivo deve ser confirmado pela CIP.`;
  }

  if (
    analysis &&
    includesAny(normalized, [
      "parcelas pagas",
      "parcelas restantes",
      "quantas pagas",
      "quantas faltam",
      "prazo restante",
    ])
  ) {
    const terms = analysis.contracts
      .slice(0, 6)
      .map(
        (contract) =>
          `${contract.bank}: ${contract.paid} pagas, ${contract.remaining} restantes de ${contract.total}`,
      )
      .join("; ");
    return `Situação dos contratos: ${terms}.`;
  }

  if (analysis && includesAny(normalized, ["taxa", "juros"])) {
    const examples = analysis.contracts
      .slice(0, 3)
      .map(
        (contract) =>
          `${contract.bank}: ${contract.calculatedRate.toFixed(2).replace(".", ",")}% a.m.`,
      )
      .join("; ");
    return `Recalculei a taxa usando quitação, parcela e prazo restante. ${examples}`;
  }

  if (
    asksBankCatalog ||
    includesAny(normalized, ["bancos", "cadastrados", "roteiros"])
  ) {
    return `A base INSS tem ${activeRulebookCount} bancos ativos: ${activeRulebooks.map((item) => item.bank).join(", ")}. O roteiro SIAPE da Facta está catalogado separadamente para a próxima fase.`;
  }
  if (includesAny(normalized, ["novos", "adicionados", "chegaram"])) {
    return "Foram lidos 18 novos materiais: regras gerais de margem, taxa, prazo, contratos, público vulnerável, restrições geográficas, fluxo de proposta e guias de simulação. Acredto, Quero Mais Crédito e Total Cash também entraram na comparação automática.";
  }
  if (includesAny(normalized, ["margem negativa"])) {
    return "A margem negativa deve ser abatida de uma única parcela, nunca dividida entre vários contratos. Banrisul, BRB, C6, Daycoval, Facta, Finanto, iCred, Quero Mais e Total Cash possuem tratamentos próprios; o motor aplica a regra conforme o banco e o produto.";
  }
  if (includesAny(normalized, ["taxa teto", "teto da taxa"])) {
    return `A taxa teto informada no material é ${INSS_GENERAL_RULES.loanRateCeiling.toFixed(2).replace(".", ",")}% a.m. para empréstimo e ${INSS_GENERAL_RULES.cardRateCeiling.toFixed(2).replace(".", ",")}% a.m. para RMC/RCC.`;
  }
  if (includesAny(normalized, ["prazo máximo", "prazo maximo", "108"])) {
    return `Desde ${INSS_GENERAL_RULES.effectiveFrom}, o prazo máximo geral pode chegar a ${INSS_GENERAL_RULES.maxTerm} parcelas, sujeito à política de cada banco.`;
  }
  if (
    includesAny(normalized, [
      "quantos contratos pode",
      "linhas consignáveis",
      "limite de contratos",
    ])
  ) {
    return `O benefício pode ter até ${INSS_GENERAL_RULES.maxLoanContracts} contratos ativos de empréstimo e até ${INSS_GENERAL_RULES.maxCardContracts} cartões, sendo um RMC e um RCC. BPC/LOAS pode ter apenas um cartão ativo.`;
  }
  if (includesAny(normalized, ["público vulnerável", "publico vulneravel"])) {
    return "A vulnerabilidade pode considerar idade, renda, escolaridade, maturidade digital, capacidade civil, deficiência, doença grave e superendividamento. Alguns bancos apenas alertam; Daycoval, Digio, iCred e Quero Mais podem encaminhar para análise interna.";
  }
  if (
    includesAny(normalized, [
      "calculadora do cidadão",
      "calculadora do cidadao",
    ])
  ) {
    return "Abra a aba Calculadora na barra lateral. Preencha exatamente três campos e deixe o que deseja calcular em branco. Para estimar a taxa do contrato, informe parcelas restantes, valor da prestação e saldo de quitação. O resultado é aproximado; a CIP confirma o saldo real.";
  }
  if (
    normalized.includes("margem") &&
    includesAny(normalized, ["40", "cartão", "cartao", "bpc"])
  ) {
    return "Após 19/05/2026, aposentados e pensionistas têm até 40% sem cartão, 35% com um cartão e 30% com RMC e RCC. BPC/LOAS tem até 35% sem cartão ou 30% com um cartão.";
  }
  if (includesAny(normalized, ["taxa", "juros"])) {
    return "A taxa é recalculada com parcela, saldo de quitação e parcelas restantes. A taxa aproximada impressa no extrato fica apenas como referência.";
  }

  return analysis
    ? "Não identifiquei exatamente o que você quer consultar. Tente perguntar: “quais são as melhores opções?”, “por que foi bloqueado?”, “qual é a margem?”, “quantas parcelas faltam?” ou mencione o nome de um banco."
    : `Não encontrei essa informação na pergunta. Posso explicar as regras dos ${activeRulebookCount} bancos INSS cadastrados, taxa teto, prazo, margem e refinanciamento. Para analisar um cliente, anexe o extrato em PDF.`;
}

function StatusPill({
  kind,
  children,
}: {
  kind: string;
  children: React.ReactNode;
}) {
  return <span className={`status-pill ${kind}`}>{children}</span>;
}

const calculatorFields = {
  months: {
    label: "Nº de meses",
    hint: "Prazo ou parcelas restantes",
    placeholder: "Ex.: 84",
    suffix: "meses",
  },
  monthlyRate: {
    label: "Taxa de juros mensal",
    hint: "Taxa em percentual ao mês",
    placeholder: "Ex.: 1,85",
    suffix: "% a.m.",
  },
  installment: {
    label: "Valor da prestação",
    hint: "Primeira prestação fora do ato",
    placeholder: "Ex.: 480,00",
    suffix: "R$",
  },
  financed: {
    label: "Valor financiado",
    hint: "Não inclui o valor da entrada",
    placeholder: "Ex.: 25.000,00",
    suffix: "R$",
  },
} as const;

type CalculatorField = keyof typeof calculatorFields;

function CalculatorView({ onBack }: { onBack: () => void }) {
  const emptyValues: Record<CalculatorField, string> = {
    months: "",
    monthlyRate: "",
    installment: "",
    financed: "",
  };
  const [values, setValues] = useState(emptyValues);
  const [result, setResult] = useState<{
    field: CalculatorField;
    value: number;
  } | null>(null);
  const [error, setError] = useState("");

  function resetCalculator() {
    setValues(emptyValues);
    setResult(null);
    setError("");
  }

  function submitCalculation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);

    try {
      const calculation = calculateCitizenFinancing({
        months: parseCitizenNumber(values.months),
        monthlyRate: parseCitizenNumber(values.monthlyRate),
        installment: parseCitizenNumber(values.installment),
        financed: parseCitizenNumber(values.financed),
      }) as { field: CalculatorField; value: number };

      const maximumFractionDigits =
        calculation.field === "monthlyRate"
          ? 6
          : calculation.field === "months"
            ? 2
            : 2;
      const calculatedInput = calculation.value.toLocaleString("pt-BR", {
        minimumFractionDigits:
          calculation.field === "months" ? 2 : maximumFractionDigits,
        maximumFractionDigits,
      });

      setValues((current) => ({
        ...current,
        [calculation.field]: calculatedInput,
      }));
      setResult(calculation);
    } catch (calculationError) {
      setError(
        calculationError instanceof Error
          ? calculationError.message
          : "Não foi possível realizar o cálculo. Revise os dados.",
      );
    }
  }

  return (
    <section className="workspace calculator-workspace">
      <header className="workspace-header calculator-header">
        <div>
          <div className="eyebrow">
            <span className="live-dot" />
            Ferramenta de apoio
          </div>
          <h1>Calculadora do Cidadão</h1>
          <p>Financiamento com prestações fixas e juros compostos mensais.</p>
        </div>
        <div className="header-actions">
          <div className="header-brand" aria-hidden="true">
            <img src="/imperio-wordmark.png" alt="" />
          </div>
          <a
            className="soft-button official-calculator-link"
            href="https://www3.bcb.gov.br/CALCIDADAO/publico/exibirFormFinanciamentoPrestacoesFixas.do?method=exibirFormFinanciamentoPrestacoesFixas"
            target="_blank"
            rel="noreferrer"
          >
            Abrir versão oficial ↗
          </a>
        </div>
      </header>

      <div className="calculator-content">
        <div className="calculator-intro">
          <span className="calculator-intro-icon">%</span>
          <div>
            <span className="mini-label">COMO UTILIZAR</span>
            <h2>Preencha três campos e deixe um em branco</h2>
            <p>
              O campo vazio será calculado automaticamente. Para estimar a taxa
              de um contrato INSS, informe as parcelas restantes, a prestação e
              o saldo de quitação.
            </p>
          </div>
        </div>

        <div className="calculator-layout">
          <form className="citizen-calculator" onSubmit={submitCalculation}>
            <div className="calculator-form-heading">
              <div>
                <span className="mini-label">SIMULAÇÃO</span>
                <h2>Financiamento com prestações fixas</h2>
              </div>
              <button
                type="button"
                className="example-button"
                onClick={() => {
                  setValues({
                    months: "10",
                    monthlyRate: "",
                    installment: "86,00",
                    financed: "750,00",
                  });
                  setResult(null);
                  setError("");
                }}
              >
                Usar exemplo
              </button>
            </div>

            <div className="calculator-fields">
              {(Object.keys(calculatorFields) as CalculatorField[]).map(
                (field) => {
                  const metadata = calculatorFields[field];
                  const isCalculated = result?.field === field;

                  return (
                    <label
                      className={`calculator-field ${isCalculated ? "calculated" : ""}`}
                      key={field}
                    >
                      <span>
                        <strong>{metadata.label}</strong>
                        {isCalculated && <b>CALCULADO</b>}
                      </span>
                      <small>{metadata.hint}</small>
                      <span className="calculator-input">
                        <input
                          inputMode="decimal"
                          value={values[field]}
                          onChange={(event) => {
                            setValues((current) => ({
                              ...current,
                              [field]: event.target.value,
                            }));
                            setResult(null);
                            setError("");
                          }}
                          placeholder={metadata.placeholder}
                          aria-label={metadata.label}
                        />
                        <span>{metadata.suffix}</span>
                      </span>
                    </label>
                  );
                },
              )}
            </div>

            {error && (
              <div className="calculator-error" role="alert">
                <span>!</span>
                {error}
              </div>
            )}

            <div className="calculator-actions">
              <button
                type="button"
                className="calculator-clear"
                onClick={resetCalculator}
              >
                Limpar
              </button>
              <button className="calculator-submit">Calcular agora</button>
            </div>
          </form>

          <aside className="calculator-result-panel">
            <span className="mini-label">RESULTADO</span>
            {result ? (
              <div className="calculator-result ready">
                <span className="result-check">✓</span>
                <p>{calculatorFields[result.field].label}</p>
                <strong>
                  {formatCitizenResult(result.field, result.value)}
                </strong>
                <small>
                  O valor foi preenchido automaticamente no campo destacado.
                </small>
              </div>
            ) : (
              <div className="calculator-result">
                <span className="result-placeholder">=</span>
                <p>Aguardando cálculo</p>
                <strong>—</strong>
                <small>
                  Deixe apenas o campo desejado em branco e clique em calcular.
                </small>
              </div>
            )}

            <div className="calculator-reference">
              <strong>Uso no extrato INSS</strong>
              <ul>
                <li>Meses: utilize as parcelas restantes.</li>
                <li>Prestação: utilize o valor da parcela.</li>
                <li>Financiado: utilize a quitação ou saldo devedor.</li>
                <li>Deixe a taxa vazia para recalculá-la.</li>
              </ul>
            </div>

            <div className="calculator-warning">
              <span>i</span>
              <p>
                Resultado aproximado para apoio operacional. O saldo oficial da
                portabilidade deve ser confirmado pela CIP.
              </p>
            </div>
          </aside>
        </div>

        <button className="calculator-back" onClick={onBack}>
          ← Voltar ao atendimento
        </button>
      </div>
    </section>
  );
}

export default function Home() {
  const [view, setView] = useState<View>("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [fileName, setFileName] = useState("");
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadMessage, setUploadMessage] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [updatedBanks, setUpdatedBanks] = useState<string[]>([]);
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const ruleUploadRef = useRef<HTMLInputElement>(null);
  const [pendingBank, setPendingBank] = useState<string | null>(null);

  function submitQuestion(event: FormEvent) {
    event.preventDefault();
    const cleanQuestion = question.trim();
    if (!cleanQuestion || isReplying) return;

    const id = Date.now();
    setMessages((current) => [
      ...current,
      { id, role: "user", text: cleanQuestion },
    ]);
    setQuestion("");
    setIsReplying(true);

    window.setTimeout(() => {
      setMessages((current) => [
        ...current,
        {
          id: id + 1,
          role: "assistant",
          text: assistantReply(cleanQuestion, analysis, messages),
        },
      ]);
      setIsReplying(false);
    }, 650);
  }

  function askShortcut(text: string) {
    setQuestion(text);
  }

  async function handleCaseFile(file?: File) {
    if (!file) return;
    if (!file.name.toLocaleLowerCase("pt-BR").endsWith(".pdf")) {
      setUploadState("error");
      setUploadMessage("Envie um arquivo PDF.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setUploadState("error");
      setUploadMessage("O PDF deve ter no máximo 15 MB nesta demonstração.");
      return;
    }

    setFileName(file.name);
    setAnalysis(null);
    setMessages([]);
    setUploadState("reading");
    setUploadMessage("Lendo o extrato e identificando os contratos…");

    try {
      const text = await extractPdfText(file);
      setUploadMessage(
        `Comparando cada contrato com os ${activeRulebookCount} bancos…`,
      );
      const result = analyzeInssExtract(text) as AnalysisResult;
      setAnalysis(result);
      setUploadState("ready");
      setUploadMessage(
        `${result.contracts.length} contrato(s) analisado(s) automaticamente no navegador.`,
      );
      setMessages([
        {
          id: Date.now(),
          role: "assistant",
          text: `Análise concluída. Encontrei ${result.contracts.length} contrato(s) e comparei cada um com os ${activeRulebookCount} bancos INSS. As opções possíveis e os bloqueios estão detalhados abaixo.`,
        },
      ]);
    } catch (error) {
      setAnalysis(null);
      setUploadState("error");
      setUploadMessage(
        error instanceof Error
          ? error.message
          : "Não consegui ler este PDF. Tente gerar um novo extrato INSS.",
      );
    }
  }

  function handleRuleFile(file?: File) {
    if (!file || !pendingBank) return;
    if (!file.name.toLocaleLowerCase("pt-BR").endsWith(".pdf")) return;
    const bank = pendingBank;
    window.setTimeout(() => {
      setUpdatedBanks((current) => [...new Set([...current, bank])]);
      setPendingBank(null);
    }, 600);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img
            className="brand-wordmark"
            src="/imperio-wordmark.png"
            alt="Império Promotora"
          />
        </div>

        <button
          className="new-case"
          onClick={() => {
            setMessages([]);
            setFileName("");
            setUploadState("idle");
            setUploadMessage("");
            setAnalysis(null);
            if (uploadRef.current) uploadRef.current.value = "";
            setView("chat");
          }}
        >
          <span>＋</span>
          Novo atendimento
        </button>

        <nav aria-label="Navegação principal" className="main-nav">
          <button
            className={view === "chat" ? "active" : ""}
            onClick={() => setView("chat")}
          >
            <span className="nav-icon">◫</span>
            Atendimento
            <span className="nav-count">{analysis ? 1 : 0}</span>
          </button>
          <button
            className={view === "rules" ? "active" : ""}
            onClick={() => setView("rules")}
          >
            <span className="nav-icon">≡</span>
            Roteiros
            <span className="nav-count">{rulebooks.length}</span>
          </button>
          <button
            className={view === "calculator" ? "active" : ""}
            onClick={() => setView("calculator")}
          >
            <span className="nav-icon">%</span>
            Calculadora
            <span className="nav-count">BC</span>
          </button>
        </nav>

        <div className="sidebar-section">
          <p>RECENTES</p>
          <button className="recent">
            <span className="recent-dot" />
            <span>
              Base de roteiros
              <small>{activeRulebookCount} bancos INSS ativos</small>
            </span>
          </button>
          <div className="recent-empty">
            {analysis
              ? `${analysis.contracts.length} contrato(s) em análise`
              : "Nenhum atendimento salvo"}
          </div>
        </div>

        <div className="sidebar-profile">
          <div className="avatar">OP</div>
          <div>
            <strong>Operador</strong>
            <span>Ambiente privado</span>
          </div>
          <button aria-label="Mais opções">•••</button>
        </div>
      </aside>

      {view === "chat" ? (
        <section className="workspace">
          <header className="workspace-header">
            <div>
              <div className="eyebrow">
                <span className="live-dot" />
                Assistente operacional
              </div>
              <h1>INSS · Portabilidade</h1>
            </div>
            <div className="header-actions">
              <div className="header-brand" aria-hidden="true">
                <img src="/imperio-wordmark.png" alt="" />
              </div>
              <button className="soft-button" onClick={() => setView("rules")}>
                Base de regras
              </button>
              <button
                className="primary-button"
                onClick={() => uploadRef.current?.click()}
              >
                Anexar extrato
              </button>
            </div>
          </header>

          <div className="demo-banner">
            <span>Leitura automática ativa</span>
            Anexe o extrato: contratos, taxas e possibilidades de portabilidade
            são calculados no próprio navegador.
          </div>

          <div className="chat-layout">
            <section className="conversation" aria-label="Conversa operacional">
              <div className="message assistant-message intro-message">
                <div className="assistant-avatar">
                  <img src="/imperio-lion.png" alt="" />
                </div>
                <div className="message-body">
                  <div className="message-meta">
                    <strong>Império IA</strong>
                    <span>agora</span>
                  </div>
                  <p>
                    Envie um extrato INSS e eu identifico os contratos, recalculo
                    as taxas e comparo cada parcela com os roteiros ativos.
                  </p>
                  <div className="privacy-note">
                    <span>✓</span>
                    Respostas limitadas ao crédito consignado e sempre justificadas
                    por regra.
                  </div>
                </div>
              </div>

              <input
                ref={uploadRef}
                type="file"
                accept=".pdf,application/pdf"
                hidden
                onChange={(event) => {
                  void handleCaseFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
              <button
                className={`upload-card ${uploadState}`}
                onClick={() => uploadRef.current?.click()}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  void handleCaseFile(event.dataTransfer.files[0]);
                }}
              >
                <span className="upload-icon">
                  {uploadState === "reading"
                    ? "…"
                    : uploadState === "ready"
                      ? "✓"
                      : "↑"}
                </span>
                <span>
                  <strong>
                    {fileName || "Arraste o extrato ou escolha o PDF"}
                  </strong>
                  <small>
                    {uploadMessage ||
                      "PDF de até 15 MB · análise local, sem armazenar o arquivo"}
                  </small>
                </span>
                <span className="upload-action">
                  {fileName ? "Trocar" : "Escolher"}
                </span>
              </button>

              {analysis ? (
                <div className="automatic-analysis">
                  <div className="analysis-complete">
                    <span className="analysis-complete-icon">✓</span>
                    <div>
                      <span className="mini-label">ANÁLISE AUTOMÁTICA CONCLUÍDA</span>
                      <h2>
                        {analysis.contracts.length} contrato(s) comparado(s) com
                        {activeRulebookCount} bancos
                      </h2>
                      <p>
                        A classificação abaixo usa os critérios objetivos dos
                        roteiros cadastrados.
                      </p>
                    </div>
                    <span className="local-processing">Processado localmente</span>
                  </div>

                  <div className="analysis-summary">
                    <div>
                      <span className="metric-icon success">✓</span>
                      <span>
                        <strong>
                          {
                            analysis.contracts.filter(
                              (contract) => contract.possible.length > 0,
                            ).length
                          }
                        </strong>
                        contratos com rota
                      </span>
                    </div>
                    <div>
                      <span className="metric-icon info">≡</span>
                      <span>
                        <strong>
                          {analysis.contracts.reduce(
                            (total, contract) =>
                              total + contract.possible.length,
                            0,
                          )}
                        </strong>
                        possibilidades encontradas
                      </span>
                    </div>
                    <div>
                      <span className="metric-icon warning">!</span>
                      <span>
                        <strong>{activeRulebookCount}</strong>
                        roteiros consultados
                      </span>
                    </div>
                  </div>

                  <div className="client-analysis-card">
                    <div>
                      <span>Cliente</span>
                      <strong>{analysis.client.name}</strong>
                      <small>
                        Benefício {maskDocument(analysis.client.benefit)} · CPF{" "}
                        {maskDocument(analysis.client.cpf)}
                      </small>
                    </div>
                    <div>
                      <span>Benefício</span>
                      <strong>
                        {analysis.client.speciesCode} · {analysis.client.species}
                      </strong>
                      <StatusPill
                        kind={
                          analysis.speciesStatus.status === "consignable"
                            ? "approved"
                            : analysis.speciesStatus.status ===
                                "non_consignable"
                              ? "blocked"
                              : "review"
                        }
                      >
                        {analysis.speciesStatus.label}
                      </StatusPill>
                      <small>
                        {analysis.client.ageYears} anos · nascimento{" "}
                        {analysis.client.birthDate}
                      </small>
                      <small>
                        {analysis.client.city || "Cidade não identificada"}
                        {analysis.client.state
                          ? `/${analysis.client.state}`
                          : ""}
                      </small>
                    </div>
                    <div>
                      <span>Margem disponível</span>
                      <strong
                        className={
                          analysis.financial.availableMargin < 0
                            ? "negative-value"
                            : "positive-value"
                        }
                      >
                        {formatMoney(analysis.financial.availableMargin)}
                      </strong>
                      <small>
                        Pagamento: {analysis.banking.bank || "não identificado"}
                      </small>
                    </div>
                  </div>

                  {analysis.speciesStatus.status !== "consignable" && (
                    <div
                      className={`species-alert ${analysis.speciesStatus.status}`}
                    >
                      <strong>
                        Espécie {analysis.speciesStatus.code || "não identificada"}:{" "}
                        {analysis.speciesStatus.label}
                      </strong>
                      <span>{analysis.speciesStatus.reason}</span>
                    </div>
                  )}

                  <div className="analyzed-contracts">
                    {analysis.contracts.map((contract, index) => (
                      <article
                        className="contract-analysis-card"
                        key={`${contract.bankCode}-${contract.contractNumber}`}
                      >
                        <div className="contract-analysis-heading">
                          <div className="contract-number">
                            <span>{index + 1}</span>
                            <div>
                              <small>CONTRATO DE ORIGEM</small>
                              <h3>
                                {contract.bankCode} · {contract.bank}
                              </h3>
                              <p>Nº {contract.contractNumber}</p>
                            </div>
                          </div>
                          <StatusPill
                            kind={
                              contract.possible.length ? "approved" : "review"
                            }
                          >
                            {contract.possible.length
                              ? `${contract.possible.length} possibilidade(s)`
                              : "Requer revisão"}
                          </StatusPill>
                        </div>

                        <div className="contract-metrics">
                          <div>
                            <span>Parcela</span>
                            <strong>{formatMoney(contract.installment)}</strong>
                          </div>
                          <div>
                            <span>Quitação</span>
                            <strong>{formatMoney(contract.payoff)}</strong>
                          </div>
                          <div>
                            <span>Prazo</span>
                            <strong>
                              {String(contract.paid).padStart(2, "0")}/
                              {contract.total}
                            </strong>
                            <small>{contract.remaining} restantes</small>
                          </div>
                          <div>
                            <span>Taxa calculada</span>
                            <strong>
                              {contract.calculatedRate
                                .toFixed(2)
                                .replace(".", ",")}
                              % a.m.
                            </strong>
                            <small>
                              extrato:{" "}
                              {contract.approximateRate
                                .toFixed(2)
                                .replace(".", ",")}
                              %
                            </small>
                          </div>
                        </div>

                        <div className="best-routes">
                          {contract.possible.length ? (
                            <>
                              <div className="best-routes-heading first-choice-heading">
                                <div>
                                  <span className="first-choice-label">
                                    1ª SUGESTÃO · ESCOLHA PRINCIPAL
                                  </span>
                                  <h4>{contract.possible[0].bank}</h4>
                                  <strong className="first-choice-mode">
                                    {contract.possible[0].mode}
                                  </strong>
                                </div>
                                <span className="simulate-first">
                                  SIMULAR PRIMEIRO
                                </span>
                              </div>
                              <p className="first-choice-reason">
                                <span>✓</span>
                                {contract.possible[0].reason}
                              </p>

                              {contract.possible.length > 1 && (
                                <div className="secondary-routes">
                                  <span className="mini-label">
                                    OUTRAS OPÇÕES, EM ORDEM DE PRIORIDADE
                                  </span>
                                  <div className="route-reasons">
                                    {contract.possible
                                      .slice(1, 4)
                                      .map((item, routeIndex) => (
                                        <div key={item.bank}>
                                          <span className="route-check">
                                            {routeIndex + 2}º
                                          </span>
                                          <div>
                                            <strong>
                                              {item.bank} · {item.mode}
                                            </strong>
                                            <small>{item.reason}</small>
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="best-routes-heading">
                              <div>
                                <span className="mini-label">
                                  DESTINOS POSSÍVEIS PELO ROTEIRO
                                </span>
                                <h4>Nenhuma rota automática encontrada</h4>
                              </div>
                              <span>avaliar manualmente</span>
                            </div>
                          )}
                        </div>

                        <details className="bank-comparison">
                          <summary>
                            <span>
                              Comparação completa com os {activeRulebookCount} bancos
                            </span>
                            <small>
                              {contract.possible.length} possíveis ·{" "}
                              {contract.review.length} revisar ·{" "}
                              {contract.blocked.length} bloqueados
                            </small>
                          </summary>
                          <div className="comparison-list">
                            {contract.offers.map((item) => (
                              <div
                                className={`comparison-row ${item.status}`}
                                key={item.bank}
                              >
                                <span className="comparison-status" />
                                <span>
                                  <strong>{item.bank}</strong>
                                  <small>
                                    {item.mode} · roteiro {item.version}
                                  </small>
                                </span>
                                <span className="comparison-reason">
                                  {item.reason}
                                </span>
                                <StatusPill
                                  kind={
                                    item.status === "eligible"
                                      ? "approved"
                                      : item.status
                                  }
                                >
                                  {statusLabel(item.status)}
                                </StatusPill>
                              </div>
                            ))}
                          </div>
                        </details>
                      </article>
                    ))}
                  </div>

                  <div className="source-note">
                    <span>i</span>
                    Resultado de pré-triagem. A condição comercial, o saldo
                    retornado pela CIP e a aprovação final do banco continuam
                    obrigatórios.
                  </div>
                </div>
              ) : (
                <div className="empty-analysis">
                  <div className="empty-analysis-icon">⌁</div>
                  <span className="mini-label">PRONTO PARA ANALISAR</span>
                  <h2>O atendimento começa com um extrato</h2>
                  <p>
                    Selecione o PDF e aguarde: a tela será preenchida
                    automaticamente, sem precisar perguntar ao chat.
                  </p>
                  <div className="empty-steps">
                    <div>
                      <span>1</span>
                      <strong>Extrair</strong>
                      <small>benefício, cliente e contratos</small>
                    </div>
                    <div>
                      <span>2</span>
                      <strong>Calcular</strong>
                      <small>taxa, prazo e saldo restante</small>
                    </div>
                    <div>
                      <span>3</span>
                      <strong>Comparar</strong>
                      <small>
                        cada parcela com os {activeRulebookCount} bancos
                      </small>
                    </div>
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <div
                  className={`message ${
                    message.role === "user"
                      ? "user-message"
                      : "assistant-message"
                  }`}
                  key={message.id}
                >
                  <div
                    className={
                      message.role === "user"
                        ? "user-avatar"
                        : "assistant-avatar"
                    }
                  >
                    {message.role === "user" ? (
                      "OP"
                    ) : (
                      <img src="/imperio-lion.png" alt="" />
                    )}
                  </div>
                  <div className="message-body">
                    <div className="message-meta">
                      <strong>
                        {message.role === "user" ? "Você" : "Império IA"}
                      </strong>
                      <span>agora</span>
                    </div>
                    <p>{message.text}</p>
                  </div>
                </div>
              ))}

              {isReplying && (
                <div className="message assistant-message">
                  <div className="assistant-avatar">
                    <img src="/imperio-lion.png" alt="" />
                  </div>
                  <div className="typing" aria-label="Assistente digitando">
                    <i />
                    <i />
                    <i />
                  </div>
                </div>
              )}
            </section>

            <aside className="context-panel">
              <div className="context-heading">
                <span>Contexto do atendimento</span>
                <button aria-label="Fechar contexto">×</button>
              </div>

              {analysis ? (
                <div className="client-card">
                  <div className="client-top">
                    <div className="client-avatar">
                      {analysis.client.name
                        .split(" ")
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join("")}
                    </div>
                    <div>
                      <strong>{analysis.client.name}</strong>
                      <span>
                        Benefício {maskDocument(analysis.client.benefit)}
                      </span>
                    </div>
                    <StatusPill kind="approved">INSS</StatusPill>
                  </div>
                  <dl>
                    <div>
                      <dt>Espécie</dt>
                      <dd>{analysis.client.speciesCode}</dd>
                    </div>
                    <div>
                      <dt>Idade</dt>
                      <dd>{analysis.client.ageYears} anos</dd>
                    </div>
                    <div>
                      <dt>UF</dt>
                      <dd>{analysis.client.state || "—"}</dd>
                    </div>
                    <div>
                      <dt>Margem</dt>
                      <dd
                        className={
                          analysis.financial.availableMargin < 0
                            ? "negative"
                            : ""
                        }
                      >
                        {formatMoney(analysis.financial.availableMargin)}
                      </dd>
                    </div>
                  </dl>
                </div>
              ) : (
                <div className="context-empty-card">
                  <span>＋</span>
                  <div>
                    <strong>Nenhum extrato carregado</strong>
                    <small>
                      Os dados cadastrais e financeiros aparecerão aqui depois
                      da leitura.
                    </small>
                  </div>
                </div>
              )}

              <div className="context-section">
                <div className="context-title">
                  <span>Roteiros consultados</span>
                  <button onClick={() => setView("rules")}>Gerenciar</button>
                </div>
                <div className="bank-list">
                  {rulebooks
                    .filter((rulebook) => rulebook.status === "active")
                    .map((rulebook) => (
                    <div key={`${rulebook.bank}-${rulebook.scope}`}>
                      <span className={`bank-logo ${rulebook.color}`}>
                        {rulebook.bank.slice(0, 1)}
                      </span>
                      <span>
                        <strong>{rulebook.bank}</strong>
                        <small>Atualizado {rulebook.updated}</small>
                      </span>
                      <span className="checkmark">✓</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="context-section">
                <div className="context-title">
                  <span>Leitura do documento</span>
                </div>
                <div className="extraction-list">
                  <div>
                    <span>Dados cadastrais</span>
                    <b>{analysis ? "Identificados" : "Aguardando"}</b>
                  </div>
                  <div>
                    <span>Dados bancários</span>
                    <b>{analysis ? "Identificados" : "Aguardando"}</b>
                  </div>
                  <div>
                    <span>Dados financeiros</span>
                    <b>{analysis ? "Identificados" : "Aguardando"}</b>
                  </div>
                  <div>
                    <span>Contratos</span>
                    <b>
                      {analysis
                        ? `${analysis.contracts.length} linha(s)`
                        : "Aguardando"}
                    </b>
                  </div>
                </div>
              </div>
            </aside>
          </div>

          <footer className="composer-wrap">
            <div className="prompt-chips">
              <button
                onClick={() =>
                  askShortcut(
                    analysis
                      ? "Onde cada contrato pode ser portado?"
                      : "Quais bancos estão cadastrados?",
                  )
                }
              >
                {analysis
                  ? "Onde cada contrato pode ser portado?"
                  : "Quais bancos estão cadastrados?"}
              </button>
              <button
                onClick={() =>
                  askShortcut(
                    analysis
                      ? "Como a taxa foi calculada?"
                      : "Quem opera margem negativa?",
                  )
                }
              >
                {analysis ? "Como calculou a taxa?" : "Quem opera margem negativa?"}
              </button>
              <button
                onClick={() =>
                  askShortcut(
                    analysis
                      ? "Por que a Facta não opera?"
                      : "Quais roteiros foram adicionados?",
                  )
                }
              >
                {analysis
                  ? "Por que a Facta não opera?"
                  : "Quais roteiros foram adicionados?"}
              </button>
            </div>
            <form className="composer" onSubmit={submitQuestion}>
              <button
                type="button"
                className="attach-button"
                aria-label="Anexar PDF"
                onClick={() => uploadRef.current?.click()}
              >
                ＋
              </button>
              <input
                aria-label="Pergunta operacional"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder={
                  analysis
                    ? "Pergunte sobre esta análise…"
                    : "Pergunte sobre as regras INSS…"
                }
              />
              <span className="scope-label">INSS</span>
              <button
                className="send-button"
                aria-label="Enviar pergunta"
                disabled={!question.trim() || isReplying}
              >
                ↑
              </button>
            </form>
            <p>
              A resposta é uma pré-análise. Confirme a condição comercial antes
              da digitação.
            </p>
          </footer>
        </section>
      ) : view === "calculator" ? (
        <CalculatorView onBack={() => setView("chat")} />
      ) : (
        <section className="workspace rules-workspace">
          <header className="workspace-header rules-header">
            <div>
              <div className="eyebrow">
                <span className="live-dot" />
                Base de conhecimento
              </div>
              <h1>Roteiros operacionais</h1>
              <p>
                Cada banco mantém regras próprias, versão e histórico separados.
              </p>
            </div>
            <div className="header-actions">
              <div className="header-brand" aria-hidden="true">
                <img src="/imperio-wordmark.png" alt="" />
              </div>
              <button
                className="primary-button"
                onClick={() => {
                  setPendingBank("Novo roteiro");
                  ruleUploadRef.current?.click();
                }}
              >
                Adicionar roteiro
              </button>
            </div>
          </header>

          <input
            ref={ruleUploadRef}
            type="file"
            accept=".pdf,application/pdf"
            hidden
            onChange={(event) => handleRuleFile(event.target.files?.[0])}
          />

          <div className="rules-content">
            <div className="rules-overview">
              <div>
                <span>{activeRulebookCount}</span>
                <p>
                  <strong>Bancos INSS ativos</strong>
                  prontos para consulta
                </p>
              </div>
              <div>
                <span>18</span>
                <p>
                  <strong>Novos materiais lidos</strong>
                  regras, fluxos e simulações
                </p>
              </div>
              <div>
                <span>1</span>
                <p>
                  <strong>Próximo convênio</strong>
                  SIAPE separado do INSS
                </p>
              </div>
            </div>

            <div className="rules-toolbar">
              <div>
                <button className="active">Todos</button>
                <button>INSS</button>
                <button>Outros convênios</button>
              </div>
              <span>Última revisão geral: 24 jul 2026</span>
            </div>

            <div className="rulebook-grid">
              {rulebooks.map((rulebook) => {
                const id = `${rulebook.bank}-${rulebook.scope}`;
                const isUpdated = updatedBanks.includes(rulebook.bank);
                const isExpanded = expandedRule === id;
                return (
                  <article className="rulebook-card" key={id}>
                    <div className="rulebook-top">
                      <span className={`rulebook-logo ${rulebook.color}`}>
                        {rulebook.bank.slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <h2>{rulebook.bank}</h2>
                        <p>{rulebook.scope}</p>
                      </div>
                      <StatusPill
                        kind={
                          rulebook.status === "active" ? "approved" : "neutral"
                        }
                      >
                        {rulebook.status === "active" ? "Ativo" : "Catalogado"}
                      </StatusPill>
                    </div>

                    <div className="rulebook-meta">
                      <div>
                        <span>Versão</span>
                        <strong>{rulebook.version}</strong>
                      </div>
                      <div>
                        <span>Atualização</span>
                        <strong>{isUpdated ? "agora" : rulebook.updated}</strong>
                      </div>
                      <div>
                        <span>Critérios</span>
                        <strong>{rulebook.criteria}</strong>
                      </div>
                    </div>

                    <p className="rulebook-description">{rulebook.detail}</p>

                    {isExpanded && rulebook.status === "active" && (
                      <ul className="expanded-rules">
                        <li>Faixa etária e prazo máximo</li>
                        <li>Espécies aceitas e impedidas</li>
                        <li>Saldo, parcela e mínimo pago</li>
                        <li>Bancos de origem e exceções</li>
                        <li>Restrições por UF e município</li>
                        <li>Portabilidade pura ou com refin</li>
                      </ul>
                    )}

                    <div className="rulebook-actions">
                      <button
                        onClick={() =>
                          setExpandedRule(isExpanded ? null : id)
                        }
                      >
                        {isExpanded ? "Ocultar regras" : "Ver regras"}
                      </button>
                      <button
                        className="update-button"
                        onClick={() => {
                          setPendingBank(rulebook.bank);
                          ruleUploadRef.current?.click();
                        }}
                      >
                        {isUpdated ? "PDF atualizado ✓" : "Atualizar PDF"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="governance-note">
              <span className="governance-icon">✓</span>
              <div>
                <strong>Regra nova não entra em produção sozinha</strong>
                <p>
                  O PDF atualizado deve ser comparado com a versão anterior,
                  aprovado por um responsável e só então publicado para o chat.
                </p>
              </div>
              <button onClick={() => setView("chat")}>Voltar ao atendimento</button>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
