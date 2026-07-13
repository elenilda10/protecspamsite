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

    const token = process.env.BLOB_READ_WRITE_TOKEN;

    // 🛡️ CORREÇÃO CIRÚRGICA: Listamos sem o prefixo da pasta.
    // Como os arquivos estão soltos na raiz com o nome completo, buscamos direto pela string do payload.
    const { blobs } = await list({ 
      prefix: payload, 
      limit: 1,
      token: token 
    });

    // CASO NÃO ENCONTRE NA RAIZ: Tentativa de Fallback buscando com o caminho completo textualmente
    let targetBlob = blobs && blobs[0] ? blobs[0] : null;
    
    if (!targetBlob) {
      const fallbackSearch = await list({
        prefix: "spam-reports/" + payload,
        limit: 1,
        token: token
      });
      if (fallbackSearch.blobs && fallbackSearch.blobs[0]) {
        targetBlob = fallbackSearch.blobs[0];
      }
    }

    // Se ambas as buscas falharem, o arquivo realmente não existe
    if (!targetBlob) {
      return json(res, 404, { ok: false, error: "Relatório não encontrado no armazenamento" });
    }

    // Faz o download usando a URL gerada pelo Vercel Blob (resolve buckets privados automaticamente)
    const response = await fetch(targetBlob.url);
    
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
