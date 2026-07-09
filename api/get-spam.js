const { list } = require("@vercel/blob");

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

  // 1. Procura o ficheiro exato no Vercel Blob
  const { blobs } = await list({
    prefix: pathname,
    limit: 1
  });

  if (!blobs || blobs.length === 0) {
    throw new Error("Blob not found");
  }

  // 2. Usa a URL de download seguro gerada pela própria Vercel
  const response = await fetch(blobs[0].downloadUrl);

  if (!response.ok) {
    throw new Error("Failed to fetch blob contents");
  }

  // 3. Lê e converte o conteúdo JSON automaticamente
  return await response.json();
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

    let data;

    try {
      data = await readSpam(payload);
    } catch (e) {
      return json(res, 404, {
        ok: false,
        error: "Not found",
        detail: e.message || String(e)
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
