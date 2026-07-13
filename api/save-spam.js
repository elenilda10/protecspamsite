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
      return json(res, 405, {
        ok: false,
        error: "Method not allowed"
      });
    }

    const apiKey = req.headers["x-api-key"];

    if (!apiKey || apiKey !== process.env.SPAM_API_KEY) {
      return json(res, 401, {
        ok: false,
        error: "Unauthorized: API Key incorreta ou ausente na Vercel."
      });
    }

    const body =
      typeof req.body === "object"
        ? req.body
        : JSON.parse(req.body || "{}");

    const payload = safePayload(body.payload);

    if (!payload) {
      return json(res, 400, {
        ok: false,
        error: "Missing payload"
      });
    }

    const pathname = "spam-reports/" + payload + ".json";

    const data = {
      payload: payload,
      pathname: pathname,

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

    // 🛡️ CORREÇÃO CIRÚRGICA: Alterado de "private" para "public"
    // Isso permite que o Mini App leia o relatório instantaneamente sem erro de permissão!
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
      pathname: pathname,
      blob: {
        url: blob.url,
        pathname: blob.pathname
      }
    });

  } catch (e) {
    return json(res, 500, {
      ok: false,
      error: "Erro no Vercel Blob: " + (e.message || "Internal error")
    });
  }
};
