import { put } from "@vercel/blob";
import type { VercelRequest, VercelResponse } from "@vercel/node";

// Interface para as mídias salvas do Telegram
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

// Interface do usuário infrator
interface SpamUser {
  id: string | number;
  name: string;
  username: string;
  is_bot: boolean;
}

// Estrutura principal do Relatório de Spam salvo no Blob
interface SpamReport {
  payload: string;
  pathname: string;
  group_title: string;
  chat_id: string | number;
  message_id: string | number;
  date: string | number;
  user: SpamUser;
  reason: string;
  score: number;
  categories: string[];
  content: string;
  media: SpamMedia;
  profile_url: string;
  created_at: number;
}

function sendJson(res: VercelResponse, status: number, data: any): void {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

function safePayload(value: any): string {
  return String(value || "")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 120);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") {
      return sendJson(res, 405, { ok: false, error: "Method not allowed" });
    }

    const apiKey = req.headers["x-api-key"];
    if (!apiKey || apiKey !== process.env.SPAM_API_KEY) {
      return sendJson(res, 401, { ok: false, error: "Unauthorized" });
    }

    const body = typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}");
    const payload = safePayload(body.payload);

    if (!payload) {
      return sendJson(res, 400, { ok: false, error: "Missing payload" });
    }

    // Define o pathname com base na presença de mídias
    let pathname: string;
    if (body.media && (body.media.photo || body.media.video)) {
      pathname = `spam-media/${payload}.json`;
    } else {
      pathname = `spam-reports/${payload}.json`;
    }

    // Cria o relatório blindado de forma tipada usando a Interface
    const data: SpamReport = {
      payload,
      pathname,
      group_title: body.group_title || "",
      chat_id: body.chat_id || "",
      message_id: body.message_id || "",
      date: body.date || "",
      user: {
        id: body.user_id || "",
        name: body.user_name || "",
        username: body.username || "",
        is_bot: body.is_bot === true
      },
      reason: body.reason || "",
      score: body.score || 0,
      categories: Array.isArray(body.categories) ? body.categories : [],
      content: body.content || "Conteúdo não textual",
      media: body.media || {},
      profile_url: body.profile_url || "",
      created_at: Date.now()
    };

    // Upload público
    const blob = await put(
      pathname,
      JSON.stringify(data),
      {
        access: "public",
        contentType: "application/json",
        allowOverwrite: true,
        addRandomSuffix: false
      }
    );

    return sendJson(res, 200, {
      ok: true,
      payload: payload,
      pathname: blob.pathname,
      blob: {
        url: blob.url,
        pathname: blob.pathname
      }
    });

  } catch (e: any) {
    console.error("Erro ao salvar mídia/dados:", e);
    return sendJson(res, 500, { ok: false, error: "Erro no Blob: " + (e.message || "Erro interno") });
  }
}
