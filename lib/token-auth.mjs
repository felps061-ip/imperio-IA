const encoder = new TextEncoder();

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;

  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return bytesToHex(new Uint8Array(digest));
}

async function hmacHex(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(value),
  );
  return bytesToHex(new Uint8Array(signature));
}

export function parseAccessTokenHashes(serializedHashes) {
  return String(serializedHashes || "")
    .split(",")
    .map((entry) => entry.trim().split(":").at(-1)?.toLowerCase())
    .filter((hash) => /^[a-f0-9]{64}$/.test(hash || ""));
}

export async function isAccessTokenValid(token, serializedHashes) {
  const normalizedToken = String(token || "").trim().toUpperCase();
  if (normalizedToken.length < 20 || normalizedToken.length > 120) return false;

  const candidateHash = await sha256Hex(normalizedToken);
  const allowedHashes = parseAccessTokenHashes(serializedHashes);

  let matchFound = false;
  for (const allowedHash of allowedHashes) {
    matchFound = constantTimeEqual(candidateHash, allowedHash) || matchFound;
  }
  return matchFound;
}

export async function createAccessSession(
  secret,
  now = Date.now(),
  durationSeconds = 60 * 60 * 24 * 7,
) {
  if (!secret || secret.length < 32) {
    throw new Error("O segredo da sessão não está configurado corretamente.");
  }

  const expiresAt = Math.floor(now / 1000) + durationSeconds;
  const payload = `imperio-access:${expiresAt}`;
  const signature = await hmacHex(payload, secret);
  return `${expiresAt}.${signature}`;
}

export async function isAccessSessionValid(cookieValue, secret, now = Date.now()) {
  if (!cookieValue || !secret || secret.length < 32) return false;

  const [rawExpiresAt, suppliedSignature, ...extraParts] = String(
    cookieValue,
  ).split(".");
  if (extraParts.length || !/^\d{10}$/.test(rawExpiresAt || "")) return false;
  if (!/^[a-f0-9]{64}$/.test(suppliedSignature || "")) return false;

  const expiresAt = Number(rawExpiresAt);
  const currentTime = Math.floor(now / 1000);
  if (expiresAt <= currentTime || expiresAt > currentTime + 60 * 60 * 24 * 8) {
    return false;
  }

  const expectedSignature = await hmacHex(
    `imperio-access:${expiresAt}`,
    secret,
  );
  return constantTimeEqual(expectedSignature, suppliedSignature);
}

export function readCookie(cookieHeader, cookieName) {
  const cookies = String(cookieHeader || "").split(";");

  for (const cookie of cookies) {
    const separatorIndex = cookie.indexOf("=");
    if (separatorIndex < 0) continue;

    const name = cookie.slice(0, separatorIndex).trim();
    if (name !== cookieName) continue;
    return decodeURIComponent(cookie.slice(separatorIndex + 1).trim());
  }

  return "";
}
