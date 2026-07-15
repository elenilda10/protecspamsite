const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;

if (tg) {
  tg.ready();
  tg.expand();
  document.documentElement.style.setProperty("--bg", tg.themeParams.bg_color || "#0f172a");
}

// ==========================================
// 🌍 SISTEMA DE TRADUÇÃO DINÂMICA (I18N)
// ==========================================
function getTelegramLang() {
  let code = "pt";
  if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.language_code) {
    code = tg.initDataUnsafe.user.language_code.toLowerCase();
  }
  if (code.startsWith("en")) return "en";
  if (code.startsWith("es")) return "es";
  return "pt";
}

function getSavedLang() {
  let saved = localStorage.getItem("protecspam_lang");
  if (saved === "pt" || saved === "en" || saved === "es") {
    return saved;
  }
  return getTelegramLang();
}

let LANG = getSavedLang();

const I18N = {
  pt: {
    app_title: "ProtecSpam",
    app_subtitle: "Detalhes da mensagem removida",
    loading: "Carregando informações...",
    spam_detected: "🚨 Spam detectado",
    spam_desc: "Esta mensagem foi removida pelo sistema de proteção.",
    group: "Grupo",
    message: "Mensagem",
    user: "Usuário",
    user_id: "ID",
    reason: "Motivo",
    score: "Score",
    date: "Data",
    media_title: "🖼️ Mídia enviada",
    media_photo: "Imagem anexada",
    media_video: "Vídeo anexado",
    media_document: "Arquivo anexado",
    media_audio: "Áudio anexado",
    media_voice: "Mensagem de voz anexada",
    media_animation: "GIF/animação anexada",
    media_video_note: "Vídeo circular anexado",
    media_sticker: "Sticker anexado",
    open_file: "📎 Abrir arquivo",
    content_title: "📄 Conteúdo",
    content_empty: "Conteúdo não textual.",
    close: "Fechar",
    error_title: "⚠️ Erro",
    error_default: "Não foi possível carregar os dados.",
    error_no_payload: "Nenhum startapp payload foi encontrado.",
    error_not_found: "Conteúdo não encontrado ou ainda não salvo pela API.",
    unknown: "—"
  },
  en: {
    app_title: "ProtecSpam",
    app_subtitle: "Removed message details",
    loading: "Loading information...",
    spam_detected: "🚨 Spam detected",
    spam_desc: "This message was removed by the protection system.",
    group: "Group",
    message: "Message",
    user: "User",
    user_id: "ID",
    reason: "Reason",
    score: "Score",
    date: "Date",
    media_title: "🖼️ Sent media",
    media_photo: "Attached image",
    media_video: "Attached video",
    media_document: "Attached file",
    media_audio: "Attached audio",
    media_voice: "Attached voice message",
    media_animation: "Attached GIF/animation",
    media_video_note: "Attached video note",
    media_sticker: "Attached sticker",
    open_file: "📎 Open file",
    content_title: "📄 Content",
    content_empty: "Non-text content.",
    close: "Close",
    error_title: "⚠️ Error",
    error_default: "Could not load the data.",
    error_no_payload: "No startapp payload was found.",
    error_not_found: "Content not found or not saved by the API yet.",
    unknown: "—"
  },
  es: {
    app_title: "ProtecSpam",
    app_subtitle: "Detalles del mensaje eliminado",
    loading: "Cargando información...",
    spam_detected: "🚨 Spam detected",
    spam_desc: "Este mensaje fue eliminado por el sistema de protección.",
    group: "Grupo",
    message: "Mensaje",
    user: "Usuario",
    user_id: "ID",
    reason: "Motivo",
    score: "Puntuación",
    date: "Fecha",
    media_title: "🖼️ Multimedia enviada",
    media_photo: "Imagen adjunta",
    media_video: "Video adjunto",
    media_document: "Archivo adjunto",
    media_audio: "Audio adjunto",
    media_voice: "Mensaje de voz adjunto",
    media_animation: "GIF/animación adjunta",
    media_video_note: "Video circular adjunto",
    media_sticker: "Sticker adjunto",
    open_file: "📎 Abrir archivo",
    content_title: "📄 Contenido",
    content_empty: "Contenido no textual.",
    close: "Cerrar",
    error_title: "⚠️ Error",
    error_default: "No se pudieron cargar los datos.",
    error_no_payload: "No se encontró ningún payload startapp.",
    error_not_found: "Contenido no encontrado o aún no guardado por la API.",
    unknown: "—"
  }
};

