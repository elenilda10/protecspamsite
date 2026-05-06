const { get } = require("@vercel/blob");

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

function guessContentType(filePath, fallbackType) {
  const path = String(filePath || "").toLowerCase();

  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".gif")) return "image/gif";

  if (path.endsWith(".mp4")) return "video/mp4";
  if (path.endsWith(".mov")) return "video/quicktime";
  if (path.endsWith(".webm")) return "video/webm";

  if (path.endsWith(".mp3")) return "audio/mpeg";
  if (path.endsWith(".ogg")) return "audio/ogg";
  if (path.endsWith(".oga")) return "audio/ogg";
  if (path.endsWith(".m4a")) return "audio/mp4";
  if (path.endsWith(".wav")) return "audio/wav";

  if (fallbackType === "photo") return "image/jpeg";
  if (fallbackType === "sticker") return "image/webp";
  if (fallbackType === "video" || fallbackType === "animation" || fallbackType === "video_note") return "video/mp4";
  if (fallbackType === "audio") return "audio/mpeg";
  if (fallbackType === "voice") return "audio/ogg";

  return "application/octet-stream";
}

function guessFileName(filePath, type) {
  const path = String(filePath || "");
  const last = path.split("/").pop();

  if (last && last.includes(".")) {
    return last;
  }

  if (type === "photo") return "media.jpg";
  if (type === "sticker") return "sticker.webp";
  if (type === "video") return "video.mp4";
  if (type === "animation") return "animation.mp4";
  if (type === "video_note") return "video_note.mp4";
  if (type === "audio") return "audio.mp3";
  if (type === "voice") return "voice.ogg";

  return "media.bin";
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

    const tgRes = await fetch(
      "https://api.telegram.org/bot" +
        botToken +
        "/getFile?file_id=" +
        encodeURIComponent(fileId)
    );

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

    const filePath = tgJson.result.file_path;

    const fileUrl =
      "https://api.telegram.org/file/bot" +
      botToken +
      "/" +
      filePath;

    const fileRes = await fetch(fileUrl);

    if (!fileRes.ok) {
      return sendJson(res, 500, {
        ok: false,
        error: "Could not download Telegram file",
        status: fileRes.status,
        statusText: fileRes.statusText
      });
    }

    const arrayBuffer = await fileRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const contentType = guessContentType(filePath, type);
    const fileName = guessFileName(filePath, type);

    res.statusCode = 200;
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", String(buffer.length));
    res.setHeader("Content-Disposition", 'inline; filename="' + fileName + '"');
    res.setHeader("Cache-Control", "private, max-age=300");
    res.end(buffer);

  } catch (e) {
    return sendJson(res, 500, {
      ok: false,
      error: e.message || "Internal error"
    });
  }
};
