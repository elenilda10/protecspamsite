const { list } = require("@vercel/blob");

function json(res, status, data) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return json(res, 405, { ok: false, error: "Method not allowed" });
    }

    const payload = req.query.payload;

    if (!payload) {
      return json(res, 400, { 
        ok: false, 
        error: "Falta o parâmetro 'payload' na requisição." 
      });
    }

    // 🔍 Busca usando o prefixo do seu novo Blob público
    const search = await list({ prefix: "spam-" });
    const file = search.blobs.find(b => b.pathname.includes(payload));

    if (!file) {
      return json(res, 404, { 
        ok: false, 
        error: `Nenhum registro de spam encontrado para o ID: ${payload}` 
      });
    }

    // 📥 Download direto e performático do JSON público via Fetch nativo
    const responseBlob = await fetch(file.url);
    
    if (!responseBlob.ok) {
      throw new Error(`Erro de conexão com o Storage do Vercel Blob (HTTP ${responseBlob.status})`);
    }

    const content = await responseBlob.json();
    
    return json(res, 200, {
      ok: true,
      data: content,
      url: file.url
    });

  } catch (e) {
    console.error("Erro detalhado no get-spam:", e);
    return json(res, 500, { 
      ok: false, 
      error: "Erro ao recuperar dados: " + e.message,
      detail: e.message 
    });
  }
};
