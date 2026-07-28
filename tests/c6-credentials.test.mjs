import assert from "node:assert/strict";
import test from "node:test";

import {
  decryptC6Credentials,
  encryptC6Credentials,
  maskC6User,
  normalizeC6Credentials,
} from "../lib/c6-credentials.mjs";

const secret = "segredo-de-teste-com-mais-de-trinta-e-dois-caracteres";
const now = Date.parse("2026-07-28T12:00:00Z");

test("criptografa a credencial C6 sem expor usuário ou senha", async () => {
  const encrypted = await encryptC6Credentials(
    "usuario_c6_000012",
    "senha-secreta",
    secret,
    now,
    3600,
  );

  assert.doesNotMatch(encrypted, /usuario|senha-secreta/);
  assert.deepEqual(await decryptC6Credentials(encrypted, secret, now), {
    user: "usuario_c6_000012",
    password: "senha-secreta",
    expiresAt: Math.floor(now / 1000) + 3600,
  });
});

test("recusa credencial adulterada, expirada ou protegida por outra chave", async () => {
  const encrypted = await encryptC6Credentials(
    "usuario_c6_000012",
    "senha-secreta",
    secret,
    now,
    60,
  );
  const replacement = encrypted.endsWith("A") ? "B" : "A";
  const tampered = `${encrypted.slice(0, -1)}${replacement}`;

  assert.equal(await decryptC6Credentials(tampered, secret, now), null);
  assert.equal(
    await decryptC6Credentials(
      encrypted,
      "outro-segredo-com-mais-de-trinta-e-dois-caracteres",
      now,
    ),
    null,
  );
  assert.equal(
    await decryptC6Credentials(encrypted, secret, now + 61_000),
    null,
  );
});

test("valida limites e mascara o usuário antes de exibi-lo", () => {
  assert.deepEqual(normalizeC6Credentials("  usuario_000012 ", "Senha@26"), {
    user: "usuario_000012",
    password: "Senha@26",
  });
  assert.equal(normalizeC6Credentials("", "Senha@26"), null);
  assert.equal(normalizeC6Credentials("usuario", ""), null);
  assert.equal(maskC6User("03740275103_000012"), "••••••••0012");
});
