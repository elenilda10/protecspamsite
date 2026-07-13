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

    // 1. TENTATIVA COM TOKEN EXPLICÍTOCONFIGURADO
    // Forçamos o SDK a usar a variável de ambiente validada no painel
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    
    const { blobs } = await list({ 
      prefix: pathname, 
      limit: 1,
      token: token 
    });

    // 2. SE MANDAR VIA LIST E DER CERTO
    if (blobs && blobs.length > 0) {
      const blobUrl = blobs[0].url;
      console.log("URL encontrada via list():", blobUrl);
      
      const response = await fetch(blobUrl);
      if (response.ok) {
        const data = await response.ok ? await response.json() : null;
        if (data) return json(res, 200, { ok: true, data });
      }
    }

    // 3. ESTRATÉGIA DE FALLBACK: CONSTRUÇÃO DA URL DIRETA
    // Se o list falhar por escopo, tentamos ler diretamente usando a estrutura padrão da Vercel
    // Extrai o ID do bucket a partir do token (a string após '_store_')
    const tokenParts = token ? token.split("_store_") : [];
    if (tokenParts.length > 1) {
      const bucketId = tokenParts[1].toLowerCase();
      // O formato padrão da URL pública da Vercel é: https://[bucket_id]://[pathname]
      const directUrl = `https://${bucketId}://${pathname}`;
      
      console.log("Tentando acesso direto via URL construída:", directUrl);
      
      const directResponse = await fetch(directUrl);
      if (directResponse.ok) {
        const data = await directResponse.json();
        console.log("Sucesso no fallback de leitura direta!");
        return json(res, 200, { ok: true, data });
      }
    }

    // Se ambas as opções falharem, o arquivo realmente não foi gravado pelo POST
    return json(res, 404, { 
      ok: false, 
      error: "Relatório não encontrado no armazenamento. Verifique se o POST gravou o arquivo com sucesso." 
    });

  } catch (e) {
    console.error("Erro crítico no handler:", e);
    return json(res, 500, {
      ok: false,
      error: "Erro no servidor: " + (e.message || "Internal error")
    });
  }
};
