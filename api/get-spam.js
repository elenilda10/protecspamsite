const { list } = require("@vercel/blob");

// Adicionamos os cabeçalhos de CORS (Access-Control) aqui!
function json(res, status, data) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.status(status).end(JSON.stringify(data));
}

function safePayload(value) {
  return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 120);
}

async function readSpam(payload) {
  const pathname = "spam-reports/" + payload + ".json";
  const { blobs } = await list({ prefix: pathname, limit: 1 });

  if (!blobs || blobs.length === 0) throw new Error("Blob not found");

  const response = await fetch(blobs[0].downloadUrl);
  if (!response.ok) throw new Error("Failed to fetch blob contents");

  return await response.json();
}

module.exports = async function handler(req, res) {
  // Tratamento rápido para requisições de segurança do navegador (Preflight CORS)
  if (req.method === "OPTIONS") {
    return json(res, 200, { ok: true });
  }

  try {
    if (req.method !== "GET") {
      return json(res, 405, { ok: false, error: "Method not allowed" });
    }

    const payload = safePayload(req.query.payload);

    if (!payload) {
      return json(res, 400, { ok: false, error: "Missing payload" });
    }

    let data;
    try {
      data = await readSpam(payload);
    } catch (e) {
      return json(res, 404, { ok: false, error: "Not found", detail: e.message });
    }

    return json(res, 200, { ok: true, data: data });

  } catch (e) {
    return json(res, 500, { ok: false, error: e.message || "Internal error" });
  }
};

