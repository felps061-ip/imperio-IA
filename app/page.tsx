"use client";

import { FormEvent, useMemo, useRef, useState } from "react";

type View = "chat" | "rules";
type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  text: string;
};
type UploadState = "idle" | "reading" | "ready" | "error";

type Contract = {
  bank: string;
  code: string;
  payoff: number;
  installment: number;
  paid: number;
  total: number;
  contract: string;
};

const contracts: Contract[] = [
  {
    bank: "Agibank",
    code: "121",
    payoff: 13104.71,
    installment: 337.44,
    paid: 22,
    total: 84,
    contract: "•••• 6280",
  },
  {
    bank: "Cobuccio",
    code: "402",
    payoff: 2637.19,
    installment: 60,
    paid: 3,
    total: 96,
    contract: "•••• 2245",
  },
  {
    bank: "Agibank",
    code: "121",
    payoff: 3318.48,
    installment: 75,
    paid: 17,
    total: 96,
    contract: "•••• 7029",
  },
  {
    bank: "Agibank",
    code: "121",
    payoff: 2027.37,
    installment: 45.82,
    paid: 17,
    total: 96,
    contract: "•••• 7033",
  },
  {
    bank: "Agibank",
    code: "121",
    payoff: 4335.7,
    installment: 97.99,
    paid: 17,
    total: 96,
    contract: "•••• 7028",
  },
  {
    bank: "Agibank",
    code: "121",
    payoff: 3318.48,
    installment: 75,
    paid: 17,
    total: 96,
    contract: "•••• 7032",
  },
  {
    bank: "C6 Consig",
    code: "626",
    payoff: 6774.96,
    installment: 142,
    paid: 3,
    total: 96,
    contract: "•••• 2776",
  },
  {
    bank: "Pan",
    code: "623",
    payoff: 977.89,
    installment: 69.06,
    paid: 68,
    total: 84,
    contract: "•••• 0001",
  },
  {
    bank: "Facta",
    code: "935",
    payoff: 4818.81,
    installment: 101,
    paid: 3,
    total: 96,
    contract: "•••• 3520",
  },
];

const rulebooks = [
  {
    bank: "Quali",
    color: "blue",
    version: "v1.0",
    updated: "06 mai 2026",
    scope: "INSS · Empréstimo",
    rules: 31,
    detail:
      "Saldo, parcelas pagas, bancos de origem, idade final e espécies de invalidez.",
  },
  {
    bank: "Facta",
    color: "green",
    version: "mai/26",
    updated: "05 mai 2026",
    scope: "INSS · Empréstimo",
    rules: 44,
    detail:
      "Mínimo por banco de origem, margem negativa, prazo e limite por idade.",
  },
  {
    bank: "BMG",
    color: "orange",
    version: "19/05",
    updated: "19 mai 2026",
    scope: "INSS · Empréstimo",
    rules: 39,
    detail:
      "Espécies, faixa etária, margem, mínimo pago e confirmação pós-averbação.",
  },
  {
    bank: "PAN",
    color: "cyan",
    version: "117",
    updated: "18 mai 2026",
    scope: "INSS · Empréstimo",
    rules: 36,
    detail:
      "Espécies, idade, prazo, margem negativa e condições de formalização.",
  },
  {
    bank: "Banrisul",
    color: "violet",
    version: "v04",
    updated: "mai 2026",
    scope: "INSS · Empréstimo",
    rules: 28,
    detail:
      "Público, faixa etária, valor máximo, refinanciamento e documentação.",
  },
  {
    bank: "Facta",
    color: "slate",
    version: "26/05",
    updated: "26 mai 2026",
    scope: "SIAPE · Próxima fase",
    rules: 0,
    detail:
      "Documento catalogado e separado do motor INSS para evitar cruzamento de regras.",
  },
];

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function calculateMonthlyRate(
  balance: number,
  installment: number,
  remaining: number,
) {
  if (remaining <= 0 || installment <= 0 || balance <= 0) return 0;
  if (installment * remaining <= balance) return 0;

  let low = 0;
  let high = 0.1;

  for (let index = 0; index < 80; index += 1) {
    const rate = (low + high) / 2;
    const presentValue =
      (installment * (1 - Math.pow(1 + rate, -remaining))) / rate;
    if (presentValue > balance) low = rate;
    else high = rate;
  }

  return ((low + high) / 2) * 100;
}

