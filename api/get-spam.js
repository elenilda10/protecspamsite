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
    console.log("Buscando relatório para o payload:", payload);

    if (!payload) {
      return json(res, 400, { ok: false, error: "Missing payload parameter" });
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;

    // CORREÇÃO: Buscamos apenas pelo ID do payload bruto, sem prefixo de pasta fixo.
    // Isso evita problemas caso o POST tenha salvado como "/spam-reports" ou na raiz.
    const { blobs } = await list({ 
      prefix: payload, 
      limit: 1,
      token: token 
    });

    // Se a busca ampla falhar, tentamos listar os últimos 5 arquivos salvos para debugar no console
    if (!blobs || blobs.length === 0) {
      const debugList = await list({ limit: 5, token: token });
      console.log("--- LOG DE DIAGNÓSTICO ---");
      console.log("O arquivo procurado não foi achado. Últimos arquivos no bucket:", 
        debugList.blobs.map(b => b.pathname)
      );
      
      return json(res, 404, { ok: false, error: "Relatório não encontrado no armazenamento" });
    }

    const blobUrl = blobs[0].url;
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
