const encoder = new TextEncoder();
const decoder = new TextDecoder();
const VERSION = 1;
const PURPOSE = "imperio-c6-credentials:v1";

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/g, "");
}

function base64UrlToBytes(value) {
  const normalized = String(value || "")
    .replaceAll("-", "+")
    .replaceAll("_", "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(`${normalized}${padding}`);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function encryptionKey(secret) {
  if (!secret || secret.length < 32) {
    throw new Error("O segredo de proteção das credenciais não está configurado.");
  }
  const material = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(`${PURPOSE}:${secret}`),
  );
  return crypto.subtle.importKey(
    "raw",
    material,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

export function normalizeC6Credentials(user, password) {
  const normalizedUser = String(user || "").trim();
  const normalizedPassword = String(password || "");
  if (
    normalizedUser.length < 3 ||
    normalizedUser.length > 120 ||
    normalizedPassword.length < 4 ||
    normalizedPassword.length > 256
  ) {
    return null;
  }
  return { user: normalizedUser, password: normalizedPassword };
}

export function maskC6User(user) {
  const value = String(user || "").trim();
  if (value.length <= 6) return "••••••";
  return `${"•".repeat(Math.min(8, value.length - 4))}${value.slice(-4)}`;
}

export async function encryptC6Credentials(
  user,
  password,
  secret,
  now = Date.now(),
  durationSeconds = 60 * 60 * 24 * 7,
) {
  const credentials = normalizeC6Credentials(user, password);
  if (!credentials) {
    throw new Error("Usuário ou senha do C6 inválidos.");
  }
  const key = await encryptionKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = encoder.encode(
    JSON.stringify({
      v: VERSION,
      u: credentials.user,
      p: credentials.password,
      exp: Math.floor(now / 1000) + durationSeconds,
    }),
  );
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
        additionalData: encoder.encode(PURPOSE),
      },
      key,
      plaintext,
    ),
  );
  const packed = new Uint8Array(iv.length + ciphertext.length);
  packed.set(iv);
  packed.set(ciphertext, iv.length);
  return bytesToBase64Url(packed);
}

export async function decryptC6Credentials(
  encrypted,
  secret,
  now = Date.now(),
) {
  if (!encrypted || !secret || secret.length < 32) return null;

  try {
    const packed = base64UrlToBytes(encrypted);
    if (packed.length <= 28) return null;
    const iv = packed.slice(0, 12);
    const ciphertext = packed.slice(12);
    const key = await encryptionKey(secret);
    const plaintext = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
        additionalData: encoder.encode(PURPOSE),
      },
      key,
      ciphertext,
    );
    const payload = JSON.parse(decoder.decode(plaintext));
    const credentials = normalizeC6Credentials(payload?.u, payload?.p);
    if (
      payload?.v !== VERSION ||
      !credentials ||
      !Number.isInteger(payload.exp) ||
      payload.exp <= Math.floor(now / 1000)
    ) {
      return null;
    }
    return {
      ...credentials,
      expiresAt: payload.exp,
    };
  } catch {
    return null;
  }
}
