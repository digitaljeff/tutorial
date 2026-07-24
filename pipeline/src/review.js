// Review screen (docs/plan/01 flow step 7): local zero-dep web UI —
// episode player + shot strip + per-shot retakes with director notes.
// This is the prototype of the product's review page.

import http from "node:http";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { loadManifest, retakeShot } from "./stages/retake.js";

const MIME = { ".mp4": "video/mp4", ".png": "image/png", ".json": "application/json", ".wav": "audio/wav" };

function page(manifest, busy) {
  const shots = manifest.shots
    .map((s) => {
      const lines = s.line_times.map((lt) => `<div class="line"><b>${lt.line.character_id}</b> ${lt.line.text}</div>`).join("");
      const kf = "/media/keyframes/" + path.basename(s.keyframeFile);
      return `<div class="shot">
        <img src="${kf}?v=${Date.now()}" alt="shot ${s.idx}">
        <div class="meta">#${s.idx} · ${s.location_id} · ${s.duration_s}s<br><span>${s.framing.split(",")[0]}</span></div>
        ${lines}
        <form method="POST" action="/retake">
          <input type="hidden" name="shot" value="${s.idx}">
          <input name="note" placeholder="director note (optional)">
          <button ${busy ? "disabled" : ""}>Retake</button>
        </form>
      </div>`;
    })
    .join("");
  const retakes = manifest.retakes.length
    ? `<p class="hist">Retakes: ${manifest.retakes.map((r) => `#${r.shot}${r.note ? ` ("${r.note}")` : ""}`).join(", ")}</p>`
    : "";
  return `<!doctype html><meta charset="utf-8"><title>Backlot Review — ${manifest.script.title}</title>
<style>
  body{font:15px system-ui;background:#14141c;color:#eee;margin:0;padding:24px}
  h1{font-size:20px} h1 em{color:#f5c518;font-style:normal}
  video{width:min(880px,100%);border-radius:8px;display:block;margin:12px 0}
  .strip{display:flex;gap:12px;overflow-x:auto;padding:12px 0}
  .shot{background:#1e1e2a;border-radius:8px;padding:10px;min-width:220px;max-width:220px}
  .shot img{width:100%;border-radius:4px}
  .meta{margin:6px 0;color:#aaa;font-size:12px}
  .line{font-size:12px;margin:4px 0;color:#ddd} .line b{color:#f5c518}
  input{width:120px;background:#2a2a38;border:1px solid #444;color:#eee;border-radius:4px;padding:4px}
  button{background:#f5c518;border:0;border-radius:4px;padding:4px 10px;font-weight:600;cursor:pointer}
  .hist{color:#8a8;font-size:13px} ${busy ? ".shot{opacity:.5}" : ""}
</style>
<h1><em>${manifest.script.title}</em> — review cut ${busy ? "(retake running… refresh in a bit)" : ""}</h1>
<video controls src="/media/episode.mp4?v=${Date.now()}"></video>
${retakes}
<div class="strip">${shots}</div>`;
}

export async function serveReview({ epDir, outRoot, port = 4321, forceMock = false }) {
  let busy = false;
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://x");
      if (req.method === "POST" && url.pathname === "/retake") {
        let body = "";
        for await (const chunk of req) body += chunk;
        const params = new URLSearchParams(body);
        if (!busy) {
          busy = true;
          retakeShot({
            epDir,
            shotIdx: params.get("shot"),
            note: params.get("note") || undefined,
            outRoot,
            forceMock,
          })
            .catch((e) => console.error("retake failed:", e.message))
            .finally(() => (busy = false));
        }
        res.writeHead(303, { Location: "/" }).end();
        return;
      }
      if (url.pathname.startsWith("/media/")) {
        const rel = decodeURIComponent(url.pathname.slice("/media/".length));
        const file = path.join(epDir, rel);
        if (!path.resolve(file).startsWith(path.resolve(epDir))) throw new Error("bad path");
        const data = await readFile(file);
        res.writeHead(200, { "Content-Type": MIME[path.extname(file)] ?? "application/octet-stream" }).end(data);
        return;
      }
      const manifest = await loadManifest(epDir);
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(page(manifest, busy));
    } catch (e) {
      res.writeHead(500).end(String(e.message));
    }
  });
  await new Promise((r) => server.listen(port, r));
  console.log(`Review UI: http://localhost:${port}  (episode: ${epDir})`);
  return server;
}
