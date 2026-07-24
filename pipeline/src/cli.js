#!/usr/bin/env node
// Backlot Phase 0 CLI.
//   node src/cli.js produce [--idea "..."] [--mock]
//   node src/cli.js doctor
// Loads .env from the pipeline directory if present (zero-dep loader).

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

// Node's fetch ignores HTTPS_PROXY unless NODE_USE_ENV_PROXY is set at startup.
// In proxied environments (e.g. Claude Code cloud), re-exec once with it set so
// all provider calls route through the egress proxy like every other tool.
if (!process.env.NODE_USE_ENV_PROXY && (process.env.HTTPS_PROXY || process.env.https_proxy)) {
  const r = spawnSync(process.execPath, process.argv.slice(1), {
    stdio: "inherit",
    env: { ...process.env, NODE_USE_ENV_PROXY: "1", NODE_NO_WARNINGS: "1" },
  });
  process.exit(r.status ?? 0);
}
import { demoShow } from "./bible/demo-show.js";
import { produceEpisode } from "./stages/produce.js";
import { run } from "./util.js";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// .env loader
const envFile = path.join(root, ".env");
if (existsSync(envFile)) {
  for (const lineRaw of readFileSync(envFile, "utf8").split("\n")) {
    const line = lineRaw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const k = line.slice(0, eq).trim();
    const v = line.slice(eq + 1).trim();
    if (v && !(k in process.env)) process.env[k] = v;
  }
}

const args = process.argv.slice(2);
const cmd = args[0];
const flag = (name) => args.includes(`--${name}`);
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : dflt;
};

if (cmd === "doctor") {
  try {
    await run("ffmpeg", ["-version"]);
    console.log("ffmpeg: OK");
  } catch {
    console.log("ffmpeg: MISSING — install it (apt-get install ffmpeg / brew install ffmpeg)");
  }

  // Live connectivity checks: distinguishes egress-blocked / bad key /
  // no credits / OK, so provider issues are always one command to diagnose.
  const probe = async (name, fn) => {
    try {
      console.log(`${name}: ${await fn()}`);
    } catch (e) {
      const m = String(e.message ?? e);
      console.log(`${name}: NETWORK ERROR — ${m.slice(0, 120)}`);
    }
  };

  await probe("anthropic", async () => {
    if (!process.env.ANTHROPIC_API_KEY) return "no key (mock Screenwriter)";
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1,
        messages: [{ role: "user", content: "ok" }],
      }),
    });
    const body = await r.text();
    if (r.status === 200) return "OK — real Screenwriter active";
    if (r.status === 401) return "BAD KEY (401)";
    if (body.includes("credit balance")) return "KEY OK but NO API CREDITS — add credits at console.anthropic.com/settings/billing";
    if (body.includes("allowlist")) return "EGRESS BLOCKED — allow api.anthropic.com in the environment network settings";
    return `unexpected ${r.status}: ${body.slice(0, 100)}`;
  });

  await probe("elevenlabs", async () => {
    if (!process.env.ELEVENLABS_API_KEY) return "no key (mock voices)";
    const r = await fetch("https://api.elevenlabs.io/v1/user/subscription", {
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY },
    });
    const body = await r.text();
    if (body.includes("allowlist")) return "EGRESS BLOCKED — allow api.elevenlabs.io in the environment network settings";
    if (body.includes("missing_permissions"))
      return "reachable; key is RESTRICTED (no user_read) — TTS may still work; consider granting all scopes";
    if (r.status === 401) return "BAD KEY (401)";
    if (r.status !== 200) return `unexpected ${r.status}: ${body.slice(0, 100)}`;
    const s = JSON.parse(body);
    return `OK — tier ${s.tier}, ${s.character_count}/${s.character_limit} chars used`;
  });

  await probe("fal", async () => {
    const r = await fetch("https://queue.fal.run/fal-ai/any", {
      method: "POST",
      headers: process.env.FAL_KEY ? { Authorization: `Key ${process.env.FAL_KEY}` } : {},
    });
    const body = await r.text();
    if (body.includes("allowlist")) return "EGRESS BLOCKED — allow queue.fal.run, rest.fal.run and fal.media in the environment network settings";
    if (!process.env.FAL_KEY) return "no key (mock image/video) — egress reachable";
    if (r.status === 401 || r.status === 403) return "key present but rejected — check FAL_KEY";
    return `egress + key reachable (status ${r.status})`;
  });
  process.exit(0);
}

