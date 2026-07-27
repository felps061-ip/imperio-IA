(() => {
  const originalAlert = window.alert.bind(window);
  const originalConfirm = window.confirm.bind(window);
  let automationActive = false;

  window.addEventListener("imperio-c6-automation", (event) => {
    automationActive = Boolean(event.detail?.active);
  });

  window.alert = (message) => {
    if (automationActive) {
      window.postMessage(
        { source: "imperio-c6-page", type: "DIALOG", message: String(message) },
        window.location.origin,
      );
      return;
    }
    return originalAlert(message);
  };

  window.confirm = (message) => {
    if (automationActive) {
      window.postMessage(
        { source: "imperio-c6-page", type: "DIALOG", message: String(message) },
        window.location.origin,
      );
      return true;
    }
    return originalConfirm(message);
  };
})();
