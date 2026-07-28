/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import {
  createAccessSession,
  isAccessSessionValid,
  isAccessTokenValid,
  readCookie,
} from "../lib/token-auth.mjs";
import {
  C6SimulationError,
  simulateC6Refinancing,
} from "../lib/c6-server.mjs";
import {
  decryptC6Credentials,
  encryptC6Credentials,
  maskC6User,
  normalizeC6Credentials,
} from "../lib/c6-credentials.mjs";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMPERIO_ACCESS_COOKIE_SECRET?: string;
  IMPERIO_ACCESS_TOKEN_HASHES?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const ACCESS_COOKIE_NAME = "imperio_access";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;
const C6_CREDENTIAL_COOKIE_NAME = "imperio_c6_credentials";
const C6_CREDENTIAL_SESSION_SECONDS = 60 * 60 * 12;
const C6_CREDENTIAL_REMEMBER_SECONDS = 60 * 60 * 24 * 7;
const PUBLIC_ASSET_PATHS = new Set([
  "/imperio-favicon.png",
  "/imperio-lion.png",
  "/imperio-signature.png",
  "/imperio-wordmark.png",
]);
const loginAttempts = new Map<
  string,
  { attempts: number; blockedUntil: number }
>();
const c6SimulationsInFlight = new Set<string>();

