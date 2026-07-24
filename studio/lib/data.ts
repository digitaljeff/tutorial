import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

// The pipeline is the engine; the studio reads its artifacts directly.
// Postgres replaces this file-backed layer when auth/multi-tenant lands.
export const PIPELINE_ROOT = path.resolve(process.cwd(), "..", "pipeline");
export const OUT_ROOT = path.join(PIPELINE_ROOT, "out");

export type Character = {
  id: string;
  name: string;
  role: string;
  appearance: { canonical_descriptor: string };
  personality: { traits: string[]; wants: string; comedic_function: string };
  speech: { voice_id: string | null; voice_hint?: string; delivery_tags_default: string };
};

export async function getShow() {
  const mod = await import(
    /* webpackIgnore: true */ pathToFileURL(path.join(PIPELINE_ROOT, "src", "bible", "demo-show.js")).href
  );
  return mod.demoShow;
}

export function getBibleState() {
  const f = path.join(OUT_ROOT, "bible", "steamed", "state.json");
  return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null;
}

export function getSeason() {
  const f = path.join(OUT_ROOT, "bible", "steamed", "season.json");
  return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null;
}

export type EpisodeSummary = {
  id: string;
  title: string;
  shots: number;
  qcFlags: number;
  retakes: number;
  estUsd: number | null;
  wallClockS: number | null;
  producedAt: string | null;
  hasVideo: boolean;
};

export function listEpisodes(): EpisodeSummary[] {
  if (!existsSync(OUT_ROOT)) return [];
  return readdirSync(OUT_ROOT)
    .filter((d) => d.startsWith("ep-"))
    .map((d) => {
      const dir = path.join(OUT_ROOT, d);
      const mf = path.join(dir, "episode.json");
      if (!existsSync(mf)) return null;
      try {
        const m = JSON.parse(readFileSync(mf, "utf8"));
        return {
          id: d,
          title: m.script?.title ?? d,
          shots: m.shots?.length ?? 0,
          qcFlags: (m.shots ?? []).filter((s: any) => s.qc && s.qc.pass === false).length,
          retakes: m.retakes?.length ?? 0,
          estUsd: m.quote?.total_usd ?? null,
          wallClockS: m.wall_clock_s ?? null,
          producedAt: m.produced_at ?? null,
          hasVideo: existsSync(path.join(dir, "episode.mp4")),
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => b!.id.localeCompare(a!.id)) as EpisodeSummary[];
}

export function getEpisode(id: string) {
  if (!/^ep-\d+$/.test(id)) return null;
  const f = path.join(OUT_ROOT, id, "episode.json");
  if (!existsSync(f)) return null;
  const m = JSON.parse(readFileSync(f, "utf8"));
  const videoFile = path.join(OUT_ROOT, id, "episode.mp4");
  return {
    id,
    manifest: m,
    videoMtime: existsSync(videoFile) ? statSync(videoFile).mtimeMs : 0,
  };
}

// Convert an absolute pipeline path into a /api/media url (with traversal guard).
export function mediaUrl(absPath: string) {
  const rel = path.relative(OUT_ROOT, absPath);
  if (rel.startsWith("..")) return "";
  return `/api/media/${rel.split(path.sep).map(encodeURIComponent).join("/")}`;
}
