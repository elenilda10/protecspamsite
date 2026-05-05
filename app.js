const tg = window.Telegram && window.Telegram.WebApp
  ? window.Telegram.WebApp
  : null;

if (tg) {
  tg.ready();
  tg.expand();

  if (tg.themeParams && tg.themeParams.bg_color) {
    document.documentElement.style.setProperty("--bg", tg.themeParams.bg_color);
  }
}

function getStartParam() {
  if (tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param) {
    return tg.initDataUnsafe.start_param;
  }

  const url = new URL(window.location.href);

  return (
    url.searchParams.get("tgWebAppStartParam") ||
    url.searchParams.get("startapp") ||
    ""
  );
}

function show(id) {
  document.getElementById(id).classList.remove("hidden");
}

function hide(id) {
  document.getElementById(id).classList.add("hidden");
}

function setText(id, value) {
  document.getElementById(id).textContent = value || "—";
}

function parsePayload(payload) {
  const parts = String(payload || "").split("_");

  return {
    type: parts[0] || "",
    chatId: parts[1] || "",
    messageId: parts[2] || ""
  };
}

function renderDemo(payload) {
  const parsed = parsePayload(payload);

  setText("payload", payload);
  setText("group", parsed.chatId ? "Chat " + parsed.chatId : "—");
  setText("messageId", parsed.messageId || "—");
  setText("user", "Disponível após conectar API");
  setText("score", "Disponível após conectar API");

  setText(
    "spamText",
    "Payload recebido com sucesso:\n\n" +
    payload +
    "\n\nAgora falta conectar este site com uma API para buscar o conteúdo salvo do spam."
  );

  hide("loading");
  show("content");
}

function renderError(text) {
  hide("loading");
  setText("errorText", text);
  show("error");
}

document.getElementById("closeBtn").addEventListener("click", () => {
  if (tg) {
    tg.close();
  } else {
    window.close();
  }
});

(function main() {
  const payload = getStartParam();

  if (!payload) {
    renderError("Nenhum startapp payload foi encontrado.");
    return;
  }

  renderDemo(payload);
})();
