const tg = window.Telegram && window.Telegram.WebApp
  ? window.Telegram.WebApp
  : null;

if (tg) {
  tg.ready();
  tg.expand();

  document.documentElement.style.setProperty(
    "--bg",
    tg.themeParams.bg_color || "#0f172a"
  );
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
  let parts = String(payload || "").split("_");

  return {
    type: parts[0] || "",
    chatId: parts[1] || "",
    messageId: parts[2] || "",
    token: parts[3] || ""
  };
}

function renderError(text) {
  hide("loading");
  setText("errorText", text);
  show("error");
}

function renderSpam(data, payload) {
  let parsed = parsePayload(payload);
  let user = data.user || {};

  setText("payload", payload);
  setText("group", data.group_title || ("Chat " + (data.chat_id || parsed.chatId)));
  setText("message", data.message_id || parsed.messageId);

  let userText = user.name || "—";

  if (user.username) {
    userText += " (@" + user.username + ")";
  }

  setText("user", userText);
  setText("score", String(data.score || 0));

  let content =
    "🚨 Spam detectado\n\n" +
    "👥 Grupo: " + (data.group_title || "—") + "\n" +
    "👤 Usuário: " + userText + "\n" +
    "🆔 ID: " + (user.id || "—") + "\n" +
    "❌ Motivo: " + (data.reason || "—") + "\n" +
    "📊 Score: " + (data.score || 0) + "\n" +
    "🕒 Data: " + (data.date || "—") + "\n\n" +
    "📄 Conteúdo:\n" +
    (data.content || "Conteúdo não textual");

  setText("spamText", content);

  hide("loading");
  show("content");
}

async function loadSpam(payload) {
  const res = await fetch(
    "/.netlify/functions/get-spam?payload=" + encodeURIComponent(payload)
  );

  const json = await res.json();

  if (!json.ok || !json.data) {
    throw new Error(json.error || "Conteúdo não encontrado.");
  }

  return json.data;
}

document.getElementById("closeBtn").addEventListener("click", () => {
  if (tg) {
    tg.close();
  } else {
    window.close();
  }
});

(async function main() {
  let payload = getStartParam();

  if (!payload) {
    renderError("Nenhum startapp payload foi encontrado.");
    return;
  }

  try {
    let data = await loadSpam(payload);
    renderSpam(data, payload);
  } catch (e) {
    renderError("Conteúdo não encontrado ou ainda não salvo pela API.");
  }
})();
