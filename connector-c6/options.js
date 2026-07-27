const form = document.querySelector("#credentials-form");
const userInput = document.querySelector("#c6-user");
const passwordInput = document.querySelector("#c6-password");
const status = document.querySelector("#status");

async function loadCredentials() {
  const values = await chrome.storage.local.get(["c6User", "c6Password"]);
  userInput.value = values.c6User || "";
  passwordInput.value = values.c6Password || "";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await chrome.storage.local.set({
    c6User: userInput.value.trim(),
    c6Password: passwordInput.value,
  });
  status.textContent = "Acesso salvo com segurança neste computador.";
  window.setTimeout(() => {
    status.textContent = "";
  }, 3500);
});

loadCredentials();
