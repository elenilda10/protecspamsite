const { get } = require("@vercel/blob");
// Não importa se é privado, o `get` precisa de autenticação
// Geralmente o token é lido automaticamente do ambiente se configurado no Vercel

function json(res, status, data) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return json(res, 405, { ok: false, error: "Method not allowed" });
    }

    // Pega o pathname (nome do arquivo) da query string
    // Ex: /api/get-spam?pathname=spam-reports/payload123.json
    const pathname = req.query.pathname;

    if (!pathname) {
      return json(res, 400, { ok: false, error: "Falta o parâmetro 'pathname'" });
    }

    // ✅ LEITURA DE ARQUIVO PRIVADO
    // O Vercel Blob lê o token de ambiente AUTOMATICAMENTE.
    // Não passe o token manualmente se não for estritamente necessário.
    const blob = await get(pathname);

    // Retorna o conteúdo JSON
    return json(res, 200, {
      ok: true,
      content: JSON.parse(blob.text()), // Converte o texto do blob para objeto
      filename: blob.pathname
    });

  } catch (e) {
    console.error("Erro na leitura GET:", e);
    // Se for erro de "file not found" ou "unauthorized", trate com cuidado
    return json(res, 500, { ok: false, error: "Erro ao recuperar dados: " + e.message });
  }
};
