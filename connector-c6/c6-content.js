const SELECTORS = {
  user: "#EUsuario_CAMPO",
  password: "#ESenha_CAMPO",
  enter: "#lnkEntrar",
  cadastro: "#navbar-collapse-funcao > ul > li:nth-child(1) > a",
  proposal: "#WFP2010_PWCDPRPS",
  operation:
    "#ctl00_Cph_UcPrp_FIJN1_JnDadosIniciais_UcDIni_cboTipoOperacao_CAMPO",
  product:
    "#ctl00_Cph_UcPrp_FIJN1_JnDadosIniciais_UcDIni_cboTipoProduto_CAMPO",
  agreement:
    "#ctl00_Cph_UcPrp_FIJN1_JnDadosIniciais_UcDIni_cboGrupoConvenio_CAMPO",
  digital:
    "#ctl00_Cph_UcPrp_FIJN1_JnDadosIniciais_UcDIni_rblTpFormalizacao_1",
  cpf: "#ctl00_Cph_UcPrp_FIJN1_JnDadosIniciais_UcDIni_txtCPF_CAMPO",
  registration: "#ctl00_cph_FIJanela1_FIJanelaPanel1_grvHomo_ctl02_lnkCodigo",
  getMargin: "#btnObterMargem_txt",
  updateContracts: "#btAtuListaContratos_txt",
  contractCheckbox: "input[type='checkbox'][id$='_chkRefin']",
  installmentLabel: "[id$='_lblValorParcela']",
  installment:
    "#ctl00_Cph_UcPrp_FIJN1_JnSimulacao_UcSimulacaoSnt_FIJanela1_FIJanelaPanel1_txtVlrParcela_CAMPO",
  calculate: "#btnCalcular_txt",
  term:
    "#ctl00_Cph_UcPrp_FIJN1_JnSimulacao_UcSimulacaoSnt_FIJanela1_FIJanelaPanel1_cbxPrazo_CAMPO",
  results:
    "#ctl00_Cph_UcPrp_FIJN1_JnSimulacao_UcSimulacaoSnt_FIJanela1_FIJanelaPanel1_grdCondicoes",
};

let runningStage = "";

const sleep = (milliseconds) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

function activateDialogHooks() {
  window.dispatchEvent(
    new CustomEvent("imperio-c6-automation", { detail: { active: true } }),
  );
}

function fillInput(element, value) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;
  setter?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function selectByText(selector, text) {
  const wanted = normalize(text);
  const preferred = document.querySelector(selector);
  const candidates = [
    preferred,
    ...document.querySelectorAll("select"),
  ].filter((item, index, all) => item && all.indexOf(item) === index);
  const select = candidates.find((candidate) =>
    [...candidate.options].some((option) =>
      normalize(option.textContent).includes(wanted),
    ),
  );
  if (!select) return false;
  const option = [...select.options].find((item) =>
    normalize(item.textContent).includes(wanted),
  );
  select.value = option.value;
  select.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

async function waitFor(selector, timeout = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const element = document.querySelector(selector);
    if (element) return element;
    await sleep(250);
  }
  return null;
}

async function setStage(stage, message, parcel) {
  const response = await chrome.runtime.sendMessage({
    type: "IMPERIO_C6_SET_STAGE",
    stage,
    message,
    parcel,
  });
  return response?.job;
}

function reportError(message) {
  chrome.runtime.sendMessage({ type: "IMPERIO_C6_ERROR", message });
}

async function resumeSoon() {
  await sleep(2600);
  runningStage = "";
  await chrome.runtime.sendMessage({ type: "IMPERIO_C6_PAGE_READY" });
}

function readInstallment() {
  const checked =
    document.querySelector(`${SELECTORS.contractCheckbox}:checked`) ||
    document.querySelector(SELECTORS.contractCheckbox);
  const row = checked?.closest("tr");
  return (
    row?.querySelector(SELECTORS.installmentLabel)?.textContent?.trim() ||
    document.querySelector(SELECTORS.installmentLabel)?.textContent?.trim() ||
    ""
  );
}

