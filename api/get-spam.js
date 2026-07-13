const { get } = require("@vercel/blob");

function json(res, status, data) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return json(res, 405, { ok: false, error: "Method not allowed" });
    }

    // ✅ CORREÇÃO: O app.js envia 'payload', não 'pathname'
    const payload = req.query.payload;

    if (!payload) {
      return json(res, 400, { 
        ok: false, 
        error: "Falta o parâmetro 'payload' na requisição." 
      });
    }

    // ✅ Reconstrói o pathname exato usado no save-spam.js
    // O save-spam.js usou: "spam-reports/" + payload + ".json"
    const pathname = "spam-reports/" + payload + ".json";

    // ✅ LEITURA DE ARQUIVO PRIVADO
    // O Vercel Blob lê o token de ambiente AUTOMATICAMENTE.
    const blob = await get(pathname);

    // Retorna o conteúdo JSON
    return json(res, 200, {
      ok: true,
      data: JSON.parse(blob.text()), // Mudei 'content' para 'data' para bater com o app.js
      filename: blob.pathname
    });

  } catch (e) {
    console.error("Erro na leitura GET:", e);
    return json(res, 500, { 
      ok: false, 
      error: "Erro ao recuperar dados: " + e.message,
      detail: e.message // Para o app.js mostrar o erro real na tela
    });
  }
};
