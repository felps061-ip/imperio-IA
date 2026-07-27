import {
  buildPostBody,
  controlName,
  findIdEnding,
  hrefById,
  inputDetails,
  parseC6Offers,
  postbackTargetForId,
  textById,
} from "./c6-webforms.mjs";
import { formatCpf, validateCpf } from "./c6-refin.mjs";

const BASE_URL = "https://c6.c6consig.com.br";
const LOGIN_URL = `${BASE_URL}/WebAutorizador/Login/AC.UI.LOGIN.aspx`;

const IDS = {
  proposal: "WFP2010_PWCDPRPS",
  operation:
    "ctl00_Cph_UcPrp_FIJN1_JnDadosIniciais_UcDIni_cboTipoOperacao_CAMPO",
  product:
    "ctl00_Cph_UcPrp_FIJN1_JnDadosIniciais_UcDIni_cboTipoProduto_CAMPO",
  agreement:
    "ctl00_Cph_UcPrp_FIJN1_JnDadosIniciais_UcDIni_cboGrupoConvenio_CAMPO",
  digital:
    "ctl00_Cph_UcPrp_FIJN1_JnDadosIniciais_UcDIni_rblTpFormalizacao_1",
  cpf: "ctl00_Cph_UcPrp_FIJN1_JnDadosIniciais_UcDIni_txtCPF_CAMPO",
  registration: "ctl00_cph_FIJanela1_FIJanelaPanel1_grvHomo_ctl02_lnkCodigo",
  getMargin: "btnObterMargem_txt",
  updateContracts: "btAtuListaContratos_txt",
  installment:
    "ctl00_Cph_UcPrp_FIJN1_JnSimulacao_UcSimulacaoSnt_FIJanela1_FIJanelaPanel1_txtVlrParcela_CAMPO",
  calculate: "btnCalcular_txt",
  term:
    "ctl00_Cph_UcPrp_FIJN1_JnSimulacao_UcSimulacaoSnt_FIJanela1_FIJanelaPanel1_cbxPrazo_CAMPO",
  results:
    "ctl00_Cph_UcPrp_FIJN1_JnSimulacao_UcSimulacaoSnt_FIJanela1_FIJanelaPanel1_grdCondicoes",
};

export class C6SimulationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "C6SimulationError";
    this.code = code;
  }
}

function splitSetCookie(value) {
  if (!value) return [];
  return value.split(/,(?=\s*[^;,=\s]+=[^;,]+)/g);
}

class C6HttpSession {
  constructor(fetchImplementation = fetch) {
    this.fetchImplementation = fetchImplementation;
    this.cookies = new Map();
  }

  ingestCookies(response) {
    const headers = response.headers;
    const values =
      typeof headers.getSetCookie === "function"
        ? headers.getSetCookie()
        : splitSetCookie(headers.get("set-cookie"));
    for (const cookie of values) {
      const pair = String(cookie).split(";", 1)[0];
      const separator = pair.indexOf("=");
      if (separator <= 0) continue;
      this.cookies.set(pair.slice(0, separator).trim(), pair.slice(separator + 1));
    }
  }

  cookieHeader() {
    return [...this.cookies.entries()]
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }

  async request(url, init = {}) {
    let currentUrl = new URL(url, BASE_URL);
    let method = init.method || "GET";
    let body = init.body;

    for (let redirect = 0; redirect < 6; redirect += 1) {
      const headers = new Headers(init.headers);
      headers.set(
        "User-Agent",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
      );
      headers.set("Accept-Language", "pt-BR,pt;q=0.9,en-US;q=0.8");
      headers.set(
        "Accept",
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      );
      const cookie = this.cookieHeader();
      if (cookie) headers.set("Cookie", cookie);
      if (method === "POST") {
        headers.set("Content-Type", "application/x-www-form-urlencoded");
        headers.set("Origin", BASE_URL);
        headers.set("Referer", currentUrl.href);
      }

      const response = await this.fetchImplementation(currentUrl.href, {
        method,
        body,
        headers,
        redirect: "manual",
        signal: init.signal,
      });
      this.ingestCookies(response);

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("Location");
        if (!location) break;
        currentUrl = new URL(location, currentUrl);
        method = "GET";
        body = undefined;
        continue;
      }

      const html = await response.text();
      return { response, html, url: currentUrl.href };
    }

    throw new C6SimulationError(
      "C6_REDIRECT",
      "O portal C6 não concluiu o redirecionamento da consulta.",
    );
  }

  get(url, signal) {
    return this.request(url, { signal });
  }

  post(page, eventTarget, values = {}, signal) {
    return this.request(page.url, {
      method: "POST",
      body: buildPostBody(page.html, { eventTarget, values }),
      signal,
    });
  }
}

function assertControl(name, label) {
  if (!name) {
    throw new C6SimulationError(
      "C6_LAYOUT_CHANGED",
      `O portal C6 alterou o campo ${label}. O fluxo precisa ser revisado.`,
    );
  }
  return name;
}

function assertPage(page) {
  if (!page.response.ok) {
    throw new C6SimulationError(
      "C6_UNAVAILABLE",
      `O portal C6 respondeu com status ${page.response.status}.`,
    );
  }
  return page;
}

async function chooseSelect(session, page, id, value, label, signal) {
  const name = assertControl(controlName(page.html, id), label);
  return assertPage(await session.post(page, name, { [name]: value }, signal));
}

