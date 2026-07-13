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

    // LOG AUXILIAR: Veja no painel da Vercel o que está chegando
    console.log("Buscando relatório para o payload:", payload);

    if (!payload) {
      return json(res, 400, { ok: false, error: "Missing payload parameter" });
    }

    const pathname = "spam-reports/" + payload + ".json";

    const { blobs } = await list({ prefix: pathname, limit: 1 });

    // Se o array voltar vazio, o arquivo não existe com esse nome exato
    if (!blobs || blobs.length === 0) {
      return json(res, 404, { ok: false, error: "Relatório não encontrado no armazenamento" });
    }

    // CORREÇÃO: blobs é um array, precisamos acessar o índice [0]
    const response = await fetch(blobs[0].url);
    
    if (!response.ok) {
      return json(res, 500, { ok: false, error: "Falha ao ler o conteúdo do relatório" });
    }

    const data = await response.json();

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
