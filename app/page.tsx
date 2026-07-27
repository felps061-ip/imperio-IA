"use client";

import { FormEvent, useRef, useState } from "react";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.mjs?url";

import {
  analyzeInssExtract,
  formatMoney,
  maskDocument,
} from "@/lib/inss-extrato.mjs";

type View = "chat" | "rules";
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
    version: "mai/26",
    updated: "05 mai 2026",
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
    version: "v04",
    updated: "mai 2026",
    scope: "INSS · Empréstimo",
    status: "active",
    criteria: "Idade · valor · produto",
    detail:
      "Público, faixa etária, valor máximo, refinanciamento e documentação.",
  },
  {
    bank: "iCred",
    color: "lime",
    version: "V20",
    updated: "09 mar 2026",
    scope: "INSS · Empréstimo",
    status: "active",
    criteria: "Idade · benefício · produto",
    detail:
      "Prazo de até 96 meses, política etária, espécies, margem e regras de portabilidade.",
  },
  {
    bank: "Finanto",
    color: "emerald",
    version: "23/03",
    updated: "23 mar 2026",
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
    version: "V70.0",
    updated: "18 fev 2026",
    scope: "INSS · Empréstimo",
    status: "active",
    criteria: "Idade · invalidez · CIP",
    detail:
      "Prazo de até 96 meses, idade, invalidez, portabilidade e saldo devedor via CIP.",
  },
  {
    bank: "C6 Bank",
    color: "black",
    version: "jul/25",
    updated: "jul 2025",
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

function statusLabel(status: OfferStatus) {
  if (status === "eligible") return "Possível";
  if (status === "review") return "Revisar";
  return "Não opera";
}

async function extractPdfText(file: File) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pageTexts: string[] = [];

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

  await pdf.destroy();
  return pageTexts.join("\n");
}