function rowHtmlForId(html, id) {
  const index = html.indexOf(`id="${id}"`);
  if (index < 0) return "";
  const start = html.lastIndexOf("<tr", index);
  const end = html.indexOf("</tr>", index);
  return start < 0 || end < 0 ? "" : html.slice(start, end + 5);
}

function availableContract(html) {
  const id = findIdEnding(html, "_chkRefin", "input");
  if (!id) return null;
  const details = inputDetails(html, id);
  if (!details.name || details.disabled) return null;
  const row = rowHtmlForId(html, id);
  const installmentId = findIdEnding(row, "_lblValorParcela", "span");
  return {
    ...details,
    installment: installmentId ? textById(row, installmentId) : "",
  };
}

export async function simulateC6Refinancing(
  { cpf, user, password },
  { fetchImplementation = fetch, signal } = {},
) {
  if (!validateCpf(cpf)) {
    throw new C6SimulationError(
      "CPF_INVALID",
      "O CPF identificado no extrato é inválido.",
    );
  }
  if (!user || !password) {
    throw new C6SimulationError(
      "C6_NOT_CONFIGURED",
      "A credencial protegida do C6 ainda não foi configurada.",
    );
  }

  const session = new C6HttpSession(fetchImplementation);
  let page = assertPage(await session.get(LOGIN_URL, signal));
  page = assertPage(
    await session.post(
      page,
      "lnkEntrar",
      {
        "EUsuario$CAMPO": user,
        "ESenha$CAMPO": password,
      },
      signal,
    ),
  );

  if (page.html.includes("LKEntrarForcado") && page.html.includes("outra estação")) {
    throw new C6SimulationError(
      "C6_SESSION_BUSY",
      "O usuário do C6 já está conectado em outra estação. Use uma credencial exclusiva para a automação.",
    );
  }

  const proposalHref = hrefById(page.html, IDS.proposal);
  if (!proposalHref) {
    throw new C6SimulationError(
      "C6_NO_PERMISSION",
      "O usuário do C6 não possui acesso a Cadastro > Proposta Consignado.",
    );
  }

  page = assertPage(await session.get(new URL(proposalHref, page.url), signal));
  page = await chooseSelect(
    session,
    page,
    IDS.operation,
    "Refinanciamento",
    "Tipo de Operação",
    signal,
  );
  page = await chooseSelect(
    session,
    page,
    IDS.product,
    "0002",
    "Tipo de Produto",
    signal,
  );
  page = await chooseSelect(
    session,
    page,
    IDS.agreement,
    "5",
    "Grupo de Convênio",
    signal,
  );

  const digital = inputDetails(page.html, IDS.digital);
  const digitalTarget = digital.postbackTarget || `${digital.name}$1`;
  page = assertPage(
    await session.post(
      page,
      assertControl(digitalTarget, "Formalização Digital"),
      { [digital.name]: "D" },
      signal,
    ),
  );

  const cpfName = assertControl(controlName(page.html, IDS.cpf), "CPF");
  page = assertPage(
    await session.post(
      page,
      cpfName,
      { [cpfName]: formatCpf(cpf) },
      signal,
    ),
  );

  const registrationId =
    (page.html.includes(`id="${IDS.registration}"`) && IDS.registration) ||
    findIdEnding(page.html, "_grvHomo_ctl02_lnkCodigo", "a");
  const registrationTarget = registrationId
    ? postbackTargetForId(page.html, registrationId)
    : "";
  page = assertPage(
    await session.post(
      page,
      assertControl(registrationTarget, "Matrícula do cliente"),
      {},
      signal,
    ),
  );

  const marginTarget = assertControl(
    postbackTargetForId(page.html, IDS.getMargin),
    "Obter Margem",
  );
  page = assertPage(await session.post(page, marginTarget, {}, signal));

  const updateTarget = assertControl(
    postbackTargetForId(page.html, IDS.updateContracts),
    "Atualizar Lista de Contratos",
  );
  page = assertPage(await session.post(page, updateTarget, {}, signal));

  const contract = availableContract(page.html);
  if (!contract) {
    throw new C6SimulationError(
      "C6_NO_CONTRACT",
      "O C6 não retornou contrato elegível para refinanciamento.",
    );
  }
  page = assertPage(
    await session.post(
      page,
      assertControl(contract.postbackTarget || contract.name, "Contrato C6"),
      { [contract.name]: contract.value || "on" },
      signal,
    ),
  );

  const installmentName = assertControl(
    controlName(page.html, IDS.installment),
    "Valor da Parcela",
  );
  const installment = contract.installment;
  if (!installment) {
    throw new C6SimulationError(
      "C6_NO_INSTALLMENT",
      "O C6 não retornou o valor da parcela do contrato.",
    );
  }
  page = assertPage(
    await session.post(
      page,
      installmentName,
      { [installmentName]: installment },
      signal,
    ),
  );

  const calculateTarget = assertControl(
    postbackTargetForId(page.html, IDS.calculate),
    "Calcular",
  );
  page = assertPage(await session.post(page, calculateTarget, {}, signal));
  const offers = parseC6Offers(page.html, IDS.results, IDS.term);
  if (!offers.length) {
    throw new C6SimulationError(
      "C6_NO_OFFERS",
      "O C6 não retornou condições disponíveis para este contrato.",
    );
  }

  return {
    bank: "C6 Bank",
    operation: "Refinanciamento de Carteira",
    offers,
  };
}