function t(key) {
  return (I18N[LANG] && I18N[LANG][key]) || I18N.pt[key] || key;
}

// ==========================================
// 🛠️ FUNÇÕES AUXILIARES DO DOM
// ==========================================
function getStartParam() {
  let param = "";
  if (tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param) {
    param = tg.initDataUnsafe.start_param;
  } else {
    const url = new URL(window.location.href);
    param = url.searchParams.get("tgWebAppStartParam") || url.searchParams.get("startapp") || "";
  }
  return String(param).trim().replace(/[^a-zA-Z0-9_-]/g, "");
}

function show(id) {
  let el = document.getElementById(id);
  if (el) el.classList.remove("hidden");
}

function hide(id) {
  let el = document.getElementById(id);
  if (el) el.classList.add("hidden");
}

function setText(id, value) {
  let el = document.getElementById(id);
  if (el) el.textContent = value || t("unknown");
}

function applyStaticTranslations() {
  setText("appTitle", t("app_title"));
  setText("appSubtitle", t("app_subtitle"));
  setText("loadingText", t("loading"));
  setText("alertTitle", t("spam_detected"));
  setText("alertDesc", t("spam_desc"));
  setText("labelGroup", t("group"));
  setText("labelMessage", t("message"));
  setText("labelUser", t("user"));
  setText("labelUserId", t("user_id"));
  setText("labelReason", t("reason"));
  setText("labelScore", t("score"));
  setText("labelDate", t("date"));
  setText("mediaTitle", t("media_title"));
  setText("contentTitle", t("content_title"));
  setText("closeBtn", t("close"));
  setText("errorTitle", t("error_title"));
  setText("errorText", t("error_default"));
}

