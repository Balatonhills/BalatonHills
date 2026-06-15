import server from "../dist/server/server.js";

const MAX_BODY_BYTES = 5 * 1024 * 1024;

export default async function handler(req, res) {
  const protocol = req.headers["x-forwarded-proto"] ?? "https";
  const host = req.headers.host ?? "localhost";
  const url = new URL(req.url, `${protocol}://${host}`);

  const declaredLength = Number(req.headers["content-length"]);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    res.statusCode = 413;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end("Payload Too Large");
    return;
  }

  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      for (const v of value) headers.append(name, v);
    } else if (value !== undefined) {
      headers.set(name, value);
    }
  }

  let body;
  if (req.method !== "GET" && req.method !== "HEAD") {
    const chunks = [];
    let received = 0;
    for await (const chunk of req) {
      received += chunk.length;
      if (received > MAX_BODY_BYTES) {
        res.statusCode = 413;
        res.setHeader("content-type", "text/plain; charset=utf-8");
        res.end("Payload Too Large");
        req.destroy();
        return;
      }
      chunks.push(chunk);
    }
    body = Buffer.concat(chunks);
  }

  const fetchRequest = new Request(url, {
    method: req.method,
    headers,
    body,
    duplex: "half",
  });

  let response;
  try {
    response = await server.fetch(fetchRequest);
  } catch (error) {
    console.error(error);
    res.statusCode = 500;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end("Internal Server Error");
    return;
  }

  res.statusCode = response.status;
  // Node's setHeader replaces; set-cookie can repeat, so append it instead.
  for (const [k, v] of response.headers.entries()) {
    if (k.toLowerCase() === "set-cookie") {
      res.appendHeader(k, v);
    } else {
      res.setHeader(k, v);
    }
  }

  if (response.body) {
    const reader = response.body.getReader();
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
    } catch (error) {
      console.error("SSR stream error:", error);
      // Headers are already flushed; the only honest signal we can give the
      // client is to drop the connection so they don't see a silent truncation.
      res.destroy(error);
      return;
    }
  }
  res.end();
}
