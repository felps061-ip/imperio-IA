import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: {
        accept: "text/html",
        host: "localhost",
      },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Império IA product shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Império IA \| Mesa de Consignado<\/title>/i);
  assert.match(html, /Assistente operacional/);
  assert.match(html, /INSS · Portabilidade/);
  assert.match(html, /Base de roteiros/);
  assert.match(html, /12 bancos INSS/);
  assert.match(html, /NENHUM CLIENTE CARREGADO/);
  assert.match(html, /iCred/);
  assert.match(html, /Finanto/);
  assert.match(html, /C6 Bank/);
  assert.match(html, /Happy/);
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
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.doesNotMatch(page, /const contracts|Cliente anonimizado|Caso demonstrativo/);
  assert.doesNotMatch(page, /Benefício •|Agibank|Cobuccio/);
});
