// iluminati – digitaler Tempel der Trinität
// Startet den lokalen Tempel: statische Oberfläche + API.
//   npm start   (oder: node server.js)   →  http://localhost:7777

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname, normalize } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadStore, saveStore, clearKey, publicView, ROLES } from "./src/keystore.js";
import { invokeTrinity, chatWithRole, STAGES, stageInfo } from "./src/trinity.js";

const ROOT = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(ROOT, "public");
const PORT = Number(process.env.PORT) || 7777;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".ico": "image/x-icon",
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(body);
}

async function readBody(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 1_000_000) throw new Error("Anfrage zu groß.");
  }
  return raw ? JSON.parse(raw) : {};
}

async function serveStatic(req, res) {
  const urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const relative = urlPath === "/" ? "index.html" : urlPath.slice(1);
  const filePath = normalize(join(PUBLIC_DIR, relative));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const data = await readFile(filePath);
    res.writeHead(200, { "Content-Type": MIME[extname(filePath)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404 – dieser Pfad führt nicht in den Tempel.");
  }
}

// POST /api/invoke – führt die dreistufige Kette aus und streamt die
// Stufen als NDJSON (eine JSON-Zeile pro Ereignis) an die Oberfläche.
async function handleInvoke(req, res) {
  let body;
  try {
    body = await readBody(req);
  } catch {
    return sendJson(res, 400, { error: "Ungültige Anfrage." });
  }
  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query) return sendJson(res, 400, { error: "Die Anfrage ist leer." });

  const store = loadStore();
  const missing = ROLES.filter((role) => !store.keys[role]);
  if (missing.length) {
    return sendJson(res, 409, {
      error: "Es fehlen API-Schlüssel.",
      missing: missing.map((role) => stageInfo(role).name),
    });
  }

  res.writeHead(200, {
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "Cache-Control": "no-cache",
    "X-Accel-Buffering": "no",
  });
  const emit = (event) => res.write(JSON.stringify(event) + "\n");

  const abort = new AbortController();
  req.on("close", () => abort.abort());

  try {
    await invokeTrinity(
      query,
      store,
      (role, phase, text) => emit({ type: "stage", role, phase, text }),
      abort.signal
    );
    emit({ type: "done" });
  } catch (err) {
    emit({ type: "error", message: err.message });
  }
  res.end();
}

// POST /api/chat – Zwiegespräch mit einer einzelnen Instanz.
// Erwartet { role, messages: [{ role: "user"|"assistant", content }] }.
async function handleChat(req, res) {
  let body;
  try {
    body = await readBody(req);
  } catch {
    return sendJson(res, 400, { error: "Ungültige Anfrage." });
  }
  const role = body.role;
  if (!ROLES.includes(role)) return sendJson(res, 400, { error: "Unbekannte Rolle." });

  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter(
      (m) =>
        (m?.role === "user" || m?.role === "assistant") &&
        typeof m?.content === "string" &&
        m.content.trim()
    )
    .map((m) => ({ role: m.role, content: m.content }))
    .slice(-24);
  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return sendJson(res, 400, { error: "Die Anfrage ist leer." });
  }

  const store = loadStore();
  if (!store.keys[role]) {
    return sendJson(res, 409, {
      error: "Es fehlen API-Schlüssel.",
      missing: [stageInfo(role).name],
    });
  }

  const abort = new AbortController();
  req.on("close", () => abort.abort());
  try {
    const reply = await chatWithRole(role, store, messages, abort.signal);
    return sendJson(res, 200, { reply });
  } catch (err) {
    return sendJson(res, 502, { error: err.message });
  }
}

const server = createServer(async (req, res) => {
  const path = new URL(req.url, "http://x").pathname;

  if (path === "/api/status" && req.method === "GET") {
    return sendJson(res, 200, publicView());
  }

  if (path === "/api/keys" && req.method === "POST") {
    try {
      const body = await readBody(req);
      saveStore(body);
      return sendJson(res, 200, publicView());
    } catch {
      return sendJson(res, 400, { error: "Ungültige Anfrage." });
    }
  }

  if (path.startsWith("/api/keys/") && req.method === "DELETE") {
    const role = path.split("/")[3];
    if (!ROLES.includes(role)) return sendJson(res, 404, { error: "Unbekannte Rolle." });
    clearKey(role);
    return sendJson(res, 200, publicView());
  }

  if (path === "/api/invoke" && req.method === "POST") {
    return handleInvoke(req, res);
  }

  if (path === "/api/chat" && req.method === "POST") {
    return handleChat(req, res);
  }

  if (path.startsWith("/api/")) {
    return sendJson(res, 404, { error: "Unbekannter Pfad." });
  }

  return serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`△ iluminati – der Tempel ist geöffnet: http://localhost:${PORT}`);
  const view = publicView();
  for (const role of STAGES) {
    const { name, provider } = stageInfo(role);
    const state = view.keys[role].saved ? "Schlüssel hinterlegt" : "Schlüssel fehlt";
    console.log(`  ${name} (${provider}): ${state}`);
  }
});
