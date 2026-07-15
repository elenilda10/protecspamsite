// api/get-spam.js
const { list } = require("@vercel/blob");

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

    // ==================================================
    // 🔍 BUSCA ROBUSTA DE ARQUIVOS (MÍDIA OU RELATÓRIO)
    // Procuramos o arquivo correspondente ao payload em ambas as pastas.
    // ==================================================
    let blobUrl = null;
    let foundPathname = null;

    // Tentativa 1: Procurar na pasta de relatórios de texto
    const listReports = await list({ prefix: `spam-reports/${payload}` });
    
    if (listReports.blobs && listReports.blobs.length > 0) {
      blobUrl = listReports.blobs[0].url;
      foundPathname = listReports.blobs[0].pathname;
    } else {
      // Tentativa 2: Se não achar, procura na pasta de mídias (fotos/vídeos)
      const listMedia = await list({ prefix: `spam-media/${payload}` });
      if (listMedia.blobs && listMedia.blobs.length > 0) {
        blobUrl = listMedia.blobs[0].url;
        foundPathname = listMedia.blobs[0].pathname;
      }
    }

    // Se não encontrou o arquivo em nenhum dos caminhos
    if (!blobUrl) {
      return json(res, 404, { 
        ok: false, 
        error: `Nenhum registro de spam encontrado para o ID: ${payload}` 
      });
    }

    console.log("Baixando dados do Blob:", blobUrl);

    // ==================================================
    // 📥 DOWNLOAD DO CONTEÚDO VIA FETCH NATIVO
    // ==================================================
    const responseBlob = await fetch(blobUrl);
    
    if (!responseBlob.ok) {
      throw new Error(`Erro na conexão com o Vercel Blob (HTTP ${responseBlob.status})`);
    }

    const content = await responseBlob.json();
    
    // 4. Retorna os dados com sucesso
    return json(res, 200, {
      ok: true,
      data: content,
      filename: foundPathname
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
