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

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return json(res, 405, { ok: false, error: "Method not allowed" });
    }

    const payload = safePayload(req.query.payload);

    if (!payload) {
      return json(res, 400, { ok: false, error: "Missing payload parameter" });
    }

    // Buscaremos arquivos que COMECEM com essa pasta e id
    const prefixTarget = "spam-reports/" + payload;

    const token = process.env.BLOB_READ_WRITE_TOKEN;

    // Busca o arquivo no storage usando o prefixo limpo e o token explícito
    const { blobs } = await list({ 
      prefix: prefixTarget, 
      limit: 1,
      token: token 
    });

    if (!blobs || blobs.length === 0) {
      return json(res, 404, { ok: false, error: "Relatório não encontrado no armazenamento" });
    }

    // Correção: Acessa o índice 0 do array retornado
    const blobUrl = blobs[0].url;

    // Faz o download do conteúdo
    const response = await fetch(blobUrl);
    
    if (!response.ok) {
      return json(res, 500, { ok: false, error: "Falha ao ler o conteúdo do arquivo no storage" });
    }

    const data = await response.json();

    return json(res, 200, {
      ok: true,
      data: data
    });

  } catch (e) {
    console.error("Erro no GET handler:", e);
    return json(res, 500, { ok: false, error: "Erro interno no servidor: " + (e.message || "Internal error") });
  }
};
