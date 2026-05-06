const { get } = require("@vercel/blob");

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

  return "";
}

async function readSpam(payload) {
  const pathname = "spam-reports/" + payload + ".json";

  const file = await get(pathname, {
    access: "private"
  });

  const text = await file.text();

  return JSON.parse(text);
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      res.status(405).end("Method not allowed");
      return;
    }

    const payload = safePayload(req.query.payload);
    const type = safeType(req.query.type);

    if (!payload || !type) {
      res.status(400).end("Missing payload or type");
      return;
    }

    const botToken = process.env.BOT_TOKEN;

    if (!botToken) {
      res.status(500).end("BOT_TOKEN not configured");
      return;
    }

    let data;

    try {
      data = await readSpam(payload);
    } catch (e) {
      res.status(404).end("Report not found");
      return;
    }

    const media = data.media || {};

    let fileId = null;

    if (type === "photo") fileId = media.photo;
    if (type === "video") fileId = media.video;
    if (type === "document") fileId = media.document;

    if (!fileId) {
      res.status(404).end("File ID not found");
      return;
    }

    const tgRes = await fetch(
      "https://api.telegram.org/bot" +
        botToken +
        "/getFile?file_id=" +
        encodeURIComponent(fileId)
    );

    const tgJson = await tgRes.json();

    if (!tgJson.ok || !tgJson.result || !tgJson.result.file_path) {
      res.status(500).end("Could not get Telegram file");
      return;
    }

    const fileUrl =
      "https://api.telegram.org/file/bot" +
      botToken +
      "/" +
      tgJson.result.file_path;

    const fileRes = await fetch(fileUrl);

    if (!fileRes.ok) {
      res.status(500).end("Could not download Telegram file");
      return;
    }

    const contentType =
      fileRes.headers.get("content-type") || "application/octet-stream";

    const arrayBuffer = await fileRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.status(200);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "private, max-age=300");
    res.end(buffer);

  } catch (e) {
    res.status(500).end(e.message || "Internal error");
  }
};
