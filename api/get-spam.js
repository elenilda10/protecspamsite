const { get } = require("@vercel/blob");

function json(res, status, data) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

function safePayload(value) {
  return String(value || "")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 120);
}

async function streamToText(stream) {
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

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return json(res, 405, {
        ok: false,
        error: "Method not allowed"
      });
    }

    const payload = safePayload(req.query.payload);

    if (!payload) {
      return json(res, 400, {
        ok: false,
        error: "Missing payload"
      });
    }

    let data;

    try {
      data = await readSpam(payload);
    } catch (e) {
      return json(res, 404, {
        ok: false,
        error: "Not found",
        detail: e.message || String(e)
      });
    }

    return json(res, 200, {
      ok: true,
      data: data
    });

  } catch (e) {
    return json(res, 500, {
      ok: false,
      error: e.message || "Internal error"
    });
  }
};
