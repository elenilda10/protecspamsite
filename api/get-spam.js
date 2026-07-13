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

    const pathname = "spam-reports/" + payload + ".json";

    // 1. Busca a lista de arquivos com esse prefixo
    const { blobs } = await list({ prefix: pathname, limit: 1 });

    // 2. Se o array voltar vazio ou indefinido, o arquivo real não existe
    if (!blobs || blobs.length === 0) {
      return json(res, 404, { ok: false, error: "Relatório não encontrado no armazenamento" });
    }

    // 3. CORREÇÃO CRUCIAL: Acessa o índice [0] do array blobs
    const blobUrl = blobs[0].url;
    console.log("URL encontrada no Vercel Blob:", blobUrl);

    // 4. Faz o download do conteúdo do JSON público
    const response = await fetch(blobUrl);
    
    if (!response.ok) {
      return json(res, 500, { ok: false, error: "Falha ao ler o conteúdo do arquivo no storage" });
    }

    const data = await response.json();

    // 5. Retorna os dados limpos para o Mini App abrir a tela
    return json(res, 200, {
      ok: true,
      data: data
    });

  } catch (e) {
    console.error("Erro interno no handler:", e);
    return json(res, 500, {
      ok: false,
      error: "Erro no servidor: " + (e.message || "Internal error")
    });
  }
};
