import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  createAccessSession,
  isAccessSessionValid,
  isAccessTokenValid,
  parseAccessTokenHashes,
  readCookie,
} from "../lib/token-auth.mjs";

const token = "IMP-01-0123-4567-89AB-CDEF-0123-4567-89AB-CDEF";
const tokenHash = createHash("sha256").update(token).digest("hex");
const secret = "segredo-de-teste-com-mais-de-trinta-e-dois-caracteres";

test("validates only hashes from the configured token list", async () => {
  const serializedHashes = `01:${tokenHash}`;

  assert.deepEqual(parseAccessTokenHashes(serializedHashes), [tokenHash]);
  assert.equal(
    await isAccessTokenValid(token.toLowerCase(), serializedHashes),
    true,
  );
  assert.equal(
    await isAccessTokenValid(
      "IMP-02-FFFF-FFFF-FFFF-FFFF-FFFF-FFFF-FFFF-FFFF",
      serializedHashes,
    ),
    false,
  );
});

test("creates signed sessions and rejects tampered or expired cookies", async () => {
  const now = Date.parse("2026-07-27T12:00:00Z");
  const session = await createAccessSession(secret, now, 3600);

  assert.equal(await isAccessSessionValid(session, secret, now), true);
  assert.equal(
    await isAccessSessionValid(`${session.slice(0, -1)}0`, secret, now),
    false,
  );
  assert.equal(
    await isAccessSessionValid(session, secret, now + 3600 * 1000 + 1),
    false,
  );
});

test("reads the named cookie without trusting neighboring cookies", () => {
  assert.equal(
    readCookie("theme=dark; imperio_access=abc.def; other=1", "imperio_access"),
    "abc.def",
  );
  assert.equal(readCookie("theme=dark", "imperio_access"), "");
});
