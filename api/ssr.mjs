import server from "../dist/server/server.js";

const MAX_BODY_BYTES = 5 * 1024 * 1024;

const UNLOCK_PATH = "/__unlock";
const UNLOCK_COOKIE = "site_unlocked";
const UNLOCK_VALUE = "1";
const UNLOCK_MAX_AGE = 60 * 60 * 24 * 30;
const UNLOCK_FORM_LIMIT = 64 * 1024;

function shouldBypassGate(pathname) {
  if (pathname.startsWith("/admin")) return true;
  if (pathname === UNLOCK_PATH) return true;
  if (pathname === "/robots.txt") return true;
  if (pathname === "/sitemap.xml") return true;
  if (pathname === "/favicon.png") return true;
  return false;
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = v;
  }
  return out;
}

function comingSoonHtml({ error = false } = {}) {
  const errLine = error ? '<p class="err">Incorrect password.</p>' : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Coming Soon — Balaton Hills Golf Club</title>
<link rel="icon" type="image/png" href="/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500&family=Inter:wght@400;500&display=swap">
<style>
:root { --bg:#0e1a14; --fg:#f4ede1; --gold:#c9a96e; --muted:#a89c87; --border:rgba(244,237,225,0.2); }
*{box-sizing:border-box}
html,body{margin:0;padding:0;height:100%}
body{background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:2rem;text-align:center}
.eyebrow{font-size:.7rem;letter-spacing:.3em;text-transform:uppercase;color:var(--gold)}
h1{font-family:'Cormorant Garamond',serif;font-weight:500;font-size:clamp(2rem,6vw,3.5rem);margin:1.5rem 0 0;line-height:1.1}
.rule{width:60px;height:1px;background:var(--gold);margin:2rem auto}
p{color:var(--muted);max-width:32rem;line-height:1.6;font-size:.95rem;margin:0}
form{margin-top:2.5rem;display:flex;flex-direction:column;gap:.75rem;width:100%;max-width:22rem}
input[type=password]{background:transparent;border:1px solid var(--border);color:var(--fg);padding:.85rem 1rem;font-size:.95rem;font-family:inherit;outline:none;transition:border-color .2s}
input[type=password]:focus{border-color:var(--gold)}
button{background:var(--gold);color:var(--bg);border:0;padding:.9rem;font-size:.7rem;letter-spacing:.25em;text-transform:uppercase;font-weight:500;cursor:pointer;font-family:inherit;transition:opacity .2s}
button:hover{opacity:.9}
.err{color:#e07a7a;font-size:.85rem;margin-top:.25rem}
</style>
</head>
<body>
<span class="eyebrow">Balaton Hills Golf Club</span>
<h1>The Course Awaits</h1>
<div class="rule"></div>
<p>Our site is still being prepared. Please return soon — or sign in below if you've been given early access.</p>
<form method="POST" action="${UNLOCK_PATH}">
<input type="password" name="password" placeholder="Password" required autofocus autocomplete="current-password">
<button type="submit">Enter</button>
${errLine}
</form>
</body>
</html>`;
}

async function readForm(req) {
  const chunks = [];
  let received = 0;
  for await (const chunk of req) {
    received += chunk.length;
    if (received > UNLOCK_FORM_LIMIT) {
      const err = new Error("form too large");
      err.code = 413;
      throw err;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

export default async function handler(req, res) {
  const protocol = req.headers["x-forwarded-proto"] ?? "https";
  const host = req.headers.host ?? "localhost";
  const url = new URL(req.url, `${protocol}://${host}`);
  const pathname = url.pathname;
  const sitePassword = process.env.SITE_PASSWORD;

  if (pathname === UNLOCK_PATH) {
    if (req.method === "POST" && sitePassword) {
      let body;
      try {
        body = await readForm(req);
      } catch (e) {
        res.statusCode = e.code === 413 ? 413 : 400;
        res.setHeader("content-type", "text/plain; charset=utf-8");
        res.end("Bad Request");
        return;
      }
      const params = new URLSearchParams(body);
      const submitted = params.get("password") ?? "";
      if (submitted === sitePassword) {
        const secure = protocol === "https";
        const cookie = `${UNLOCK_COOKIE}=${UNLOCK_VALUE}; Path=/; Max-Age=${UNLOCK_MAX_AGE}; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
        res.statusCode = 302;
        res.setHeader("Set-Cookie", cookie);
        res.setHeader("Location", "/");
        res.end();
        return;
      }
      res.statusCode = 401;
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.end(comingSoonHtml({ error: true }));
      return;
    }
    res.statusCode = 302;
    res.setHeader("Location", "/");
    res.end();
    return;
  }

  if (sitePassword && !shouldBypassGate(pathname)) {
    const cookies = parseCookies(req.headers.cookie);
    if (cookies[UNLOCK_COOKIE] !== UNLOCK_VALUE) {
      res.statusCode = 200;
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.setHeader("cache-control", "no-store");
      res.end(comingSoonHtml());
      return;
    }
  }

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
