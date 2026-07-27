import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPostBody,
  controlName,
  hrefById,
  findIdMatching,
  findIdsEnding,
  parseC6Offers,
  postbackTargetForId,
  selectOptions,
} from "../lib/c6-webforms.mjs";

test("preserva o estado WebForms e publica apenas controles habilitados", () => {
  const html = `
    <form>
      <input name="__VIEWSTATE" value="estado-seguro" />
      <input name="__EVENTVALIDATION" value="validacao" />
      <input name="campoTexto" value="anterior" />
      <input name="ignorado" value="não enviar" disabled="disabled" />
      <input type="checkbox" name="marcado" value="sim" checked="checked" />
      <input type="checkbox" name="desmarcado" value="não" />
    </form>
  `;
  const body = buildPostBody(html, {
    eventTarget: "ctl00$acao",
    values: { campoTexto: "novo" },
  });

  assert.equal(body.get("__VIEWSTATE"), "estado-seguro");
  assert.equal(body.get("__EVENTVALIDATION"), "validacao");
  assert.equal(body.get("__EVENTTARGET"), "ctl00$acao");
  assert.equal(body.get("campoTexto"), "novo");
  assert.equal(body.get("marcado"), "sim");
  assert.equal(body.has("desmarcado"), false);
  assert.equal(body.has("ignorado"), false);
});

test("localiza controles, opções e alvo de postback do portal", () => {
  const html = `
    <select
      id="operacao"
      name="ctl00$operacao"
      onchange="__doPostBack('ctl00$operacao','')"
    >
      <option value="">Selecione</option>
      <option selected="selected" value="Refinanciamento">Refinanciamento</option>
    </select>
    <a id="proposta" href="/WebAutorizador/Proposta.aspx">Proposta</a>
    <a id="matricula" href="javascript:__doPostBack('ctl00$matricula','')">
      123456
    </a>
    <a
      id="grade_ctl03_lnkCodigo"
      href="javascript:WebForm_DoPostBackWithOptions(new WebForm_PostBackOptions(&quot;ctl00$grade$ctl03$lnkCodigo&quot;, &quot;&quot;, true, &quot;&quot;, &quot;&quot;, false, true))"
    >
      987654
    </a>
    <input id="grade_ctl02_chkRefin" name="contrato1" />
    <input id="grade_ctl03_chkRefin" name="contrato2" />
  `;

  assert.equal(controlName(html, "operacao"), "ctl00$operacao");
  assert.deepEqual(selectOptions(html, "operacao"), [
    { value: "", label: "Selecione", selected: false },
    {
      value: "Refinanciamento",
      label: "Refinanciamento",
      selected: true,
    },
  ]);
  assert.equal(
    hrefById(html, "proposta"),
    "/WebAutorizador/Proposta.aspx",
  );
  assert.equal(postbackTargetForId(html, "matricula"), "ctl00$matricula");
  assert.equal(
    postbackTargetForId(html, "grade_ctl03_lnkCodigo"),
    "ctl00$grade$ctl03$lnkCodigo",
  );
  assert.deepEqual(findIdsEnding(html, "_chkRefin", "input"), [
    "grade_ctl02_chkRefin",
    "grade_ctl03_chkRefin",
  ]);
  assert.equal(
    findIdMatching(html, /grvHomo_ctl\d+_lnkCodigo/i, "a"),
    "",
  );
  assert.equal(
    findIdMatching(html, /grade_ctl\d+_lnkCodigo/i, "a"),
    "grade_ctl03_lnkCodigo",
  );
});

test("converte a grade de condições do C6 no retorno do site", () => {
  const tableId = "resultado";
  const termId = "prazo";
  const html = `
    <select id="${termId}" name="prazo">
      <option value="96">96</option>
      <option selected="selected" value="108">108</option>
    </select>
    <table id="${tableId}">
      <tr>
        <th>Tabela</th>
        <th>Descrição Tabela</th>
        <th>Tx. Jr. a.m.</th>
        <th>Vlr Parc</th>
        <th>Vlr Sol</th>
        <th>Vlr Cli</th>
      </tr>
      <tr>
        <td>REFIN108</td>
        <td>REFINANCIAMENTO DE CARTEIRA</td>
        <td>1,66%</td>
        <td>R$ 420,00</td>
        <td>R$ 21.000,00</td>
        <td>R$ 4.850,00</td>
      </tr>
    </table>
  `;

  assert.deepEqual(parseC6Offers(html, tableId, termId), [
    {
      table: "REFIN108",
      description: "REFINANCIAMENTO DE CARTEIRA",
      monthlyRate: "1,66%",
      installment: "R$ 420,00",
      clientValue: "R$ 4.850,00",
      term: "108",
    },
  ]);
});