function securityHeaders(contentType = "text/html; charset=utf-8") {
  return {
    "Cache-Control": "no-store, max-age=0",
    "Content-Security-Policy":
      "default-src 'self'; img-src 'self' data:; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
    "Content-Type": contentType,
    "Cross-Origin-Opener-Policy": "same-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  };
}

function safeReturnPath(value: FormDataEntryValue | string | null) {
  const path = String(value || "/");
  if (!path.startsWith("/")) return "/";

  try {
    const resolved = new URL(path, "https://app.local");
    if (resolved.origin !== "https://app.local") return "/";
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return "/";
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function accessPage(url: URL, status = 200) {
  const error = url.searchParams.get("erro");
  const loggedOut = url.searchParams.get("saiu") === "1";
  const returnPath = safeReturnPath(url.searchParams.get("return_to"));
  const message =
    error === "token"
      ? "Token inválido. Confira o código e tente novamente."
      : error === "limite"
        ? "Muitas tentativas. Aguarde alguns minutos e tente novamente."
        : error === "config"
          ? "O acesso está temporariamente indisponível. Fale com o responsável."
          : loggedOut
            ? "Sessão encerrada com segurança."
            : "";
  const messageClass = error ? "message error" : "message success";

  return new Response(
    `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow, noarchive" />
    <title>Acesso autorizado | Império IA</title>
    <link rel="icon" href="/imperio-favicon.png" type="image/png" />
    <style>
      :root {
        color-scheme: light;
        font-family: Arial, Helvetica, sans-serif;
        background: #f5f4ef;
        color: #18233a;
      }
      * { box-sizing: border-box; }
      body {
        min-height: 100vh;
        margin: 0;
        display: grid;
        place-items: center;
        padding: 24px;
        background:
          radial-gradient(circle at 18% 12%, rgba(49, 84, 232, .12), transparent 30%),
          radial-gradient(circle at 88% 82%, rgba(20, 122, 88, .09), transparent 28%),
          #f7f6f2;
      }
      main {
        width: min(100%, 940px);
        min-height: 570px;
        border: 1px solid #dfe2e8;
        border-radius: 24px;
        background: #fff;
        box-shadow: 0 24px 70px rgba(26, 35, 56, .13);
        display: grid;
        grid-template-columns: minmax(300px, .92fr) minmax(340px, 1.08fr);
        overflow: hidden;
      }
      .brand {
        position: relative;
        padding: 46px;
        background:
          linear-gradient(150deg, rgba(37, 54, 88, .94), rgba(20, 31, 52, .99)),
          #17233a;
        color: #fff;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .brand::after {
        content: "";
        position: absolute;
        right: -78px;
        bottom: -100px;
        width: 280px;
        height: 280px;
        border: 1px solid rgba(255, 255, 255, .09);
        border-radius: 50%;
        box-shadow:
          0 0 0 36px rgba(255, 255, 255, .025),
          0 0 0 72px rgba(255, 255, 255, .018);
      }
      .wordmark {
        width: min(100%, 190px);
        height: auto;
        filter: brightness(0) invert(1);
      }
      .brand-copy {
        position: relative;
        z-index: 1;
      }
      .brand-copy span {
        display: inline-flex;
        padding: 6px 9px;
        border: 1px solid rgba(255, 255, 255, .16);
        border-radius: 999px;
        color: #bfc9df;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: .09em;
      }
      .brand-copy h1 {
        max-width: 310px;
        margin: 16px 0 0;
        font-family: Georgia, "Times New Roman", serif;
        font-size: clamp(31px, 4vw, 45px);
        line-height: 1.02;
        letter-spacing: -.035em;
      }
      .brand-copy p {
        max-width: 310px;
        margin: 14px 0 0;
        color: #b9c3d7;
        font-size: 14px;
        line-height: 1.65;
      }
      .form-panel {
        padding: 58px 56px;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      .lion {
        width: 58px;
        height: 58px;
        border-radius: 17px;
        object-fit: contain;
        background: #eef1ff;
      }
      .eyebrow {
        margin-top: 24px;
        color: #3154e8;
        font-size: 11px;
        font-weight: 900;
        letter-spacing: .1em;
      }
      h2 {
        margin: 7px 0 0;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 32px;
        letter-spacing: -.025em;
      }
      .instruction {
        margin: 11px 0 0;
        color: #6f7787;
        font-size: 14px;
        line-height: 1.6;
      }
      form { margin-top: 25px; }
      label {
        display: block;
        color: #414a5d;
        font-size: 13px;
        font-weight: 800;
      }
      input {
        width: 100%;
        height: 50px;
        margin-top: 8px;
        padding: 0 14px;
        border: 1px solid #d9dde5;
        border-radius: 11px;
        outline: none;
        color: #1e293e;
        background: #fbfbfa;
        font-size: 15px;
        font-weight: 700;
        letter-spacing: .03em;
        text-transform: uppercase;
      }
      input:focus {
        border-color: #7088eb;
        box-shadow: 0 0 0 4px rgba(49, 84, 232, .09);
        background: #fff;
      }
      button {
        width: 100%;
        height: 48px;
        margin-top: 13px;
        border: 0;
        border-radius: 11px;
        background: #3154e8;
        box-shadow: 0 9px 24px rgba(49, 84, 232, .22);
        color: #fff;
        font-size: 14px;
        font-weight: 850;
        cursor: pointer;
      }
      button:hover { background: #2444c8; }
      .message {
        margin-top: 14px;
        padding: 10px 11px;
        border-radius: 9px;
        font-size: 12px;
        line-height: 1.45;
      }
      .message.error {
        border: 1px solid #efcccc;
        background: #fdeaea;
        color: #963f3f;
      }
      .message.success {
        border: 1px solid #cbe6d9;
        background: #eef9f3;
        color: #176c50;
      }
      .security-note {
        margin-top: 18px;
        padding-top: 16px;
        border-top: 1px solid #eceef1;
        color: #8a909b;
        font-size: 11px;
        line-height: 1.55;
      }
      @media (max-width: 760px) {
        body { padding: 12px; }
        main { grid-template-columns: 1fr; min-height: 0; }
        .brand { min-height: 230px; padding: 30px; }
        .brand-copy h1 { font-size: 31px; }
        .brand-copy p { font-size: 13px; }
        .form-panel { padding: 34px 28px 38px; }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="brand">
        <img class="wordmark" src="/imperio-wordmark.png" alt="Império" />
        <div class="brand-copy">
          <span>AMBIENTE PROTEGIDO</span>
          <h1>Decisões mais rápidas, com regras claras.</h1>
          <p>Leitura de extratos INSS, comparação bancária e apoio operacional em um único lugar.</p>
        </div>
      </section>
      <section class="form-panel">
        <img class="lion" src="/imperio-lion.png" alt="" />
        <span class="eyebrow">IMPÉRIO IA</span>
        <h2>Informe seu token</h2>
        <p class="instruction">Digite o código fornecido pelo responsável para acessar a mesa de consignado.</p>
        ${message ? `<div class="${messageClass}" role="status">${message}</div>` : ""}
        <form method="post" action="/auth/token">
          <input type="hidden" name="return_to" value="${escapeHtml(returnPath)}" />
          <label for="access-token">Token de acesso</label>
          <input
            id="access-token"
            name="token"
            type="password"
            autocomplete="off"
            autocapitalize="characters"
            spellcheck="false"
            placeholder="IMP-00-XXXX-XXXX-XXXX"
            required
          />
          <button type="submit">Acessar o sistema</button>
        </form>
        <p class="security-note">Seu token é pessoal. Não compartilhe o código nem deixe a sessão aberta em computadores públicos.</p>
      </section>
    </main>
  </body>
</html>`,
    {
      status,
      headers: securityHeaders(),
    },
  );
}

function redirect(location: string, cookies: string | string[] = []) {
  const headers = new Headers({
    ...securityHeaders("text/plain; charset=utf-8"),
    Location: location,
  });
  for (const cookie of Array.isArray(cookies) ? cookies : [cookies]) {
    if (cookie) headers.append("Set-Cookie", cookie);
  }
  return new Response(null, { status: 303, headers });
}

function clientIdentifier(request: Request) {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function isRateLimited(identifier: string, now = Date.now()) {
  const current = loginAttempts.get(identifier);
  if (!current || current.blockedUntil <= now) {
    loginAttempts.set(identifier, {
      attempts: 1,
      blockedUntil: now + 15 * 60 * 1000,
    });
    return false;
  }

  current.attempts += 1;
  return current.attempts > 10;
}

function clearAttempts(identifier: string) {
  loginAttempts.delete(identifier);
}

function sessionCookie(request: Request, value: string, maxAge: number) {
  const isSecure = new URL(request.url).protocol === "https:";
  return [
    `${ACCESS_COOKIE_NAME}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    isSecure ? "Secure" : "",
    `Max-Age=${maxAge}`,
  ]
    .filter(Boolean)
    .join("; ");
}

function c6CredentialCookie(
  request: Request,
  value: string,
  maxAge?: number,
) {
  const isSecure = new URL(request.url).protocol === "https:";
  return [
    `${C6_CREDENTIAL_COOKIE_NAME}=${encodeURIComponent(value)}`,
    "Path=/api/c6",
    "HttpOnly",
    "SameSite=Strict",
    isSecure ? "Secure" : "",
    typeof maxAge === "number" ? `Max-Age=${maxAge}` : "",
  ]
    .filter(Boolean)
    .join("; ");
}

function hasSameOrigin(request: Request) {
  const origin = request.headers.get("Origin");
  return Boolean(origin && origin === new URL(request.url).origin);
}

async function handleTokenLogin(request: Request, env: Env) {
  const formData = await request.formData();
  const returnPath = safeReturnPath(formData.get("return_to"));
  const identifier = clientIdentifier(request);

  if (
    !env.IMPERIO_ACCESS_TOKEN_HASHES ||
    !env.IMPERIO_ACCESS_COOKIE_SECRET
  ) {
    return redirect(
      `/acesso?erro=config&return_to=${encodeURIComponent(returnPath)}`,
    );
  }

  if (isRateLimited(identifier)) {
    return redirect(
      `/acesso?erro=limite&return_to=${encodeURIComponent(returnPath)}`,
    );
  }

  const validToken = await isAccessTokenValid(
    formData.get("token"),
    env.IMPERIO_ACCESS_TOKEN_HASHES,
  );
  if (!validToken) {
    return redirect(
      `/acesso?erro=token&return_to=${encodeURIComponent(returnPath)}`,
    );
  }

  clearAttempts(identifier);
  const session = await createAccessSession(
    env.IMPERIO_ACCESS_COOKIE_SECRET,
    Date.now(),
    SESSION_DURATION_SECONDS,
  );
  return redirect(
    returnPath,
    sessionCookie(request, session, SESSION_DURATION_SECONDS),
  );
}

function jsonResponse(
  payload: Record<string, unknown>,
  status = 200,
  cookies: string | string[] = [],
) {
  const headers = new Headers(
    securityHeaders("application/json; charset=utf-8"),
  );
  for (const cookie of Array.isArray(cookies) ? cookies : [cookies]) {
    if (cookie) headers.append("Set-Cookie", cookie);
  }
  return new Response(JSON.stringify(payload), {
    status,
    headers,
  });
}

async function requestC6Credentials(request: Request, env: Env) {
  const encrypted = readCookie(
    request.headers.get("Cookie"),
    C6_CREDENTIAL_COOKIE_NAME,
  );
  const accessSession = readCookie(
    request.headers.get("Cookie"),
    ACCESS_COOKIE_NAME,
  );
  const credentials = await decryptC6Credentials(
    encrypted,
    env.IMPERIO_ACCESS_COOKIE_SECRET && accessSession
      ? `${env.IMPERIO_ACCESS_COOKIE_SECRET}:${accessSession}`
      : "",
  );
  return { encrypted, credentials };
}

async function handleC6CredentialSession(request: Request, env: Env) {
  if (!env.IMPERIO_ACCESS_COOKIE_SECRET) {
    return jsonResponse(
      {
        ok: false,
        code: "C6_CREDENTIAL_STORAGE_UNAVAILABLE",
        message: "A proteção do acesso C6 está temporariamente indisponível.",
      },
      503,
    );
  }

  if (request.method === "GET") {
    const { encrypted, credentials } = await requestC6Credentials(request, env);
    return jsonResponse(
      {
        ok: true,
        connected: Boolean(credentials),
        user: credentials ? maskC6User(credentials.user) : "",
      },
      200,
      encrypted && !credentials
        ? c6CredentialCookie(request, "", 0)
        : [],
    );
  }

  if (!hasSameOrigin(request)) {
    return jsonResponse(
      {
        ok: false,
        code: "INVALID_ORIGIN",
        message: "A solicitação de acesso C6 não foi reconhecida.",
      },
      403,
    );
  }

  if (request.method === "DELETE") {
    return jsonResponse(
      {
        ok: true,
        connected: false,
        message: "Acesso C6 removido deste navegador.",
      },
      200,
      c6CredentialCookie(request, "", 0),
    );
  }

  if (request.method !== "POST") {
    return jsonResponse(
      {
        ok: false,
        code: "METHOD_NOT_ALLOWED",
        message: "Operação não permitida.",
      },
      405,
    );
  }

  let body: {
    user?: unknown;
    password?: unknown;
    remember?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonResponse(
      {
        ok: false,
        code: "INVALID_REQUEST",
        message: "Não foi possível ler o acesso informado.",
      },
      400,
    );
  }

  const credentials = normalizeC6Credentials(body.user, body.password);
  if (!credentials) {
    return jsonResponse(
      {
        ok: false,
        code: "C6_INVALID_CREDENTIAL_FORMAT",
        message: "Informe o usuário e a senha do C6.",
      },
      400,
    );
  }

  const remember = body.remember === true;
  const duration = remember
    ? C6_CREDENTIAL_REMEMBER_SECONDS
    : C6_CREDENTIAL_SESSION_SECONDS;
  const accessSession = readCookie(
    request.headers.get("Cookie"),
    ACCESS_COOKIE_NAME,
  );
  if (!accessSession) {
    return jsonResponse(
      {
        ok: false,
        code: "ACCESS_SESSION_REQUIRED",
        message: "Sua sessão do Império IA expirou. Entre novamente.",
      },
      401,
    );
  }
  const encrypted = await encryptC6Credentials(
    credentials.user,
    credentials.password,
    `${env.IMPERIO_ACCESS_COOKIE_SECRET}:${accessSession}`,
    Date.now(),
    duration,
  );

  return jsonResponse(
    {
      ok: true,
      connected: true,
      user: maskC6User(credentials.user),
      message: remember
        ? "Acesso C6 protegido neste navegador por até sete dias."
        : "Acesso C6 protegido durante esta sessão do navegador.",
    },
    200,
    c6CredentialCookie(
      request,
      encrypted,
      remember ? C6_CREDENTIAL_REMEMBER_SECONDS : undefined,
    ),
  );
}

async function handleC6Simulation(request: Request, env: Env) {
  if (!hasSameOrigin(request)) {
    return jsonResponse(
      {
        ok: false,
        code: "INVALID_ORIGIN",
        message: "A solicitação de simulação não foi reconhecida.",
      },
      403,
    );
  }

  const { encrypted, credentials } = await requestC6Credentials(request, env);
  if (!credentials) {
    return jsonResponse(
      {
        ok: false,
        code: "C6_LOGIN_REQUIRED",
        message: "Conecte seu usuário e senha do C6 antes de simular.",
      },
      401,
      encrypted ? c6CredentialCookie(request, "", 0) : [],
    );
  }

  const simulationKey = encrypted;
  if (c6SimulationsInFlight.has(simulationKey)) {
    return jsonResponse(
      {
        ok: false,
        code: "C6_BUSY",
        message:
          "Já existe uma simulação C6 em andamento. Aguarde alguns segundos.",
      },
      409,
    );
  }

  let body: {
    cpf?: unknown;
    contractNumber?: unknown;
    installment?: unknown;
  };
  try {
    body = (await request.json()) as {
      cpf?: unknown;
      contractNumber?: unknown;
      installment?: unknown;
    };
  } catch {
    return jsonResponse(
      {
        ok: false,
        code: "INVALID_REQUEST",
        message: "Não foi possível ler os dados da simulação.",
      },
      400,
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55_000);
  c6SimulationsInFlight.add(simulationKey);

  try {
    const result = await simulateC6Refinancing(
      {
        cpf: String(body.cpf || ""),
        contractNumber: String(body.contractNumber || ""),
        installment: Number(body.installment || 0),
        user: credentials.user,
        password: credentials.password,
      },
      { signal: controller.signal },
    );
    return jsonResponse({ ok: true, ...result });
  } catch (error) {
    if (error instanceof C6SimulationError) {
      const invalidCredentials = error.code === "C6_INVALID_CREDENTIALS";
      const status =
        error.code === "CPF_INVALID"
          ? 400
          : invalidCredentials
            ? 401
          : error.code === "C6_SESSION_BUSY" || error.code === "C6_BUSY"
            ? 409
            : error.code === "C6_NO_CONTRACT" ||
                error.code === "C6_NO_INSTALLMENT" ||
                error.code === "C6_NO_OFFERS" ||
                error.code === "C6_CONTRACT_NOT_FOUND" ||
                error.code === "C6_REGISTRATION_NOT_FOUND"
              ? 422
              : error.code === "C6_NOT_CONFIGURED" ||
                  error.code === "C6_NO_PERMISSION"
                ? 503
                : 502;
      return jsonResponse(
        {
          ok: false,
          code: error.code,
          message: error.message,
        },
        status,
        invalidCredentials ? c6CredentialCookie(request, "", 0) : [],
      );
    }

    if (controller.signal.aborted) {
      return jsonResponse(
        {
          ok: false,
          code: "C6_TIMEOUT",
          message:
            "O C6 demorou além do esperado. Tente novamente em alguns instantes.",
        },
        504,
      );
    }

    return jsonResponse(
      {
        ok: false,
        code: "C6_UNEXPECTED",
        message:
          "O portal C6 não concluiu a simulação. Tente novamente mais tarde.",
      },
      502,
    );
  } finally {
    clearTimeout(timeout);
    c6SimulationsInFlight.delete(simulationKey);
  }
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const cookieValue = readCookie(
      request.headers.get("Cookie"),
      ACCESS_COOKIE_NAME,
    );
    const authenticated = await isAccessSessionValid(
      cookieValue,
      env.IMPERIO_ACCESS_COOKIE_SECRET,
    );

    if (PUBLIC_ASSET_PATHS.has(url.pathname)) {
      return handler.fetch(request, env, ctx);
    }

    if (url.pathname === "/auth/token" && request.method === "POST") {
      return handleTokenLogin(request, env);
    }

    if (url.pathname === "/auth/logout" && request.method === "POST") {
      return redirect(
        "/acesso?saiu=1",
        [
          sessionCookie(request, "", 0),
          c6CredentialCookie(request, "", 0),
        ],
      );
    }

    if (url.pathname === "/acesso") {
      return authenticated ? redirect("/") : accessPage(url);
    }

    if (!authenticated) {
      const returnPath = `${url.pathname}${url.search}`;
      return redirect(
        `/acesso?return_to=${encodeURIComponent(safeReturnPath(returnPath))}`,
      );
    }

    if (url.pathname === "/api/c6/session") {
      return handleC6CredentialSession(request, env);
    }

    if (url.pathname === "/api/c6/refin" && request.method === "POST") {
      return handleC6Simulation(request, env);
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
