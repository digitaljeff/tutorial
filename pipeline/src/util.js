import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";

export async function run(cmd, args, { quiet = true } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: quiet ? ["ignore", "pipe", "pipe"] : "inherit" });
    let err = "";
    p.stderr?.on("data", (d) => (err += d));
    p.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")}\nexit ${code}\n${err.slice(-2000)}`))
    );
  });
}

export const ffmpeg = (args) => run("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args]);

export async function ffprobeDuration(file) {
  return new Promise((resolve, reject) => {
    const p = spawn("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]);
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    p.on("close", (code) => (code === 0 ? resolve(parseFloat(out.trim())) : reject(new Error(`ffprobe failed on ${file}`))));
  });
}

export async function ensureDir(p) {
  await mkdir(p, { recursive: true });
  return p;
}

export function outPath(root, ...parts) {
  return path.join(root, ...parts);
}

// Deterministic tiny hash for cache keys / filenames
export function slug(s, max = 40) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, max);
}

export function log(stage, msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${stage.padEnd(10)} ${msg}`);
}
