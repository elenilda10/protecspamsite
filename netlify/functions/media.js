const { connectLambda, getStore } = require("@netlify/blobs");

exports.handler = async function(event) {
  try {
    connectLambda(event);

    const payload = String(
      event.queryStringParameters &&
      event.queryStringParameters.payload
        ? event.queryStringParameters.payload
        : ""
    )
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .slice(0, 120);

    const type = String(
      event.queryStringParameters &&
      event.queryStringParameters.type
        ? event.queryStringParameters.type
        : ""
    );

    if (!payload || !type) {
      return {
        statusCode: 400,
        body: "Missing payload or type"
      };
    }

    const botToken = process.env.BOT_TOKEN;

    if (!botToken) {
      return {
        statusCode: 500,
        body: "BOT_TOKEN not configured"
      };
    }

    const store = getStore("spam_reports");
    const data = await store.get(payload, { type: "json" });

    if (!data || !data.media) {
      return {
        statusCode: 404,
        body: "Media not found"
      };
    }

    let fileId = null;

    if (type === "photo") fileId = data.media.photo;
    if (type === "video") fileId = data.media.video;
    if (type === "document") fileId = data.media.document;

    if (!fileId) {
      return {
        statusCode: 404,
        body: "File ID not found"
      };
    }

    const tgRes = await fetch(
      "https://api.telegram.org/bot" +
        botToken +
        "/getFile?file_id=" +
        encodeURIComponent(fileId)
    );

    const tgJson = await tgRes.json();

    if (!tgJson.ok || !tgJson.result || !tgJson.result.file_path) {
      return {
        statusCode: 500,
        body: "Could not get Telegram file"
      };
    }

    const fileUrl =
      "https://api.telegram.org/file/bot" +
      botToken +
      "/" +
      tgJson.result.file_path;

    const fileRes = await fetch(fileUrl);
    const arrayBuffer = await fileRes.arrayBuffer();

    let contentType = fileRes.headers.get("content-type") || "application/octet-stream";

    return {
      statusCode: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=300"
      },
      body: Buffer.from(arrayBuffer).toString("base64"),
      isBase64Encoded: true
    };
  } catch (e) {
    return {
      statusCode: 500,
      body: e.message || "Internal error"
    };
  }
};