function updateLangButtons() {
  document.querySelectorAll(".lang-switch button").forEach(function(btn) {
    if (btn.dataset.lang === LANG) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

function setLang(lang) {
  if (!I18N[lang]) return;
  LANG = lang;
  localStorage.setItem("protecspam_lang", lang);
  applyStaticTranslations();
  updateLangButtons();

  if (window.__LAST_SPAM_DATA__ && window.__LAST_PAYLOAD__) {
    renderSpam(window.__LAST_SPAM_DATA__, window.__LAST_PAYLOAD__, true);
  }
}

function renderError(text) {
  hide("loading");
  setText("errorText", text);
  show("error");
}

// ==========================================
// 🖼️ COMPONENTE DE RENDERIZAÇÃO DE MÍDIA
// ==========================================
function getMediaType(media) {
  if (!media) return null;
  if (media.photo) return "photo";
  if (media.video) return "video";
  if (media.audio) return "audio";
  if (media.voice) return "voice";
  if (media.animation) return "animation";
  if (media.video_note) return "video_note";
  if (media.sticker) return "sticker";
  if (media.document) return "document";
  return null;
}

function renderMedia(data, payload) {
  let media = data.media || {};
  let type = getMediaType(media);

  if (!type) {
    hide("mediaCard");
    return;
  }

  let mediaBox = document.getElementById("mediaBox");
  if (!mediaBox) return;

  let mediaUrl = `/api/media?payload=${encodeURIComponent(payload)}&type=${encodeURIComponent(type)}`;
  let html = "";

  if (type === "photo") {
    html = `<p class="media-label">${t("media_photo")}</p><img class="media-preview" src="${mediaUrl}" alt="spam media" />`;
  }
  if (type === "video") {
    html = `<p class="media-label">${t("media_video")}</p><video class="media-preview" controls src="${mediaUrl}"></video>`;
  }
  if (type === "audio") {
    html = `<p class="media-label">${t("media_audio")}</p><audio class="audio-preview" controls src="${mediaUrl}"></audio>`;
  }
  if (type === "voice") {
    html = `<p class="media-label">${t("media_voice")}</p><audio class="audio-preview" controls src="${mediaUrl}"></audio>`;
  }
  if (type === "animation") {
    html = `<p class="media-label">${t("media_animation")}</p><video class="media-preview" controls autoplay muted loop src="${mediaUrl}"></video>`;
  }
  if (type === "video_note") {
    html = `<p class="media-label">${t("media_video_note")}</p><video class="media-preview" controls src="${mediaUrl}"></video>`;
  }
  if (type === "sticker") {
    html = `<p class="media-label">${t("media_sticker")}</p><img class="media-preview" src="${mediaUrl}" alt="sticker" />`;
  }
  if (type === "document") {
    html = `<p class="media-label">${t("media_document")}</p><a class="file-btn" href="${mediaUrl}" target="_blank">${t("open_file")}</a>`;
  }

  mediaBox.innerHTML = html;
  show("mediaCard");
}

// ==========================================
// 📊 APRESENTAÇÃO DO RELATÓRIO DO SPAM
// ==========================================
function renderSpam(data, payload, keepVisible) {
  window.__LAST_SPAM_DATA__ = data;
  window.__LAST_PAYLOAD__ = payload;

  let user = data.user || {};
  let userText = user.name || t("unknown");
  if (user.username) {
    userText += ` (@${user.username})`;
  }

  setText("group", data.group_title || t("unknown"));
  setText("message", data.message_id || t("unknown"));
  setText("user", userText);
  setText("userId", user.id || t("unknown"));
  setText("reason", data.reason || t("unknown"));
  setText("score", String(data.score || 0));
  setText("date", data.date || t("unknown"));
  setText("spamText", data.content || t("content_empty"));

  // Barra Dinâmica de Score (Interativa)
  let scoreVal = data.score || 0;
  let scoreBar = document.getElementById("scoreBar");
  if (scoreBar) {
    let percentage = Math.min(scoreVal * 10, 100);
    scoreBar.style.width = percentage + "%";
    
    if (scoreVal >= 7) {
      scoreBar.className = "h-full rounded-full transition-all duration-1000 bg-rose-500";
    } else if (scoreVal >= 4) {
      scoreBar.className = "h-full rounded-full transition-all duration-1000 bg-amber-500";
    } else if (scoreVal >= 2) {
      scoreBar.className = "h-full rounded-full transition-all duration-1000 bg-blue-500";
    } else {
      scoreBar.className = "h-full rounded-full transition-all duration-1000 bg-emerald-500";
    }
  }

  renderMedia(data, payload);

  if (!keepVisible) {
    hide("loading");
    show("content");
  }
}

// ==========================================
// 📥 FETCH DE DADOS (BLINDADO CONTRA CACHE)
// ==========================================
async function loadSpam(payload) {
  const res = await fetch(
    `/api/get-spam?payload=${encodeURIComponent(payload)}&_t=${Date.now()}`,
    { cache: "no-store" }
  );
  const json = await res.json();

  if (!json.ok || !json.data) {
    let errMsg = json.detail ? `Erro da Vercel: ${json.detail}` : (json.error || t("error_not_found"));
    throw new Error(errMsg);
  }
  return json.data;
}

// ==========================================
// 🎮 ESCUTADORES DE EVENTOS DO APP
// ==========================================
document.getElementById("closeBtn").addEventListener("click", function() {
  if (tg) {
    tg.close();
  } else {
    window.close();
  }
});

document.querySelectorAll(".lang-switch button").forEach(function(btn) {
  btn.addEventListener("click", function() {
    setLang(btn.dataset.lang);
  });
});

// ==========================================
// 🚀 INICIALIZAÇÃO DO APP
// ==========================================
(async function main() {
  applyStaticTranslations();
  updateLangButtons();

  let payload = getStartParam();

  if (!payload) {
    renderError(t("error_no_payload"));
    return;
  }

  try {
    let data = await loadSpam(payload);
    renderSpam(data, payload, false);
  } catch (e) {
    renderError(e.message || t("error_not_found"));
  }
})();
