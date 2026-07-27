import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const requestedCount = Number(process.argv[2] || 10);
const tokenCount = Number.isInteger(requestedCount)
  ? Math.min(Math.max(requestedCount, 1), 100)
  : 10;
const projectDirectory = resolve(import.meta.dirname, "..");
const outputDirectory = resolve(projectDirectory, "outputs");
const tokenListPath = resolve(outputDirectory, "tokens-acesso-imperio.txt");
const developmentVariablesPath = resolve(projectDirectory, ".dev.vars");

function createToken(index) {
  const randomPart = randomBytes(16)
    .toString("hex")
    .toUpperCase()
    .match(/.{1,4}/g)
    .join("-");
  return `IMP-${String(index + 1).padStart(2, "0")}-${randomPart}`;
}

const tokens = Array.from({ length: tokenCount }, (_, index) =>
  createToken(index),
);
const labeledHashes = tokens.map((token, index) => {
  const hash = createHash("sha256").update(token).digest("hex");
  return `${String(index + 1).padStart(2, "0")}:${hash}`;
});
const cookieSecret = randomBytes(48).toString("base64url");
const generatedAt = new Date().toISOString();

mkdirSync(outputDirectory, { recursive: true });
writeFileSync(
  tokenListPath,
  [
    "IMPÉRIO IA — TOKENS DE ACESSO",
    `Gerados em: ${generatedAt}`,
    "",
    "Distribua um token por pessoa e mantenha esta lista em local seguro.",
    "Quem possuir um token válido poderá entrar no sistema.",
    "",
    ...tokens.map(
      (token, index) =>
        `Token ${String(index + 1).padStart(2, "0")}: ${token}`,
    ),
    "",
    "IMPORTANTE:",
    "- Não envie esta lista inteira para os usuários.",
    "- Envie somente o token destinado a cada pessoa.",
    "- Para revogar ou substituir a lista, gere novos tokens e atualize a hospedagem.",
    "",
  ].join("\n"),
  "utf8",
);
writeFileSync(
  developmentVariablesPath,
  [
    `IMPERIO_ACCESS_TOKEN_HASHES=${labeledHashes.join(",")}`,
    `IMPERIO_ACCESS_COOKIE_SECRET=${cookieSecret}`,
    "",
  ].join("\n"),
  "utf8",
);

console.log(`Foram gerados ${tokenCount} tokens.`);
console.log(`Lista privada: ${tokenListPath}`);
console.log(`Variáveis locais: ${developmentVariablesPath}`);
