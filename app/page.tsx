"use client";

import { FormEvent, useRef, useState } from "react";

type View = "chat" | "rules";
type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  text: string;
};
type UploadState = "idle" | "reading" | "ready" | "error";

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

function assistantReply(question: string) {
  const normalized = question.toLocaleLowerCase("pt-BR");

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
    return "Quando a leitura automática estiver conectada, a taxa será recalculada com parcela, saldo de quitação e parcelas restantes. A taxa aproximada impressa no extrato será mantida apenas como referência.";
  }

  return "Posso explicar as regras dos 12 bancos INSS cadastrados — idade, espécie, prazo, saldo, parcelas pagas, margem e portabilidade. Para analisar um cliente, comece anexando o extrato em PDF.";
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
    setUploadMessage("Preparando o documento no navegador…");

    window.setTimeout(() => {
      setUploadState("ready");
      setUploadMessage(
        "PDF selecionado. A extração automática será conectada ao módulo de IA.",
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
            <span className="nav-count">0</span>
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
            Nenhum atendimento salvo
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
            <span>Base atualizada</span>
            12 bancos INSS estão catalogados. A leitura automática de novos
            extratos será conectada ao módulo de IA na etapa de produção.
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
                      "PDF de até 15 MB · o arquivo não é enviado nesta prévia"}
                  </small>
                </span>
                <span className="upload-action">
                  {fileName ? "Trocar" : "Escolher"}
                </span>
              </button>

              <div className="empty-analysis">
                <div className="empty-analysis-icon">⌁</div>
                <span className="mini-label">NENHUM CLIENTE CARREGADO</span>
                <h2>O atendimento começa com um extrato</h2>
                <p>
                  Assim que a leitura automática for conectada, a análise seguirá
                  três etapas rastreáveis:
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

              <div className="context-empty-card">
                <span>＋</span>
                <div>
                  <strong>Nenhum extrato carregado</strong>
                  <small>
                    Os dados cadastrais e financeiros aparecerão aqui depois da
                    leitura.
                  </small>
                </div>
              </div>

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
                    <b>Aguardando</b>
                  </div>
                  <div>
                    <span>Dados bancários</span>
                    <b>Aguardando</b>
                  </div>
                  <div>
                    <span>Dados financeiros</span>
                    <b>Aguardando</b>
                  </div>
                  <div>
                    <span>Contratos</span>
                    <b>Aguardando</b>
                  </div>
                </div>
              </div>
            </aside>
          </div>

          <footer className="composer-wrap">
            <div className="prompt-chips">
              <button onClick={() => askShortcut("Quais bancos estão cadastrados?")}>
                Quais bancos estão cadastrados?
              </button>
              <button onClick={() => askShortcut("Quem opera margem negativa?")}>
                Quem opera margem negativa?
              </button>
              <button onClick={() => askShortcut("Quais roteiros foram adicionados?")}>
                Quais roteiros foram adicionados?
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
                placeholder="Pergunte sobre as regras INSS…"
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