function parseResults() {
  const table = document.querySelector(SELECTORS.results);
  if (!table) return [];
  const rows = [...table.querySelectorAll("tr")];
  if (rows.length < 2) return [];

  const headers = [...rows[0].querySelectorAll("th,td")].map((cell) =>
    normalize(cell.textContent),
  );
  const indexFor = (...aliases) =>
    headers.findIndex((header) =>
      aliases.some((alias) => header.includes(normalize(alias))),
    );
  const indexes = {
    table: indexFor("tabela"),
    description: indexFor("descrição tabela", "descricao tabela"),
    monthlyRate: indexFor("tx. jr", "taxa"),
    installment: indexFor("vlr parc", "valor parcela"),
    clientValue: indexFor("vlr cli", "valor cliente"),
  };
  const termElement = document.querySelector(SELECTORS.term);
  const term =
    termElement?.selectedOptions?.[0]?.textContent?.trim() ||
    termElement?.value ||
    "108";

  const valueAt = (cells, index) =>
    index >= 0 ? cells[index]?.textContent?.trim() || "" : "";

  return rows
    .slice(1)
    .map((row) => {
      const cells = [...row.querySelectorAll("td")];
      return {
        table: valueAt(cells, indexes.table),
        description: valueAt(cells, indexes.description),
        monthlyRate: valueAt(cells, indexes.monthlyRate),
        installment: valueAt(cells, indexes.installment),
        clientValue: valueAt(cells, indexes.clientValue),
        term,
      };
    })
    .filter(
      (row) =>
        !normalize(Object.values(row).join(" ")).includes(
          "nao existem dados para exibicao",
        ) &&
        Object.values(row).some(Boolean),
    );
}

