const { getStore } = require("@netlify/blobs");

exports.handler = async function(event) {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ok: false,
          error: "Method not allowed"
        })
      };
    }

    const apiKey = event.headers["x-api-key"];

    if (!apiKey || apiKey !== process.env.SPAM_API_KEY) {
      return {
        statusCode: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ok: false,
          error: "Unauthorized"
        })
      };
    }

    const body = JSON.parse(event.body || "{}");

    const payload = String(body.payload || "")
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .slice(0, 120);

    if (!payload) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ok: false,
          error: "Missing payload"
        })
      };
    }

    const store = getStore("spam_reports");

    const data = {
      payload: payload,
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

    await store.setJSON(payload, data);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: true,
        payload: payload
      })
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: false,
        error: e.message || "Internal error"
      })
    };
  }
};
