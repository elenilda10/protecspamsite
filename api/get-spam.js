const { head, get } = require("@vercel/blob");

function json(res, status, data) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

function safePayload(value) {
  return String(value || "")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 120);
}

async function readSpam(payload) {
  const pathname = "spam-reports/" + payload + ".json";

  const blob = await head(pathname, {
    access: "private"
  });

  const file = await get(blob.url, {
    access: "private"
  });

  const text = await file.text();

  return JSON.parse(text);
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return json(res, 405, {
        ok: false,
        error: "Method not allowed"
      });
    }

    const payload = safePayload(req.query.payload);

    if (!payload) {
      return json(res, 400, {
        ok: false,
        error: "Missing payload"
      });
    }

    let data = null;

    try {
      data = await readSpam(payload);
    } catch (e) {
      return json(res, 404, {
        ok: false,
        error: "Not found"
      });
    }

    return json(res, 200, {
      ok: true,
      data: data
    });

  } catch (e) {
    return json(res, 500, {
      ok: false,
      error: e.message || "Internal error"
    });
  }
};
