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

// ===============================
// IDIOMA
// ===============================
function getLang() {
  let code = "pt";

  if (
    tg &&
    tg.initDataUnsafe &&
    tg.initDataUnsafe.user &&
    tg.initDataUnsafe.user.language_code
  ) {
    code = tg.initDataUnsafe.user.language_code.toLowerCase();
  }

  if (code.startsWith("en")) return "en";
  if (code.startsWith("es")) return "es";
  return "pt";
}

const LANG = getLang();

const I18N = {
  pt: {
    app_title: "ProtecSpam",
    app_subtitle: "Detalhes da mensagem removida",

    loading: "Carregando informações...",

    spam_detected: "🚨 Spam detectado",
    spam_desc: "Esta mensagem foi removida pelo sistema de proteção.",

    payload: "Payload",
    group: "Grupo",
    message: "Mensagem",
    user: "Usuário",
    score: "Score",

    content_title: "📄 Conteúdo",
    content_empty: "Conteúdo não carregado.",

    close: "Fechar",

    error_title: "⚠️ Erro",
    error_default: "Não foi possível carregar os dados.",
    error_no_payload: "Nenhum startapp payload foi encontrado.",
    error_not_found: "Conteúdo não encontrado ou ainda não salvo pela API.",

    spam_report_title: "🚨 Spam detectado",
    group_label: "👥 Grupo",
    user_label: "👤 Usuário",
    id_label: "🆔 ID",
    reason_label: "❌ Motivo",
    score_label: "📊 Score",
    date_label: "🕒 Data",
    content_label: "📄 Conteúdo",

    unknown: "—"
  },

  en: {
    app_title: "ProtecSpam",
    app_subtitle: "Removed message details",

    loading: "Loading information...",

    spam_detected: "🚨 Spam detected",
    spam_desc: "This message was removed by the protection system.",

    payload: "Payload",
    group: "Group",
    message: "Message",
    user: "User",
    score: "Score",

    content_title: "📄 Content",
    content_empty: "Content not loaded.",

    close: "Close",

    error_title: "⚠️ Error",
    error_default: "Could not load the data.",
    error_no_payload: "No startapp payload was found.",
    error_not_found: "Content not found or not saved by the API yet.",

    spam_report_title: "🚨 Spam detected",
    group_label: "👥 Group",
    user_label: "👤 User",
    id_label: "🆔 ID",
    reason_label: "❌ Reason",
    score_label: "📊 Score",
    date_label: "🕒 Date",
    content_label: "📄 Content",

    unknown: "—"
  },

  es: {
    app_title: "ProtecSpam",
    app_subtitle: "Detalles del mensaje eliminado",

    loading: "Cargando información...",

    spam_detected: "🚨 Spam detectado",
    spam_desc: "Este mensaje fue eliminado por el sistema de protección.",

    payload: "Payload",
    group: "Grupo",
    message: "Mensaje",
    user: "Usuario",
    score: "Puntuación",

    content_title: "📄 Contenido",
    content_empty: "Contenido no cargado.",

    close: "Cerrar",

    error_title: "⚠️ Error",
    error_default: "No se pudieron cargar los datos.",
    error_no_payload: "No se encontró ningún payload startapp.",
    error_not_found: "Contenido no encontrado o aún no guardado por la API.",

    spam_report_title: "🚨 Spam detectado",
    group_label: "👥 Grupo",
    user_label: "👤 Usuario",
    id_label: "🆔 ID",
    reason_label: "❌ Motivo",
    score_label: "📊 Puntuación",
    date_label: "🕒 Fecha",
    content_label: "📄 Contenido",

    unknown: "—"
  }
};

function t(key) {
  return (I18N[LANG] && I18N[LANG][key]) || I18N.pt[key] || key;
}

// ===============================
// HELPERS
// ===============================
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
  let el = document.getElementById(id);
  if (el) el.textContent = value || t("unknown");
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

// ===============================
// APLICA TRADUÇÃO NO HTML
// ===============================
function applyStaticTranslations() {
  setText("appTitle", t("app_title"));
  setText("appSubtitle", t("app_subtitle"));
  setText("loadingText", t("loading"));

  setText("alertTitle", t("spam_detected"));
  setText("alertDesc", t("spam_desc"));

  setText("labelPayload", t("payload"));
  setText("labelGroup", t("group"));
  setText("labelMessage", t("message"));
  setText("labelUser", t("user"));
  setText("labelScore", t("score"));

  setText("contentTitle", t("content_title"));
  setText("spamText", t("content_empty"));

  setText("closeBtn", t("close"));

  setText("errorTitle", t("error_title"));
  setText("errorText", t("error_default"));
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

  let userText = user.name || t("unknown");

  if (user.username) {
    userText += " (@" + user.username + ")";
  }

  setText("user", userText);
  setText("score", String(data.score || 0));

  let content =
    t("spam_report_title") + "\n\n" +
    t("group_label") + ": " + (data.group_title || t("unknown")) + "\n" +
    t("user_label") + ": " + userText + "\n" +
    t("id_label") + ": " + (user.id || t("unknown")) + "\n" +
    t("reason_label") + ": " + (data.reason || t("unknown")) + "\n" +
    t("score_label") + ": " + (data.score || 0) + "\n" +
    t("date_label") + ": " + (data.date || t("unknown")) + "\n\n" +
    t("content_label") + ":\n" +
    (data.content || t("content_empty"));

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
    throw new Error(json.error || t("error_not_found"));
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
  applyStaticTranslations();

  let payload = getStartParam();

  if (!payload) {
    renderError(t("error_no_payload"));
    return;
  }

  try {
    let data = await loadSpam(payload);
    renderSpam(data, payload);
  } catch (e) {
    renderError(t("error_not_found"));
  }
})();