function getQualiStatus(contract: Contract) {
  if (contract.code === "626") {
    return { kind: "blocked", label: "Não opera", note: "C6 não portado" };
  }
  if (contract.payoff < 2000) {
    return { kind: "blocked", label: "Não opera", note: "Saldo abaixo de R$ 2 mil" };
  }
  if (contract.payoff < 6000 && contract.paid < 15) {
    return { kind: "blocked", label: "Não opera", note: "Exige 15 pagas" };
  }
  return { kind: "approved", label: "Opera", note: "Critérios objetivos atendidos" };
}

function getFactaStatus(contract: Contract) {
  if (contract.code === "935") {
    return { kind: "blocked", label: "Não opera", note: "Carteira própria" };
  }
  const minimumPaid: Record<string, number> = {
    "121": 15,
    "623": 30,
    "626": 12,
  };
  const minimum = minimumPaid[contract.code] ?? 0;
  if (contract.paid < minimum) {
    return {
      kind: "blocked",
      label: "Não opera",
      note: `Exige ${minimum} pagas`,
    };
  }
  if (contract.installment < 50) {
    return {
      kind: "review",
      label: "Revisar",
      note: "Parcela abaixo de R$ 50",
    };
  }
  return { kind: "approved", label: "Opera", note: "Critérios objetivos atendidos" };
}

function bestRoute(contract: Contract) {
  const facta = getFactaStatus(contract);
  const quali = getQualiStatus(contract);
  if (facta.kind === "approved" && quali.kind === "approved") {
    return { kind: "approved", label: "Facta · Quali" };
  }
  if (facta.kind === "approved") return { kind: "approved", label: "Facta" };
  if (quali.kind === "approved") return { kind: "approved", label: "Quali" };
  if (facta.kind === "review") return { kind: "review", label: "Facta · revisar" };
  return { kind: "review", label: "PAN · Banrisul revisar" };
}

