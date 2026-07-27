import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const testToken = "IMP-TEST-0123-4567-89AB-CDEF-0123-4567-89AB-CDEF";
const testEnvironment = {
  ASSETS: {
    fetch: async () => new Response("Not found", { status: 404 }),
  },
  IMPERIO_ACCESS_TOKEN_HASHES: `TEST:${createHash("sha256")
    .update(testToken)
    .digest("hex")}`,
  IMPERIO_ACCESS_COOKIE_SECRET:
    "segredo-de-teste-com-mais-de-trinta-e-dois-caracteres",
};
const testContext = {
  waitUntil() {},
  passThroughOnException() {},
};

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker;
}

async function render() {
  const worker = await loadWorker();
  const loginResponse = await worker.fetch(
    new Request("http://localhost/auth/token", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        token: testToken,
        return_to: "/",
      }),
    }),
    testEnvironment,
    testContext,
  );
  assert.equal(loginResponse.status, 303);
  const sessionCookie = loginResponse.headers.get("set-cookie")?.split(";")[0];
  assert.ok(sessionCookie);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: {
        accept: "text/html",
        cookie: sessionCookie,
        host: "localhost",
      },
    }),
    testEnvironment,
    testContext,
  );
}

test("protects the application with the server-side token gate", async () => {
  const worker = await loadWorker();
  const anonymousResponse = await worker.fetch(
    new Request("http://localhost/"),
    testEnvironment,
    testContext,
  );
  assert.equal(anonymousResponse.status, 303);
  assert.match(
    anonymousResponse.headers.get("location") ?? "",
    /^\/acesso\?return_to=/,
  );

  const accessResponse = await worker.fetch(
    new Request("http://localhost/acesso"),
    testEnvironment,
    testContext,
  );
  assert.equal(accessResponse.status, 200);
  assert.match(await accessResponse.text(), /Informe seu token/);

  const invalidResponse = await worker.fetch(
    new Request("http://localhost/auth/token", {
      method: "POST",
      body: new URLSearchParams({ token: "TOKEN-INVALIDO" }),
    }),
    testEnvironment,
    testContext,
  );
  assert.equal(invalidResponse.status, 303);
  assert.match(invalidResponse.headers.get("location") ?? "", /erro=token/);

  const externalReturnResponse = await worker.fetch(
    new Request("http://localhost/auth/token", {
      method: "POST",
      body: new URLSearchParams({
        token: testToken,
        return_to: "//site-malicioso.example",
      }),
    }),
    testEnvironment,
    testContext,
  );
  assert.equal(externalReturnResponse.status, 303);
  assert.equal(externalReturnResponse.headers.get("location"), "/");
});

test("server-renders the Império IA product shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Império IA \| Mesa de Consignado<\/title>/i);
  assert.match(html, /Assistente operacional/);
  assert.match(html, /INSS · Portabilidade/);
  assert.match(html, /Base de roteiros/);
  assert.match(html, /Calculadora/);
  assert.match(html, /15(?:<!-- -->)? bancos INSS/);
  assert.match(html, /PRONTO PARA ANALISAR/);
  assert.match(html, /Leitura automática ativa/);
  assert.match(html, /iCred/);
  assert.match(html, /Finanto/);
  assert.match(html, /C6 Bank/);
  assert.match(html, /Happy/);
  assert.match(html, /Acredto/);
  assert.match(html, /Quero Mais Crédito/);
  assert.match(html, /Total Cash/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview/);
});

test("keeps the real client case and source PDFs out of the app", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /Império IA/);
  assert.match(layout, /og\.png/);
  assert.match(page, /bank: "iCred"/);
  assert.match(page, /bank: "Finanto"/);
  assert.match(page, /bank: "Digio"/);
  assert.match(page, /bank: "Daycoval"/);
  assert.match(page, /bank: "C6 Bank"/);
  assert.match(page, /bank: "BRB"/);
  assert.match(page, /bank: "Happy"/);
  assert.match(page, /bank: "Acredto"/);
  assert.match(page, /bank: "Quero Mais Crédito"/);
  assert.match(page, /bank: "Total Cash"/);
  assert.match(page, /extractPdfText/);
  assert.match(page, /analyzeInssExtract/);
  assert.match(page, /loadingTask\.destroy\(\)/);
  assert.match(page, /calculateCitizenFinancing/);
  assert.match(page, /Calculadora do Cidadão/);
  assert.match(page, /Abrir versão oficial/);
  assert.doesNotMatch(page, /pdf\.destroy\(\)/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.doesNotMatch(page, /const contracts|Cliente anonimizado|Caso demonstrativo/);
  assert.doesNotMatch(page, /Benefício •|Agibank|Cobuccio/);
});
