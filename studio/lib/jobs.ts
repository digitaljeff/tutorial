import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, openSync } from "node:fs";
import path from "node:path";
import { PIPELINE_ROOT, OUT_ROOT } from "./data";

// Minimal job runner: each produce/retake is a detached pipeline CLI process
// logging to out/jobs/<id>.log. Temporal replaces this in production — the
// stage boundaries stay identical.
const JOBS_DIR = path.join(OUT_ROOT, "jobs");

export type Job = {
  id: string;
  kind: "produce" | "retake";
  args: Record<string, string>;
  startedAt: string;
  pid?: number;
};

function jobFile(id: string) {
  return path.join(JOBS_DIR, `${id}.json`);
}

export function startJob(kind: Job["kind"], cliArgs: string[], args: Record<string, string>): Job {
  mkdirSync(JOBS_DIR, { recursive: true });
  const id = `${kind}-${Date.now()}`;
  const log = path.join(JOBS_DIR, `${id}.log`);
  const fd = openSync(log, "a");
  const child = spawn(process.execPath, [path.join(PIPELINE_ROOT, "src", "cli.js"), ...cliArgs], {
    cwd: PIPELINE_ROOT,
    detached: true,
    stdio: ["ignore", fd, fd],
    env: { ...process.env },
  });
  child.unref();
  const job: Job = { id, kind, args, startedAt: new Date().toISOString(), pid: child.pid };
  writeFileSync(jobFile(id), JSON.stringify(job, null, 2));
  return job;
}

export function getJobStatus(id: string) {
  if (!/^[a-z]+-\d+$/.test(id)) return null;
  const f = jobFile(id);
  if (!existsSync(f)) return null;
  const job: Job = JSON.parse(readFileSync(f, "utf8"));
  const log = path.join(JOBS_DIR, `${id}.log`);
  const text = existsSync(log) ? readFileSync(log, "utf8") : "";
  const done = /\bdone\s+episode at|Reassembled ->|Error|FAILED/.test(text) && !isRunning(job.pid);
  // Find the episode dir the job produced (logged as "episode at <path>").
  const epMatch = text.match(/episode at .*\/(ep-\d+)\//);
  return {
    job,
    running: isRunning(job.pid),
    done,
    episodeId: epMatch?.[1] ?? null,
    logTail: text.split("\n").slice(-25).join("\n"),
  };
}

export function listJobs(): Job[] {
  if (!existsSync(JOBS_DIR)) return [];
  return readdirSync(JOBS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(path.join(JOBS_DIR, f), "utf8")))
    .sort((a, b) => b.id.localeCompare(a.id));
}

function isRunning(pid?: number) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
