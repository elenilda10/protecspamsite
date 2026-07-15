const { put } = require("@vercel/blob");

function json(res, status, data) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

function safePayload(value) {
  return String(value || "")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 120);
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return json(res, 405, { ok: false, error: "Method not allowed" });
    }

    // 🔒 Validação de Segurança utilizando sua SPAM_API_KEY
    const apiKey = req.headers["x-api-key"];
    if (!apiKey || apiKey !== process.env.SPAM_API_KEY) {
      return json(res, 401, { ok: false, error: "Unauthorized: Chave inválida" });
    }

    const body = typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}");
    const payload = safePayload(body.payload);

    if (!payload) {
      return json(res, 400, { ok: false, error: "Missing payload" });
    }

    // Determina a pasta de destino dependendo do tipo do spam
    let pathname;
    if (body.media && (body.media.photo || body.media.video)) {
      pathname = `spam-media/${payload}.json`;
    } else {
      pathname = `spam-reports/${payload}.json`;
    }

    const data = {
      payload,
      pathname,
      group_title: body.group_title || "",
      chat_id: body.chat_id || "",
      message_id: body.message_id || "",
      date: body.date || "",
      user: {
        id: body.user_id || "",
        name: body.user_name || "",
        username: body.username || "",
        is_bot: body.is_bot === true
      },
      reason: body.reason || "",
      score: body.score || 0,
      categories: Array.isArray(body.categories) ? body.categories : [],
      content: body.content || "Conteúdo não textual",
      media: body.media || {},
      profile_url: body.profile_url || "",
      created_at: Date.now()
    };

    // ✅ SALVAMENTO PÚBLICO NATIVO (Sincronizado com o novo selo "Public" do seu Blob)
    const blob = await put(
      pathname,
      JSON.stringify(data),
      {
        access: "public", 
        contentType: "application/json",
        allowOverwrite: true,
        addRandomSuffix: false
      }
    );

    return json(res, 200, {
      ok: true,
      payload: payload,
      pathname: blob.pathname,
      blob: {
        url: blob.url, // URL pública permanente
        pathname: blob.pathname
      }
    });

  } catch (e) {
    console.error("Erro ao salvar mídia/dados:", e);
    return json(res, 500, { ok: false, error: "Erro no Vercel Blob: " + (e.message || "Erro interno") });
  }
};
