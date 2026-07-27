import assert from "node:assert/strict";
import test from "node:test";

import {
  C6SimulationError,
  simulateC6Refinancing,
} from "../lib/c6-server.mjs";

const hidden = `
  <input name="__VIEWSTATE" value="estado" />
  <input name="__EVENTVALIDATION" value="validacao" />
`;

function page(content) {
  return `<html><body><form>${hidden}${content}</form></body></html>`;
}

function fakePortal(pages) {
  const calls = [];
  return {
    calls,
    fetchImplementation: async (url, init = {}) => {
      calls.push({
        url: String(url),
        method: init.method || "GET",
        body: String(init.body || ""),
        cookie: new Headers(init.headers).get("Cookie") || "",
      });
      const html = pages.shift();
      assert.notEqual(html, undefined, "a automação fez uma chamada inesperada");
      return new Response(html, {
        status: 200,
        headers:
          calls.length === 1
            ? { "Set-Cookie": "ASP.NET_SessionId=sessao-teste; Path=/; HttpOnly" }
            : {},
      });
    },
  };
}

test("executa o fluxo WebForms completo e retorna as ofertas", async () => {
  const operationId =
    "ctl00_Cph_UcPrp_FIJN1_JnDadosIniciais_UcDIni_cboTipoOperacao_CAMPO";
  const productId =
    "ctl00_Cph_UcPrp_FIJN1_JnDadosIniciais_UcDIni_cboTipoProduto_CAMPO";
  const agreementId =
    "ctl00_Cph_UcPrp_FIJN1_JnDadosIniciais_UcDIni_cboGrupoConvenio_CAMPO";
  const digitalId =
    "ctl00_Cph_UcPrp_FIJN1_JnDadosIniciais_UcDIni_rblTpFormalizacao_1";
  const cpfId =
    "ctl00_Cph_UcPrp_FIJN1_JnDadosIniciais_UcDIni_txtCPF_CAMPO";
  const registrationId =
    "ctl00_cph_FIJanela1_FIJanelaPanel1_grvHomo_ctl03_lnkCodigo";
  const installmentId =
    "ctl00_Cph_UcPrp_FIJN1_JnSimulacao_UcSimulacaoSnt_FIJanela1_FIJanelaPanel1_txtVlrParcela_CAMPO";
  const termId =
    "ctl00_Cph_UcPrp_FIJN1_JnSimulacao_UcSimulacaoSnt_FIJanela1_FIJanelaPanel1_cbxPrazo_CAMPO";
  const resultsId =
    "ctl00_Cph_UcPrp_FIJN1_JnSimulacao_UcSimulacaoSnt_FIJanela1_FIJanelaPanel1_grdCondicoes";
  const firstContractId =
    "ctl00_Cph_UcPrp_FIJN1_JnRefinReneg_UcRefin_FIJN1_JnCR_grdOperacoes_ctl02_chkRefin";
  const firstContractInstallmentId =
    "ctl00_Cph_UcPrp_FIJN1_JnRefinReneg_UcRefin_FIJN1_JnCR_grdOperacoes_ctl02_lblValorParcela";
  const contractId =
    "ctl00_Cph_UcPrp_FIJN1_JnRefinReneg_UcRefin_FIJN1_JnCR_grdOperacoes_ctl03_chkRefin";
  const contractInstallmentId =
    "ctl00_Cph_UcPrp_FIJN1_JnRefinReneg_UcRefin_FIJN1_JnCR_grdOperacoes_ctl03_lblValorParcela";

  const portal = fakePortal([
    page(`
      <input name="EUsuario$CAMPO" id="EUsuario_CAMPO" />
      <input name="ESenha$CAMPO" id="ESenha_CAMPO" />
      <a id="lnkEntrar" href="javascript:__doPostBack('lnkEntrar','')">Entrar</a>
    `),
    page(`
      <a id="WFP2010_PWCDPRPS" href="/WebAutorizador/Proposta.aspx">
        Proposta Consignado
      </a>
    `),
    page(`
      <select id="${operationId}" name="ctl00$operacao">
        <option value="">Selecione</option>
        <option value="Refinanciamento">Refinanciamento</option>
      </select>
    `),
    page(`
      <select id="${productId}" name="ctl00$produto">
        <option value="0002">REFINANCIAMENTO DE CARTEIRA</option>
      </select>
    `),
    page(`
      <select id="${agreementId}" name="ctl00$convenio">
        <option value="5">INSS</option>
      </select>
    `),
    page(`
      <input
        id="${digitalId}"
        name="ctl00$formalizacao"
        value="D"
        onclick="__doPostBack('ctl00$formalizacao$1','')"
      />
    `),
    page(`<input id="${cpfId}" name="ctl00$cpf" value="" />`),
    page(`
      <a
        id="${registrationId}"
        href="javascript:WebForm_DoPostBackWithOptions(new WebForm_PostBackOptions(&quot;ctl00$matricula$ctl03$lnkCodigo&quot;, &quot;&quot;, true, &quot;&quot;, &quot;&quot;, false, true))"
      >
        123456
      </a>
    `),
    page(`
      <a id="btnObterMargem_txt" href="javascript:__doPostBack('ctl00$btnObterMargem','')">
        Obter Margem
      </a>
    `),
    page(`
      <a id="btAtuListaContratos_txt" href="javascript:__doPostBack('ctl00$btAtuListaContratos','')">
        Atualizar Lista de Contratos
      </a>
    `),
    page(`
      <table>
        <tr>
          <td>
            <input type="checkbox" id="${firstContractId}" name="ctl00$contrato1" value="on" />
            <span id="${firstContractInstallmentId}">100,00</span>
            Contrato 111111111
          </td>
        </tr>
        <tr>
          <td>
            <input type="checkbox" id="${contractId}" name="ctl00$contrato2" value="on" />
            <span id="${contractInstallmentId}">420,00</span>
            Contrato 90159392776
          </td>
        </tr>
      </table>
    `),
    page(`<input id="${installmentId}" name="ctl00$parcela" value="0,00" />`),
    page(`
      <a id="btnCalcular_txt" href="javascript:__doPostBack('ctl00$btnCalcular','')">
        Calcular
      </a>
    `),
    page(`
      <select id="${termId}" name="ctl00$prazo">
        <option selected="selected" value="108">108</option>
      </select>
      <table id="${resultsId}">
        <tr>
          <th>Tabela</th><th>Descrição Tabela</th><th>Tx. Jr. a.m.</th>
          <th>Vlr Parc</th><th>Vlr Sol</th><th>Vlr Cli</th>
        </tr>
        <tr>
          <td>REFIN108</td><td>CARTEIRA C6</td><td>1,66%</td>
          <td>R$ 420,00</td><td>R$ 21.000,00</td><td>R$ 4.850,00</td>
        </tr>
      </table>
    `),
  ]);

  const result = await simulateC6Refinancing(
    {
      cpf: "52998224725",
      contractNumber: "90159392776",
      installment: 420,
      user: "usuario_teste",
      password: "senha_teste",
    },
    { fetchImplementation: portal.fetchImplementation },
  );

  assert.equal(result.bank, "C6 Bank");
  assert.equal(result.operation, "Refinanciamento de Carteira");
  assert.deepEqual(result.offers, [
    {
      table: "REFIN108",
      description: "CARTEIRA C6",
      monthlyRate: "1,66%",
      installment: "R$ 420,00",
      clientValue: "R$ 4.850,00",
      term: "108",
    },
  ]);
  assert.equal(portal.calls.length, 14);
  assert.match(portal.calls[1].body, /EUsuario%24CAMPO=usuario_teste/);
  assert.match(portal.calls[1].cookie, /ASP\.NET_SessionId=sessao-teste/);
  assert.match(portal.calls[7].body, /ctl00%24cpf=529\.982\.247-25/);
  assert.match(portal.calls[11].body, /ctl00%24contrato2=on/);
  assert.doesNotMatch(portal.calls[11].body, /ctl00%24contrato1=on/);
});

test("não força a desconexão de outra sessão do C6", async () => {
  const portal = fakePortal([
    page(`
      <input name="EUsuario$CAMPO" id="EUsuario_CAMPO" />
      <input name="ESenha$CAMPO" id="ESenha_CAMPO" />
    `),
    page(`
      <p>Usuário já autenticado em outra estação.</p>
      <a id="LKEntrarForcado" href="javascript:__doPostBack('LKEntrarForcado','')">
        Continuar
      </a>
    `),
  ]);

  await assert.rejects(
    simulateC6Refinancing(
      {
        cpf: "52998224725",
        user: "usuario_teste",
        password: "senha_teste",
      },
      { fetchImplementation: portal.fetchImplementation },
    ),
    (error) =>
      error instanceof C6SimulationError && error.code === "C6_SESSION_BUSY",
  );
  assert.equal(portal.calls.length, 2);
});
