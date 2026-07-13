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
    // 1. Garante que só aceita requisições GET
    if (req.method !== "GET") {
      return json(res, 405, { ok: false, error: "Method not allowed" });
    }

    // 2. CORREÇÃO: Lê da Query String (?payload=...) e não do body
    const payload = safePayload(req.query.payload);

    if (!payload) {
      return json(res, 400, { ok: false, error: "Missing payload parameter" });
    }

    const pathname = "spam-reports/" + payload + ".json";

    // 3. CORREÇÃO: Procura pelo prefixo usando list() para evitar erro de URL do head()
    const { blobs } = await list({ prefix: pathname, limit: 1 });

    // Se o array voltar vazio, o arquivo realmente não existe no Blob
    if (!blobs || blobs.length === 0) {
      return json(res, 404, { ok: false, error: "Relatório não encontrado no armazenamento" });
    }

    // 4. Busca o conteúdo do JSON usando a URL pública retornada
    const response = await fetch(blobs[0].url);
    
    if (!response.ok) {
      return json(res, 500, { ok: false, error: "Falha ao ler o conteúdo do relatório" });
    }

    const data = await response.json();

    // 5. Retorna o relatório para o Mini App
    return json(res, 200, {
      ok: true,
      data: data
    });

  } catch (e) {
    return json(res, 500, {
      ok: false,
      error: "Erro no servidor: " + (e.message || "Internal error")
    });
  }
};
