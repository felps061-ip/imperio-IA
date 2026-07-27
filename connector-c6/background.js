const C6_URL = "https://c6.c6consig.com.br/WebAutorizador/";
const JOB_KEY = "imperioC6ActiveJob";

chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());

async function getCredentials() {
  const values = await chrome.storage.local.get(["c6User", "c6Password"]);
  return {
    user: String(values.c6User || "").trim(),
    password: String(values.c6Password || ""),
  };
}

async function getJob() {
  const values = await chrome.storage.session.get(JOB_KEY);
  return values[JOB_KEY] || null;
}

async function saveJob(job) {
  await chrome.storage.session.set({ [JOB_KEY]: job });
}

async function clearJob() {
  await chrome.storage.session.remove(JOB_KEY);
}

async function sendToSite(job, payload) {
  if (!job?.siteTabId) return;
  try {
    await chrome.tabs.sendMessage(job.siteTabId, {
      source: "imperio-c6-connector",
      ...payload,
    });
  } catch {
    // A aba do Império IA pode ter sido fechada durante a consulta.
  }
}

async function progress(job, message) {
  await sendToSite(job, {
    type: "IMPERIO_C6_REFIN_PROGRESS",
    message,
  });
}

async function failJob(job, message) {
  await sendToSite(job, {
    type: "IMPERIO_C6_REFIN_ERROR",
    message,
  });
  await clearJob();
}

async function findOrCreateC6Tab() {
  const tabs = await chrome.tabs.query({ url: "https://c6.c6consig.com.br/*" });
  if (tabs.length) {
    await chrome.tabs.update(tabs[0].id, { active: true });
    return tabs[0];
  }
  return chrome.tabs.create({ url: C6_URL, active: true });
}

async function startJob(message, sender) {
  const credentials = await getCredentials();
  if (!credentials.user || !credentials.password) {
    return {
      ok: false,
      message:
        "O conector está instalado, mas o acesso do C6 ainda não foi configurado.",
    };
  }

  const cpf = String(message.cpf || "").replace(/\D/g, "");
  if (cpf.length !== 11) {
    return { ok: false, message: "CPF inválido para a consulta." };
  }

  const c6Tab = await findOrCreateC6Tab();
  const job = {
    id: crypto.randomUUID(),
    siteTabId: sender.tab?.id,
    c6TabId: c6Tab.id,
    cpf,
    stage: "open",
    parcel: "",
    startedAt: Date.now(),
  };
  await saveJob(job);
  await progress(job, "Abrindo o portal C6…");

  try {
    await chrome.tabs.sendMessage(c6Tab.id, {
      type: "IMPERIO_C6_RUN_JOB",
      job,
      credentials,
    });
  } catch {
    // O conteúdo será acionado assim que a página do C6 terminar de carregar.
  }

  return { ok: true };
}

async function resumeJob(sender) {
  const job = await getJob();
  if (!job || sender.tab?.id !== job.c6TabId) return { ok: false };

  const credentials = await getCredentials();
  try {
    await chrome.tabs.sendMessage(job.c6TabId, {
      type: "IMPERIO_C6_RUN_JOB",
      job,
      credentials,
    });
  } catch {
    // Uma navegação pode substituir a página antes do envio.
  }
  return { ok: true };
}

async function handleMessage(message, sender) {
  if (message?.type === "IMPERIO_C6_PING") {
    const credentials = await getCredentials();
    return {
      ok: true,
      configured: Boolean(credentials.user && credentials.password),
      version: chrome.runtime.getManifest().version,
    };
  }

  if (message?.type === "IMPERIO_C6_REFIN_REQUEST") {
    return startJob(message, sender);
  }

  if (message?.type === "IMPERIO_C6_PAGE_READY") {
    return resumeJob(sender);
  }

  if (message?.type === "IMPERIO_C6_SET_STAGE") {
    const job = await getJob();
    if (!job || sender.tab?.id !== job.c6TabId) return { ok: false };
    const updated = {
      ...job,
      stage: message.stage || job.stage,
      parcel: message.parcel || job.parcel,
    };
    await saveJob(updated);
    if (message.message) await progress(updated, message.message);
    return { ok: true, job: updated };
  }

  if (message?.type === "IMPERIO_C6_COMPLETE") {
    const job = await getJob();
    if (!job || sender.tab?.id !== job.c6TabId) return { ok: false };
    await sendToSite(job, {
      type: "IMPERIO_C6_REFIN_RESULT",
      offers: Array.isArray(message.offers) ? message.offers : [],
    });
    await clearJob();
    return { ok: true };
  }

  if (message?.type === "IMPERIO_C6_ERROR") {
    const job = await getJob();
    if (job) await failJob(job, message.message || "O portal C6 interrompeu a simulação.");
    return { ok: true };
  }

  return { ok: false };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch((error) =>
      sendResponse({
        ok: false,
        message: error instanceof Error ? error.message : String(error),
      }),
    );
  return true;
});
