// api/get-spam.js
const { get } = require("@vercel/blob");

// Função auxiliar para resposta JSON
function json(res, status, data) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return json(res, 405, { ok: false, error: "Method not allowed" });
    }

    // 1. Pega o payload da query (enviado pelo app.js)
    const payload = req.query.payload;

    if (!payload) {
      return json(res, 400, { 
        ok: false, 
        error: "Falta o parâmetro 'payload' na requisição." 
      });
    }

    // 2. Monta o pathname exato (igual ao do save-spam.js)
    const pathname = "spam-reports/" + payload + ".json";

    console.log("Buscando blob:", pathname);

    // 3. CHAMADA BLINDADA DO BLOB
    // A biblioteca @vercel/blob lê BLOB_READ_WRITE_TOKEN do ambiente automaticamente.
    // Se o erro ainda ocorrer, é porque o token não está no ambiente OU a versão da lib é antiga.
    // Tenta pegar o token explicitamente para debug se necessário, mas o 'get' usa o ambiente.
    
    const blob = await get(pathname);

    // 4. Retorna os dados
    const content = JSON.parse(blob.text());
    
    return json(res, 200, {
      ok: true,
      data: content,
      filename: blob.pathname
    });

  } catch (e) {
    console.error("Erro detalhado no get-spam:", e);
    // Se for erro de token ou autenticação, o erro real estará aqui
    return json(res, 500, { 
      ok: false, 
      error: "Erro ao recuperar dados: " + e.message,
      detail: e.message 
    });
  }
};
