import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createAccessSession } from "../lib/token-auth.mjs";

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

async function authenticate(worker) {
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
  return sessionCookie;
}

async function render() {
  const worker = await loadWorker();
  const sessionCookie = await authenticate(worker);
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

test("protege o acesso C6 individual em cookie HttpOnly e permite removê-lo", async () => {
  const worker = await loadWorker();
  const accessCookie = await authenticate(worker);
  const connectResponse = await worker.fetch(
    new Request("http://localhost/api/c6/session", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: accessCookie,
        origin: "http://localhost",
      },
      body: JSON.stringify({
        user: "usuario_c6_000012",
        password: "senha-secreta",
        remember: true,
      }),
    }),
    testEnvironment,
    testContext,
  );
  assert.equal(connectResponse.status, 200);
  const setCookie = connectResponse.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /imperio_c6_credentials=/);
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=Strict/i);
  assert.match(setCookie, /Path=\/api\/c6/i);
  assert.match(setCookie, /Max-Age=604800/i);
  assert.doesNotMatch(setCookie, /usuario_c6|senha-secreta/);

  const c6Cookie = setCookie.split(";")[0];
  const statusResponse = await worker.fetch(
    new Request("http://localhost/api/c6/session", {
      headers: { cookie: `${accessCookie}; ${c6Cookie}` },
    }),
    testEnvironment,
    testContext,
  );
  assert.equal(statusResponse.status, 200);
  assert.deepEqual(await statusResponse.json(), {
    ok: true,
    connected: true,
    user: "••••••••0012",
  });

  const otherAccessSession = await createAccessSession(
    testEnvironment.IMPERIO_ACCESS_COOKIE_SECRET,
    Date.now() + 5_000,
  );
  const otherSessionResponse = await worker.fetch(
    new Request("http://localhost/api/c6/session", {
      headers: {
        cookie: `imperio_access=${otherAccessSession}; ${c6Cookie}`,
      },
    }),
    testEnvironment,
    testContext,
  );
  assert.equal(otherSessionResponse.status, 200);
  assert.deepEqual(await otherSessionResponse.json(), {
    ok: true,
    connected: false,
    user: "",
  });

  const disconnectResponse = await worker.fetch(
    new Request("http://localhost/api/c6/session", {
      method: "DELETE",
      headers: {
        cookie: `${accessCookie}; ${c6Cookie}`,
        origin: "http://localhost",
      },
    }),
    testEnvironment,
    testContext,
  );
  assert.equal(disconnectResponse.status, 200);
  assert.match(
    disconnectResponse.headers.get("set-cookie") ?? "",
    /Max-Age=0/i,
  );
});

test("exige o acesso individual C6 antes de iniciar a simulação", async () => {
  const worker = await loadWorker();
  const accessCookie = await authenticate(worker);
  const response = await worker.fetch(
    new Request("http://localhost/api/c6/refin", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: accessCookie,
        origin: "http://localhost",
      },
      body: JSON.stringify({ cpf: "52998224725" }),
    }),
    testEnvironment,
    testContext,
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    ok: false,
    code: "C6_LOGIN_REQUIRED",
    message: "Conecte seu usuário e senha do C6 antes de simular.",
  });
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
  assert.match(page, /Simular no C6/);
  assert.match(page, /Usuário C6/);
  assert.match(page, /Lembrar neste computador por 7 dias/);
  assert.doesNotMatch(page, /pdf\.destroy\(\)/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.doesNotMatch(page, /const contracts|Cliente anonimizado|Caso demonstrativo/);
  assert.doesNotMatch(page, /Benefício •|Agibank|Cobuccio/);
});
