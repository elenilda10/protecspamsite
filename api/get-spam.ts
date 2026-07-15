import { list } from "@vercel/blob";
import type { VercelRequest, VercelResponse } from "@vercel/node";

function sendJson(res: VercelResponse, status: number, data: any): void {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "GET") {
      return sendJson(res, 405, { ok: false, error: "Method not allowed" });
    }

    const payload = req.query.payload as string | undefined;

    if (!payload) {
      return sendJson(res, 400, { 
        ok: false, 
        error: "Falta o parâmetro 'payload' na requisição." 
      });
    }

    // Busca usando o list do Blob
    const search = await list({ prefix: "spam-" });
    const file = search.blobs.find(b => b.pathname.includes(payload));

    if (!file) {
      return sendJson(res, 404, { 
        ok: false, 
        error: `Nenhum registro de spam encontrado para o ID: ${payload}` 
      });
    }

    // Efetua o download do JSON
    const responseBlob = await fetch(file.url);
    if (!responseBlob.ok) {
      throw new Error(`Erro na conexão com o storage (HTTP ${responseBlob.status})`);
    }

    // Tipamos o JSON retornado para garantir segurança nas chaves de dados
    const content = await responseBlob.json();
    
    return sendJson(res, 200, {
      ok: true,
      data: content,
      url: file.url
    });

  } catch (e: any) {
    console.error("Erro no get-spam:", e);
    return sendJson(res, 500, { 
      ok: false, 
      error: "Erro ao recuperar dados: " + e.message 
    });
  }
}