if (cmd === "bible") {
  const { buildBible } = await import("./stages/bible.js");
  const { quoteBible, printQuote } = await import("./cost.js");
  printQuote("Bible build quote", quoteBible({ show: demoShow }), { mock: flag("mock") || !process.env.FAL_KEY });
  await buildBible({ show: demoShow, outRoot: opt("out", path.join(root, "out")), forceMock: flag("mock"), force: flag("force") });
  process.exit(0);
}

if (cmd === "season") {
  const { getProviders } = await import("./providers/registry.js");
  const { writeFile, mkdir } = await import("node:fs/promises");
  const p = getProviders({ forceMock: flag("mock") });
  const season = await p.llm.generateSeason({ show: demoShow, episodeCount: Number(opt("episodes", "6")) });
  const dir = path.join(opt("out", path.join(root, "out")), "bible", demoShow.id);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "season.json"), JSON.stringify(season, null, 2));
  console.log(`\nSEASON ARC — destination: ${season.arc.destination}\n`);
  season.arc.acts.forEach((a, i) => console.log(`  Act ${i + 1}: ${a}`));
  console.log("\nEPISODE SLATE:");
  for (const e of season.episodes) {
    console.log(`\n  ${e.number}. ${e.title}\n     ${e.premise}\n     arc: ${e.arc_beat}`);
  }
  console.log(`\nSaved -> ${path.join(dir, "season.json")}`);
  console.log(`Produce one with: node src/cli.js produce --idea "<premise>"`);
  process.exit(0);
}

if (cmd === "retake") {
  const { retakeShot } = await import("./stages/retake.js");
  const epDir = opt("ep");
  if (!epDir) { console.error("retake requires --ep <episode dir>"); process.exit(1); }
  const { outFile } = await retakeShot({
    epDir: path.resolve(epDir),
    shotIdx: opt("shot"),
    note: opt("note"),
    outRoot: opt("out", path.join(root, "out")),
    forceMock: flag("mock"),
  });
  console.log(`Reassembled -> ${outFile}`);
  process.exit(0);
}

if (cmd === "review") {
  const { serveReview } = await import("./review.js");
  const epDir = opt("ep");
  if (!epDir) { console.error("review requires --ep <episode dir>"); process.exit(1); }
  await serveReview({
    epDir: path.resolve(epDir),
    outRoot: opt("out", path.join(root, "out")),
    port: Number(opt("port", "4321")),
    forceMock: flag("mock"),
  });
  // keep process alive
} else if (cmd === "produce") {
  const idea = opt("idea", "the espresso machine breaks on rent day");
  const outRoot = opt("out", path.join(root, "out"));
  const t0 = Date.now();
  const { outFile } = await produceEpisode({
    show: demoShow,
    idea,
    outRoot,
    forceMock: flag("mock"),
  });
  console.log(`\nDone in ${((Date.now() - t0) / 1000).toFixed(1)}s -> ${outFile}`);
  process.exit(0);
}

if (cmd !== "review") {
  console.log(`Backlot pipeline (Phase 0 spike)
Usage:
  node src/cli.js bible   [--mock] [--force]          build show bible (sheets, voices, jingle)
  node src/cli.js produce [--idea "episode idea"] [--mock] [--out DIR]
  node src/cli.js retake  --ep out/ep-XXXX --shot N [--note "make it bigger"] [--mock]
  node src/cli.js review  --ep out/ep-XXXX [--port 4321]
  node src/cli.js doctor`);
}