function assistantReply(question: string) {
  const normalized = question.toLocaleLowerCase("pt-BR");

  if (normalized.includes("taxa")) {
    return "A taxa foi recalculada pela fórmula financeira, usando quitação, parcela e número de parcelas restantes. No contrato Agibank de R$ 337,44, a taxa calculada é 1,63% a.m. — não usei a taxa aproximada impressa no extrato.";
  }
  if (normalized.includes("c6")) {
    return "O C6 de R$ 142,00 não tem rota automática agora: a Quali não porta banco 626; a Facta exige 12 parcelas pagas e o contrato tem 3; o BMG não aceita a margem negativa atual. PAN e Banrisul ficam em revisão de tabela comercial.";
  }
  if (normalized.includes("bmg")) {
    return "No BMG, idade e espécie passam, e o mínimo geral é 1 parcela paga. Porém, o roteiro não permite portabilidade com margem negativa. Como a margem disponível é -R$ 126,49, a operação fica bloqueada até regularização.";
  }
  if (normalized.includes("quali")) {
    return "Na Quali, cinco contratos Agibank passam: o saldo acima de R$ 6 mil exige 1 paga; entre R$ 2 mil e R$ 5.999,99 exige 15 pagas. C6 é banco não portado e o contrato PAN está abaixo do saldo mínimo.";
  }
  if (normalized.includes("facta")) {
    return "Na Facta, Agibank exige 15 pagas, PAN exige 30 e C6 exige 12. A margem negativa é aceita. Neste caso, seis contratos passam automaticamente e um Agibank de R$ 45,82 fica para revisão por parcela mínima.";
  }
  if (
    normalized.includes("onde") ||
    normalized.includes("opera") ||
    normalized.includes("port")
  ) {
    return "Há rota objetiva para 7 dos 9 contratos: Facta é a opção mais ampla e Quali também recebe 5 contratos Agibank. O C6 está bloqueado pelas regras atuais; o contrato Facta depende de outro destino e de tabela comercial.";
  }

  return "Posso responder sobre elegibilidade, taxa, saldo, prazo, espécie e regras de cada banco. Para manter a análise segura, vou me limitar ao caso carregado e aos roteiros ativos.";
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
  const [updatedBanks, setUpdatedBanks] = useState<string[]>([]);
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const ruleUploadRef = useRef<HTMLInputElement>(null);
  const [pendingBank, setPendingBank] = useState<string | null>(null);

  const enrichedContracts = useMemo(
    () =>
      contracts.map((contract) => ({
        ...contract,
        remaining: contract.total - contract.paid,
        rate: calculateMonthlyRate(
          contract.payoff,
          contract.installment,
          contract.total - contract.paid,
        ),
        route: bestRoute(contract),
      })),
    [],
  );

  const approvedCount = enrichedContracts.filter(
    (contract) => contract.route.kind === "approved",
  ).length;

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
          text: assistantReply(cleanQuestion),
        },
      ]);
      setIsReplying(false);
    }, 650);
  }

  function askShortcut(text: string) {
    setQuestion(text);
  }

  function handleCaseFile(file?: File) {
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
    setUploadState("reading");
    setUploadMessage("Preparando o caso e protegendo os dados exibidos…");

    window.setTimeout(() => {
      setUploadState("ready");
      setUploadMessage(
        "Arquivo associado ao caso demonstrativo. Nenhum dado foi armazenado.",
      );
    }, 1100);
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
            <span className="nav-count">1</span>
          </button>
          <button
            className={view === "rules" ? "active" : ""}
            onClick={() => setView("rules")}
          >
            <span className="nav-icon">≡</span>
            Roteiros
            <span className="nav-count">6</span>
          </button>
        </nav>

        <div className="sidebar-section">
          <p>RECENTES</p>
          <button className="recent active">
            <span className="recent-dot" />
            <span>
              Caso INSS · demonstração
              <small>Espécie 42 · 9 contratos</small>
            </span>
          </button>
          <button className="recent">
            <span className="recent-dot muted" />
            <span>
              Base de roteiros
              <small>5 bancos INSS ativos</small>
            </span>
          </button>
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
            <span>Prévia funcional</span>
            O cálculo e o motor de regras estão ativos. A leitura automática de
            novos PDFs será conectada à IA na etapa de produção.
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

              <button
                className={`upload-card ${uploadState}`}
                onClick={() => uploadRef.current?.click()}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  handleCaseFile(event.dataTransfer.files[0]);
                }}
              >
                <input
                  ref={uploadRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  hidden
                  onChange={(event) => handleCaseFile(event.target.files?.[0])}
                />
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
                      "PDF de até 15 MB · os dados do exemplo são anonimizados"}
                  </small>
                </span>
                <span className="upload-action">
                  {fileName ? "Trocar" : "Escolher"}
                </span>
              </button>

              <div className="case-divider">
                <span>Caso demonstrativo · dados protegidos</span>
              </div>

              <div className="message assistant-message">
                <div className="assistant-avatar">I</div>
                <div className="message-body wide">
                  <div className="message-meta">
                    <strong>Império IA</strong>
                    <span>análise concluída</span>
                  </div>
                  <p>
                    Identifiquei <strong>9 contratos</strong>. Há rota objetiva
                    para <strong>{approvedCount}</strong> deles nas regras atuais.
                    A Facta é o destino mais amplo; a Quali recebe cinco contratos
                    Agibank.
                  </p>

                  <div className="analysis-summary">
                    <div>
                      <span className="metric-icon success">✓</span>
                      <span>
                        <strong>7</strong>
                        com rota possível
                      </span>
                    </div>
                    <div>
                      <span className="metric-icon warning">!</span>
                      <span>
                        <strong>2</strong>
                        precisa revisar
                      </span>
                    </div>
                    <div>
                      <span className="metric-icon info">≡</span>
                      <span>
                        <strong>5</strong>
                        roteiros ativos
                      </span>
                    </div>
                  </div>

                  <div className="result-card">
                    <div className="result-card-header">
                      <div>
                        <span className="mini-label">MELHOR ROTA</span>
                        <h2>Facta · 6 operações automáticas</h2>
                      </div>
                      <StatusPill kind="approved">Margem negativa aceita</StatusPill>
                    </div>
                    <ul className="rule-checks">
                      <li>
                        <span>✓</span>
                        Agibank com 15 ou mais parcelas pagas
                      </li>
                      <li>
                        <span>✓</span>
                        PAN com 68 pagas supera o mínimo de 30
                      </li>
                      <li className="warning">
                        <span>!</span>
                        Parcela de R$ 45,82 requer revisão do mínimo
                      </li>
                    </ul>
                  </div>

                  <div className="contracts-block">
                    <div className="block-heading">
                      <h3>Contrato a contrato</h3>
                      <span>taxa recalculada</span>
                    </div>
                    <div className="contracts-table">
                      <div className="contract-row contract-head">
                        <span>Origem · contrato</span>
                        <span>Parcela</span>
                        <span>Prazo</span>
                        <span>Taxa</span>
                        <span>Rota</span>
                      </div>
                      {enrichedContracts.map((contract) => (
                        <div
                          className="contract-row"
                          key={`${contract.bank}-${contract.contract}`}
                        >
                          <span className="bank-cell">
                            <b>{contract.bank}</b>
                            <small>{contract.contract}</small>
                          </span>
                          <span>{money.format(contract.installment)}</span>
                          <span>
                            {contract.paid}/{contract.total}
                          </span>
                          <span>{contract.rate.toFixed(2).replace(".", ",")}%</span>
                          <span>
                            <StatusPill kind={contract.route.kind}>
                              {contract.route.label}
                            </StatusPill>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="source-note">
                    <span>i</span>
                    Pré-triagem baseada nos roteiros enviados. Saldo CIP, tabela
                    comercial e aprovação do banco continuam obrigatórios.
                  </div>
                </div>
              </div>

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
                <span>Contexto da análise</span>
                <button aria-label="Fechar contexto">×</button>
              </div>

              <div className="client-card">
                <div className="client-top">
                  <div className="client-avatar">LC</div>
                  <div>
                    <strong>Cliente anonimizado</strong>
                    <span>Benefício •••.•••.585-3</span>
                  </div>
                  <StatusPill kind="approved">INSS</StatusPill>
                </div>
                <dl>
                  <div>
                    <dt>Espécie</dt>
                    <dd>42 · Tempo de contribuição</dd>
                  </div>
                  <div>
                    <dt>Idade</dt>
                    <dd>68 anos</dd>
                  </div>
                  <div>
                    <dt>UF</dt>
                    <dd>SP</dd>
                  </div>
                  <div>
                    <dt>Margem</dt>
                    <dd className="negative">-R$ 126,49</dd>
                  </div>
                </dl>
              </div>

              <div className="context-section">
                <div className="context-title">
                  <span>Roteiros consultados</span>
                  <button onClick={() => setView("rules")}>Gerenciar</button>
                </div>
                <div className="bank-list">
                  {rulebooks.slice(0, 5).map((rulebook) => (
                    <div key={rulebook.bank}>
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
                    <b>8 campos</b>
                  </div>
                  <div>
                    <span>Dados bancários</span>
                    <b>4 campos</b>
                  </div>
                  <div>
                    <span>Dados financeiros</span>
                    <b>6 campos</b>
                  </div>
                  <div>
                    <span>Contratos</span>
                    <b>9 linhas</b>
                  </div>
                </div>
              </div>
            </aside>
          </div>

          <footer className="composer-wrap">
            <div className="prompt-chips">
              <button onClick={() => askShortcut("Onde cada parcela opera?")}>
                Onde cada parcela opera?
              </button>
              <button onClick={() => askShortcut("Por que o C6 não opera?")}>
                Por que o C6 não opera?
              </button>
              <button onClick={() => askShortcut("Como a taxa foi calculada?")}>
                Como calculou a taxa?
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
                aria-label="Pergunta sobre o caso"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Pergunte sobre este caso…"
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
                <span>5</span>
                <p>
                  <strong>Bancos INSS ativos</strong>
                  prontos para consulta
                </p>
              </div>
              <div>
                <span>178</span>
                <p>
                  <strong>Regras catalogadas</strong>
                  com origem rastreável
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
                        kind={rulebook.rules > 0 ? "approved" : "neutral"}
                      >
                        {rulebook.rules > 0 ? "Ativo" : "Catalogado"}
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
                        <span>Regras</span>
                        <strong>{rulebook.rules || "—"}</strong>
                      </div>
                    </div>

                    <p className="rulebook-description">{rulebook.detail}</p>

                    {isExpanded && rulebook.rules > 0 && (
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