async function runJob(job, credentials) {
  if (!job || runningStage === `${job.id}:${job.stage}`) return;
  runningStage = `${job.id}:${job.stage}`;
  activateDialogHooks();

  if (document.querySelector(SELECTORS.user)) {
    if (!credentials?.user || !credentials?.password) {
      reportError("Configure o usuário e a senha do C6 no conector.");
      return;
    }
    await setStage("menu", "Entrando no portal C6…");
    fillInput(document.querySelector(SELECTORS.user), credentials.user);
    fillInput(document.querySelector(SELECTORS.password), credentials.password);
    document.querySelector(SELECTORS.enter)?.click();
    return;
  }

  if (document.querySelector(SELECTORS.operation)) {
    if (job.stage === "open" || job.stage === "menu") job.stage = "operation";

    if (job.stage === "operation") {
      await setStage("product", "Selecionando refinanciamento…");
      if (!selectByText(SELECTORS.operation, "Refinanciamento")) {
        reportError("O tipo de operação Refinanciamento não apareceu no C6.");
        return;
      }
      await resumeSoon();
      return;
    }

    if (job.stage === "product") {
      await setStage("agreement", "Selecionando Refinanciamento de Carteira…");
      if (!selectByText(SELECTORS.product, "Refinanciamento de Carteira")) {
        reportError("O produto Refinanciamento de Carteira não apareceu no C6.");
        return;
      }
      await resumeSoon();
      return;
    }

    if (job.stage === "agreement") {
      await setStage("formalization", "Selecionando o convênio INSS…");
      if (!selectByText(SELECTORS.agreement, "INSS")) {
        reportError("O grupo de convênio INSS não apareceu no C6.");
        return;
      }
      await resumeSoon();
      return;
    }

    if (job.stage === "formalization") {
      const digital = await waitFor(SELECTORS.digital);
      if (!digital) {
        reportError("A opção de formalização Digital não apareceu no C6.");
        return;
      }
      await setStage("cpf", "Ativando a formalização digital…");
      if (!digital.checked) digital.click();
      await resumeSoon();
      return;
    }

    if (job.stage === "cpf") {
      const cpf = await waitFor(SELECTORS.cpf);
      if (!cpf) {
        reportError("O campo CPF não apareceu na proposta do C6.");
        return;
      }
      await setStage("registration", "Localizando a matrícula do cliente…");
      fillInput(cpf, job.cpf);
      cpf.blur();
      await resumeSoon();
      return;
    }

    if (job.stage === "registration") {
      const registration = await waitFor(SELECTORS.registration);
      if (!registration) {
        reportError(
          "Nenhuma matrícula foi apresentada para este CPF ou a janela do C6 mudou.",
        );
        return;
      }
      await setStage("margin", "Selecionando a matrícula do cliente…");
      registration.click();
      await resumeSoon();
      return;
    }

    if (job.stage === "margin") {
      const margin = await waitFor(SELECTORS.getMargin);
      if (!margin) {
        reportError("O botão Obter Margem não foi liberado pelo C6.");
        return;
      }
      await setStage("contracts", "Consultando a margem no C6…");
      margin.click();
      await resumeSoon();
      return;
    }

    if (job.stage === "contracts") {
      const update = await waitFor(SELECTORS.updateContracts);
      if (!update) {
        reportError("O botão Atualizar Lista de Contratos não apareceu no C6.");
        return;
      }
      await setStage("select_contract", "Atualizando os contratos C6…");
      update.click();
      await resumeSoon();
      return;
    }

    if (job.stage === "select_contract") {
      const checkbox = await waitFor(SELECTORS.contractCheckbox);
      if (!checkbox) {
        reportError("Nenhum contrato C6 elegível para refinanciamento foi encontrado.");
        return;
      }
      const parcel = readInstallment();
      await setStage("installment", "Preparando a parcela do contrato…", parcel);
      if (!checkbox.checked) checkbox.click();
      await resumeSoon();
      return;
    }

    if (job.stage === "installment") {
      const input = await waitFor(SELECTORS.installment);
      const parcel = job.parcel || readInstallment();
      if (!input || !parcel) {
        reportError("O C6 não disponibilizou o valor da parcela para simulação.");
        return;
      }
      await setStage("calculate", "Informando a parcela no simulador…", parcel);
      if (input.disabled) input.disabled = false;
      fillInput(input, parcel);
      await resumeSoon();
      return;
    }

    if (job.stage === "calculate") {
      const calculate = await waitFor(SELECTORS.calculate);
      if (!calculate) {
        reportError("O botão Calcular não apareceu no simulador do C6.");
        return;
      }
      await setStage("results", "Calculando as condições do refinanciamento…");
      calculate.click();
      await resumeSoon();
      return;
    }

    if (job.stage === "results") {
      const table = await waitFor(SELECTORS.results, 25000);
      const offers = table ? parseResults() : [];
      if (!offers.length) {
        reportError("O C6 não retornou condições disponíveis para este contrato.");
        return;
      }
      await chrome.runtime.sendMessage({
        type: "IMPERIO_C6_COMPLETE",
        offers,
      });
    }
    return;
  }

  const cadastro = document.querySelector(SELECTORS.cadastro);
  if (cadastro) {
    cadastro.click();
    await sleep(500);
    const proposal = document.querySelector(SELECTORS.proposal);
    if (!proposal) {
      reportError(
        "Este usuário do C6 não possui a permissão Cadastro > Proposta Consignado. Solicite a liberação do perfil e tente novamente.",
      );
      return;
    }
    await setStage("operation", "Abrindo Proposta Consignado…");
    proposal.click();
    return;
  }

  reportError("O conector não reconheceu esta página do portal C6.");
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "IMPERIO_C6_RUN_JOB") {
    runJob(message.job, message.credentials).catch((error) =>
      reportError(error instanceof Error ? error.message : String(error)),
    );
  }
});

chrome.runtime.sendMessage({ type: "IMPERIO_C6_PAGE_READY" });
