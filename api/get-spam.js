const { list } = require("@vercel/blob");

// Adicionamos CORS e bloqueio de cache para o WebView do Telegram!
function json(res, status, data) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.status(status).end(JSON.stringify(data));
}

function safePayload(value) {
  return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 120);
}

async function readSpam(payload) {
  const pathname = "spam-reports/" + payload + ".json";
  
  // Busca o arquivo no Vercel Blob
  const { blobs } = await list({ prefix: pathname, limit: 1 });

  if (!blobs || blobs.length === 0) {
    throw new Error("Relatório não encontrado no storage (Blobs = 0).");
  }

  // 🛡️ CORREÇÃO: Usa .url como prioridade, com fallback para .downloadUrl
  const fileUrl = blobs[0].url || blobs[0].downloadUrl;
  
  if (!fileUrl) {
    throw new Error("URL de download não gerada pelo Vercel Blob.");
  }

  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error("Falha ao ler o conteúdo do arquivo HTTP: " + response.status);
  }

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
      // Devolve o detalhe exato do erro para facilitar o debug na tela do Mini App
      return json(res, 404, { 
        ok: false, 
        error: "Not found", 
        detail: e.message 
      });
    }

    return json(res, 200, { ok: true, data: data });

  } catch (e) {
    return json(res, 500, { ok: false, error: e.message || "Internal error" });
  }
};
