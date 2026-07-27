const SITE_SOURCE = "imperio-ia";
const CONNECTOR_SOURCE = "imperio-c6-connector";

function forwardToSite(payload) {
  window.postMessage(
    {
      source: CONNECTOR_SOURCE,
      ...payload,
    },
    window.location.origin,
  );
}

window.addEventListener("message", async (event) => {
  if (event.source !== window || event.data?.source !== SITE_SOURCE) return;

  if (event.data.type === "IMPERIO_C6_PING") {
    const response = await chrome.runtime.sendMessage({
      type: "IMPERIO_C6_PING",
    });
    forwardToSite({
      type: "IMPERIO_C6_CONNECTOR_READY",
      configured: Boolean(response?.configured),
      version: response?.version,
    });
    return;
  }

  if (event.data.type === "IMPERIO_C6_REFIN_REQUEST") {
    const response = await chrome.runtime.sendMessage({
      type: "IMPERIO_C6_REFIN_REQUEST",
      cpf: event.data.cpf,
    });
    if (!response?.ok) {
      forwardToSite({
        type: "IMPERIO_C6_REFIN_ERROR",
        message: response?.message || "Não foi possível iniciar o C6.",
      });
    }
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.source === CONNECTOR_SOURCE) forwardToSite(message);
});
