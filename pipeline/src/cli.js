#!/usr/bin/env node
// Backlot Phase 0 CLI.
//   node src/cli.js produce [--idea "..."] [--mock]
//   node src/cli.js doctor
// Loads .env from the pipeline directory if present (zero-dep loader).

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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
  for (const k of ["ANTHROPIC_API_KEY", "FAL_KEY", "ELEVENLABS_API_KEY"]) {
    console.log(`${k}: ${process.env[k] ? "set (real provider active)" : "not set (mock provider)"}`);
  }
  process.exit(0);
}

if (cmd === "produce") {
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

console.log(`Backlot pipeline (Phase 0 spike)
Usage:
  node src/cli.js produce [--idea "episode idea"] [--mock] [--out DIR]
  node src/cli.js doctor`);