function assistantReply(question: string, analysis: AnalysisResult | null) {
  const normalized = question.toLocaleLowerCase("pt-BR");
  const mentionedBank = analysis
    ? rulebooks
        .filter((rulebook) => rulebook.status === "active")
        .find((rulebook) =>
          normalized.includes(rulebook.bank.toLocaleLowerCase("pt-BR")),
        )
    : undefined;

  if (analysis && mentionedBank) {
    const decisions = analysis.contracts.slice(0, 4).map((contract) => {
      const decision = contract.offers.find(
        (item) => item.bank === mentionedBank.bank,
      );
      return `${contract.bank} ${formatMoney(contract.installment)}: ${statusLabel(decision?.status ?? "review")} - ${decision?.reason ?? "exige revisão"}`;
    });
    return decisions.join(" | ");
  }

  if (analysis && normalized.includes("espécie")) {
    return `A espécie ${analysis.speciesStatus.code || "não identificada"} está classificada como ${analysis.speciesStatus.label.toLocaleLowerCase("pt-BR")}. ${analysis.speciesStatus.reason} A aceitação final ainda varia conforme o roteiro de cada banco.`;
  }

  if (
    analysis &&
    (normalized.includes("onde") ||
      normalized.includes("porta") ||
      normalized.includes("opera"))
  ) {
    if (analysis.contracts.length === 1) {
      const contract = analysis.contracts[0];
      const banks = contract.possible.map((item) => item.bank).join(", ");
      return `Para a parcela de ${formatMoney(contract.installment)} do ${contract.bank}, encontrei ${contract.possible.length} rotas possíveis pelo roteiro: ${banks}. Abra “Comparação completa” para ver também os bloqueios e seus motivos.`;
    }

    const withRoute = analysis.contracts.filter(
      (contract) => contract.possible.length > 0,
    ).length;
    return `Analisei ${analysis.contracts.length} contratos e ${withRoute} têm pelo menos uma rota possível. Cada cartão mostra os destinos classificados e a justificativa por banco.`;
  }

  if (analysis && normalized.includes("taxa")) {
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
    normalized.includes("bancos") ||
    normalized.includes("cadastrados") ||
    normalized.includes("roteiros")
  ) {
    return "A base INSS tem 12 bancos ativos: Quali, Facta, BMG, PAN, Banrisul, iCred, Finanto, Digio, Daycoval, C6 Bank, BRB e Happy. O roteiro SIAPE da Facta está catalogado separadamente para a próxima fase.";
  }
  if (
    normalized.includes("novos") ||
    normalized.includes("adicionados") ||
    normalized.includes("chegaram")
  ) {
    return "Foram adicionados sete roteiros INSS, cada um com sua própria versão: iCred V20, Finanto 23/03, Digio V21, Daycoval V70.0, C6 jul/25, BRB jan/26 e Happy V03.";
  }
  if (normalized.includes("margem negativa")) {
    return "A margem negativa varia por produto e banco. Nos novos roteiros, a Finanto informa que não opera; o iCred permite tratamento apenas em condições específicas de refinanciamento ou portabilidade; e o Daycoval prevê abatimento somente no refinanciamento. A decisão final ainda depende da operação e da versão vigente.";
  }
  if (normalized.includes("taxa")) {
    return "A taxa é recalculada com parcela, saldo de quitação e parcelas restantes. A taxa aproximada impressa no extrato fica apenas como referência.";
  }

  return analysis
    ? "A análise já está pronta. Pergunte onde cada contrato pode ser portado, por que um banco bloqueou ou como a taxa foi calculada."
    : "Posso explicar as regras dos 12 bancos INSS cadastrados. Para analisar um cliente automaticamente, anexe o extrato em PDF.";
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
          text: assistantReply(cleanQuestion, analysis),
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
      setUploadMessage("Comparando cada contrato com os 12 bancos…");
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
          text: `Análise concluída. Encontrei ${result.contracts.length} contrato(s) e comparei cada um com os 12 bancos INSS. As opções possíveis e os bloqueios estão detalhados abaixo.`,
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
          <div className="brand-mark">I</div>
          <div>
            <strong>Império IA</strong>
            <span>Mesa consignado</span>
          </div>
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
            <span className="nav-count">13</span>
          </button>
        </nav>

        <div className="sidebar-section">
          <p>RECENTES</p>
          <button className="recent">
            <span className="recent-dot" />
            <span>
              Base de roteiros
              <small>12 bancos INSS ativos</small>
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
                <div className="assistant-avatar">I</div>
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
                        12 bancos
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
                        <strong>12</strong>
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
                          <div className="best-routes-heading">
                            <div>
                              <span className="mini-label">
                                DESTINOS POSSÍVEIS PELO ROTEIRO
                              </span>
                              <h4>
                                {contract.possible.length
                                  ? contract.possible
                                      .map((item) => item.bank)
                                      .join(" · ")
                                  : "Nenhuma rota automática encontrada"}
                              </h4>
                            </div>
                            <span>
                              {contract.possible.length
                                ? "seguir para simulação"
                                : "avaliar manualmente"}
                            </span>
                          </div>

                          {contract.possible.length > 0 && (
                            <div className="route-reasons">
                              {contract.possible.slice(0, 3).map((item) => (
                                <div key={item.bank}>
                                  <span className="route-check">✓</span>
                                  <div>
                                    <strong>
                                      {item.bank} · {item.mode}
                                    </strong>
                                    <small>{item.reason}</small>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <details className="bank-comparison">
                          <summary>
                            <span>Comparação completa com os 12 bancos</span>
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
                      <small>cada parcela com os 12 bancos</small>
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
                    {message.role === "user" ? "OP" : "I"}
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
                  <div className="assistant-avatar">I</div>
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
            <button
              className="primary-button"
              onClick={() => {
                setPendingBank("Novo roteiro");
                ruleUploadRef.current?.click();
              }}
            >
              Adicionar roteiro
            </button>
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
                <span>12</span>
                <p>
                  <strong>Bancos INSS ativos</strong>
                  prontos para consulta
                </p>
              </div>
              <div>
                <span>12</span>
                <p>
                  <strong>Bases versionadas</strong>
                  sem misturar os bancos
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
