// Shows are data, not code: one JSON file per show in pipeline/shows/<id>/.
// (Postgres replaces this directory when auth/multi-tenant lands; the shape
// is the doc-03 schema either way.)

import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SHOWS_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "shows");

export async function listShows() {
  if (!existsSync(SHOWS_ROOT)) return [];
  const dirs = await readdir(SHOWS_ROOT);
  const shows = [];
  for (const d of dirs) {
    const f = path.join(SHOWS_ROOT, d, "show.json");
    if (existsSync(f)) shows.push(JSON.parse(await readFile(f, "utf8")));
  }
  return shows;
}

export async function loadShow(id) {
  const f = path.join(SHOWS_ROOT, id, "show.json");
  if (!existsSync(f)) throw new Error(`unknown show '${id}' — expected ${f}. Create one with: create-show --logline "..."`);
  return JSON.parse(await readFile(f, "utf8"));
}

export async function saveShow(show) {
  if (!/^[a-z0-9-]{2,40}$/.test(show.id)) throw new Error(`invalid show id '${show.id}'`);
  const dir = path.join(SHOWS_ROOT, show.id);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "show.json"), JSON.stringify(show, null, 2));
  return show;
}

// Minimal shape check so Fast Start output can't half-write a broken show.
export function validateShow(s) {
  const errors = [];
  if (!s.id || !s.title || !s.logline) errors.push("id/title/logline required");
  if (!s.characters?.length || s.characters.length < 2) errors.push("need >= 2 characters");
  for (const c of s.characters ?? []) {
    if (!c.id || !c.name) errors.push(`character missing id/name`);
    if (!c.appearance?.canonical_descriptor) errors.push(`${c.id}: missing canonical_descriptor`);
    if (!c.speech?.voice_hint) errors.push(`${c.id}: missing speech.voice_hint`);
    c.speech.voice_provider ??= "elevenlabs";
    c.speech.voice_id ??= null;
    c.speech.mock_pitch_hz ??= 180 + Math.abs([...c.id].reduce((a, ch) => a + ch.charCodeAt(0), 0)) % 160;
    c.speech.verbal_tics ??= [];
    c.speech.delivery_tags_default ??= "[neutral]";
    c.personality ??= {};
    c.personality.traits ??= [];
  }
  if (!s.locations?.length) errors.push("need >= 1 location");
  for (const l of s.locations ?? []) {
    if (!l.id || !l.canonical_descriptor) errors.push("location missing id/descriptor");
    l.mock_color ??= "0x4a5568";
    l.name ??= l.id;
  }
  if (!s.style_guide?.visual || !s.style_guide?.writing) errors.push("style_guide.visual/writing required");
  s.style_guide.visual_negative ??=
    "photorealistic, live action, text overlays, watermark, extra people, duplicate person, crowd";
  if (!s.sound_kit?.score_mood || !s.sound_kit?.intro_jingle) errors.push("sound_kit.score_mood/intro_jingle required");
  s.format ??= {};
  s.format.target_runtime_s ??= 60;
  s.format.rating ??= "PG";
  s.format.aspect ??= "16:9";
  s.season_arc ??= { destination: "TBD", current_beat: "Episode 1: establish the world." };
  s.canon_digest ??= "Pilot. Nothing established yet beyond the bible.";
  return errors;
}
