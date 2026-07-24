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

// Normalize a clip to EXACTLY durationS at 24fps: trims overlong clips
// (Seedance minimum is 4s even for shorter shots) and clone-pads short ones
// (Kling lipsync output can shrink a few frames). Without this the video
// timeline drifts against the audio overlay offsets — visible as lip-sync
// desync that worsens through the episode.
export async function normalizeClipDuration(file, durationS) {
  const tmp = `${file}.norm.mp4`;
  await ffmpeg([
    "-i", file,
    "-vf", `fps=24,tpad=stop_mode=clone:stop_duration=${durationS},format=yuv420p`,
    "-t", String(durationS),
    "-an", "-c:v", "libx264", "-preset", "veryfast",
    tmp,
  ]);
  const { rename } = await import("node:fs/promises");
  await rename(tmp, file);
}

// Simple concurrency limiter (ElevenLabs allows only 4-10 concurrent
// requests depending on tier; unbounded Promise.all trips 429s).
export function pLimit(n) {
  let active = 0;
  const queue = [];
  const next = () => {
    if (active >= n || !queue.length) return;
    active++;
    const { fn, resolve, reject } = queue.shift();
    fn().then(resolve, reject).finally(() => { active--; next(); });
  };
  return (fn) => new Promise((resolve, reject) => { queue.push({ fn, resolve, reject }); next(); });
}

export function log(stage, msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${stage.padEnd(10)} ${msg}`);
}
