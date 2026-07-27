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
  assert.match(html, /Há rota objetiva para <strong>7<\/strong>/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview/);
});

test("keeps sensitive source PDFs and starter artifacts out of the app", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /Cliente anonimizado/);
  assert.match(page, /Benefício •••\.•••\.585-3/);
  assert.match(layout, /Império IA/);
  assert.match(layout, /og\.png/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.doesNotMatch(page, /102\.689\.298-82|LUIZ CARLOS RAMOS/);
});
