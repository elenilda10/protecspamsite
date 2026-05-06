const { get } = require("@vercel/blob");
const { Readable } = require("node:stream");

function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

function safePayload(value) {
  return String(value || "")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 120);
}

function safeType(value) {
  const type = String(value || "");

  if (type === "photo") return "photo";
  if (type === "video") return "video";
  if (type === "document") return "document";
  if (type === "audio") return "audio";
  if (type === "voice") return "voice";
  if (type === "animation") return "animation";
  if (type === "video_note") return "video_note";
  if (type === "sticker") return "sticker";

  return "";
}

async function streamToText(stream) {
  if (!stream) {
    throw new Error("Stream not found");
  }

  // Web ReadableStream
  if (typeof stream.getReader === "function") {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let result = "";

    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      result += decoder.decode(chunk.value, { stream: true });
    }

    result += decoder.decode();
    return result;
  }

  // Node Readable
  let result = "";
  for await (const chunk of stream) {
    result += Buffer.isBuffer(chunk)
      ? chunk.toString("utf8")
      : Buffer.from(chunk).toString("utf8");
  }

  return result;
}

async function readSpam(payload) {
  const pathname = "spam-reports/" + payload + ".json";

  const file = await get(pathname, {
    access: "private"
  });

  if (!file || !file.stream) {
    throw new Error("Blob stream not found");
  }

  const text = await streamToText(file.stream);
  return JSON.parse(text);
}

function getFileIdByType(media, type) {
  if (!media) return null;

  if (type === "photo") return media.photo;
  if (type === "video") return media.video;
  if (type === "document") return media.document;
  if (type === "audio") return media.audio;
  if (type === "voice") return media.voice;
  if (type === "animation") return media.animation;
  if (type === "video_note") return media.video_note;
  if (type === "sticker") return media.sticker;

  return null;
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return sendJson(res, 405, {
        ok: false,
        error: "Method not allowed"
      });
    }

    const payload = safePayload(req.query.payload);
    const type = safeType(req.query.type);
    const debug = String(req.query.debug || "") === "1";

    if (!payload || !type) {
      return sendJson(res, 400, {
        ok: false,
        error: "Missing payload or type",
        payload,
        type
      });
    }

    const botToken = process.env.BOT_TOKEN;

    if (!botToken) {
      return sendJson(res, 500, {
        ok: false,
        error: "BOT_TOKEN not configured"
      });
    }

    let data;

    try {
      data = await readSpam(payload);
    } catch (e) {
      return sendJson(res, 404, {
        ok: false,
        error: "Report not found",
        detail: e.message || String(e)
      });
    }

    const media = data.media || {};
    const fileId = getFileIdByType(media, type);

    if (!fileId) {
      return sendJson(res, 404, {
        ok: false,
        error: "File ID not found",
        type,
        media
      });
    }

    const tgApiUrl =
      "https://api.telegram.org/bot" +
      botToken +
      "/getFile?file_id=" +
      encodeURIComponent(fileId);

    const tgRes = await fetch(tgApiUrl);
    const tgJson = await tgRes.json();

    if (debug) {
      return sendJson(res, 200, {
        ok: true,
        payload,
        type,
        file_id: fileId,
        telegram_getFile: tgJson
      });
    }

    if (!tgJson.ok || !tgJson.result || !tgJson.result.file_path) {
      return sendJson(res, 500, {
        ok: false,
        error: "Could not get Telegram file",
        telegram: tgJson
      });
    }

    const fileUrl =
      "https://api.telegram.org/file/bot" +
      botToken +
      "/" +
      tgJson.result.file_path;

    const fileRes = await fetch(fileUrl);

    if (!fileRes.ok) {
      return sendJson(res, 500, {
        ok: false,
        error: "Could not download Telegram file",
        status: fileRes.status,
        statusText: fileRes.statusText
      });
    }

    const contentType =
      fileRes.headers.get("content-type") || "application/octet-stream";

    res.statusCode = 200;
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "private, max-age=300");

    if (fileRes.body && typeof Readable.fromWeb === "function") {
      Readable.fromWeb(fileRes.body).pipe(res);
      return;
    }

    const arrayBuffer = await fileRes.arrayBuffer();
    res.end(Buffer.from(arrayBuffer));

  } catch (e) {
    return sendJson(res, 500, {
      ok: false,
      error: e.message || "Internal error"
    });
  }
};
