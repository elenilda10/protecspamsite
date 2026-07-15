import { list } from "@vercel/blob";
import type { VercelRequest, VercelResponse } from "@vercel/node";

// Tipagem estrita para os tipos de mídias aceitos pelo Telegram
type ValidMediaType = "photo" | "video" | "document" | "audio" | "voice" | "animation" | "video_note" | "sticker";

interface SpamMedia {
  photo?: string | null;
  video?: string | null;
  document?: string | null;
  audio?: string | null;
  voice?: string | null;
  animation?: string | null;
  video_note?: string | null;
  sticker?: string | null;
}

interface SpamData {
  media?: SpamMedia;
  [key: string]: any;
}

function sendJson(res: VercelResponse, status: number, data: any): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

function safePayload(value: any): string {
  return String(value || "")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 120);
}

function safeType(value: any): ValidMediaType | "" {
  const type = String(value || "") as ValidMediaType;
  const validTypes: ValidMediaType[] = ["photo", "video", "document", "audio", "voice", "animation", "video_note", "sticker"];
  return validTypes.includes(type) ? type : "";
}

// ✅ CORREÇÃO CRÍTICA: Busca robusta que varre tanto reports quanto media
async function readSpam(payload: string): Promise<SpamData> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  // Lista os arquivos que começam com "spam-" para cobrir "spam-reports/" e "spam-media/"
  const { blobs } = await list({ 
    prefix: "spam-", 
    token: token 
  });

  const file = blobs.find(b => b.pathname.includes(payload));

  if (!file) {
    throw new Error("Relatório não encontrado no armazenamento");
  }

  // Faz o download direto do JSON
  const response = await fetch(file.url);
  if (!response.ok) {
    throw new Error("Falha ao ler dados do storage");
  }

  return await response.json() as SpamData;
}

function getFileIdByType(media: SpamMedia | undefined, type: ValidMediaType): string | null {
  if (!media) return null;
  return media[type] || null;
}

function guessContentType(filePath: string, fallbackType: ValidMediaType): string {
  const path = String(filePath || "").toLowerCase();

  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".gif")) return "image/gif";
  if (path.endsWith(".mp4")) return "video/mp4";
  if (path.endsWith(".mov")) return "video/quicktime";
  if (path.endsWith(".webm")) return "video/webm";
  if (path.endsWith(".mp3")) return "audio/mpeg";
  if (path.endsWith(".ogg") || path.endsWith(".oga")) return "audio/ogg";
  if (path.endsWith(".m4a")) return "audio/mp4";
  if (path.endsWith(".wav")) return "audio/wav";

  if (fallbackType === "photo") return "image/jpeg";
  if (fallbackType === "sticker") return "image/webp";
  if (fallbackType === "video" || fallbackType === "animation" || fallbackType === "video_note") return "video/mp4";
  if (fallbackType === "audio") return "audio/mpeg";
  if (fallbackType === "voice") return "audio/ogg";

  return "application/octet-stream";
}

function guessFileName(filePath: string, type: ValidMediaType): string {
  const path = String(filePath || "");
  const last = path.split("/").pop();

  if (last && last.includes(".")) return last;

  if (type === "photo") return "media.jpg";
  if (type === "sticker") return "sticker.webp";
  if (type === "video") return "video.mp4";
  if (type === "animation") return "animation.mp4";
  if (type === "video_note") return "video_note.mp4";
  if (type === "audio") return "audio.mp3";
  if (type === "voice") return "voice.ogg";

  return "media.bin";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "GET") {
      return sendJson(res, 405, { ok: false, error: "Method not allowed" });
    }

    const payload = safePayload(req.query.payload);
    const type = safeType(req.query.type);
    const debug = String(req.query.debug || "") === "1";

    if (!payload || !type) {
      return sendJson(res, 400, { ok: false, error: "Missing payload or type", payload, type });
    }

    const botToken = process.env.BOT_TOKEN;
    if (!botToken) {
      return sendJson(res, 500, { ok: false, error: "BOT_TOKEN not configured" });
    }

    let data: SpamData;
    try {
      data = await readSpam(payload);
    } catch (e: any) {
      return sendJson(res, 404, { ok: false, error: "Report not found", detail: e.message || String(e) });
    }

    const media = data.media;
    const fileId = getFileIdByType(media, type);

    if (!fileId) {
      return sendJson(res, 404, { ok: false, error: "File ID not found", type, media });
    }

    // Busca o caminho do arquivo na API do Telegram de forma tipada e segura
    const tgRes = await fetch(
      `https://api.telegram.org/bot${botToken}/getFile?file_id=${encodeURIComponent(fileId)}`
    );
    const tgJson: any = await tgRes.json();

    if (debug) {
      return sendJson(res, 200, { ok: true, payload, type, file_id: fileId, telegram_getFile: tgJson });
    }

    if (!tgJson.ok || !tgJson.result || !tgJson.result.file_path) {
      return sendJson(res, 500, { ok: false, error: "Could not get Telegram file", telegram: tgJson });
    }

    const filePath = tgJson.result.file_path;
    const fileUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;

    // Baixa o arquivo binário direto dos servidores do Telegram
    const fileRes = await fetch(fileUrl);
    if (!fileRes.ok) {
      return sendJson(res, 500, { ok: false, error: "Could not download Telegram file", status: fileRes.status });
    }

    const arrayBuffer = await fileRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const contentType = guessContentType(filePath, type);
    const fileName = guessFileName(filePath, type);

    // Envia o arquivo como resposta binária direta para o navegador
    res.statusCode = 200;
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", String(buffer.length));
    res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
    res.setHeader("Cache-Control", "private, max-age=300");
    res.end(buffer);

  } catch (e: any) {
    return sendJson(res, 500, { ok: false, error: e.message || "Internal error" });
  }
}
