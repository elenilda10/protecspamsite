const { getStore } = require("@netlify/blobs");

exports.handler = async function(event) {
  try {
    const payload = String(
      event.queryStringParameters &&
      event.queryStringParameters.payload
        ? event.queryStringParameters.payload
        : ""
    )
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .slice(0, 120);

    if (!payload) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ok: false,
          error: "Missing payload"
        })
      };
    }

    const store = getStore("spam_reports");
    const data = await store.get(payload, { type: "json" });

    if (!data) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ok: false,
          error: "Not found"
        })
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: true,
        data: data
      })
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: false,
        error: e.message || "Internal error"
      })
    };
  }
};
