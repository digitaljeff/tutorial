// Bible build stage (docs/plan/01 §B): one-time per-show asset generation —
// character turnaround sheets, designed voices, intro jingle.
// Results persist to out/bible/<show>/state.json; produce() consumes them and
// (with real providers) passes sheet images as generation references.

import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { getProviders } from "../providers/registry.js";
import { ensureDir, log } from "../util.js";

const SHEET_VIEWS = [
  { id: "front", framing: "full body character turnaround, front view, neutral pose, plain grey background" },
  { id: "side", framing: "full body character turnaround, side profile view, neutral pose, plain grey background" },
  { id: "expressions", framing: "character expression sheet, 4 panel grid: neutral, annoyed, delighted, shocked, plain grey background" },
];

export function bibleDir(outRoot, show) {
  return path.join(outRoot, "bible", show.id);
}

export async function loadBibleState(outRoot, show) {
  const f = path.join(bibleDir(outRoot, show), "state.json");
  if (!existsSync(f)) return null;
  return JSON.parse(await readFile(f, "utf8"));
}

export async function buildBible({ show, outRoot, forceMock = false, force = false }) {
  const p = getProviders({ forceMock });
  const dir = await ensureDir(bibleDir(outRoot, show));
  const sheetsDir = await ensureDir(path.join(dir, "sheets"));
  const state = (!force && (await loadBibleState(outRoot, show))) || { characters: {}, jingle: null };

  for (const c of show.characters) {
    const cs = (state.characters[c.id] ??= { sheets: {}, voice_id: c.speech.voice_id ?? null });

    // Turnaround sheets — one image per view, character descriptor verbatim.
    for (const view of SHEET_VIEWS) {
      const outFile = path.join(sheetsDir, `${c.id}_${view.id}.png`);
      if (!force && cs.sheets[view.id] && existsSync(outFile)) continue;
      await p.image.generateKeyframe({
        show,
        shot: {
          idx: `${c.id}-${view.id}`,
          location_id: show.locations[0].id, // style/lighting anchor for mocks
          character_ids: [c.id],
          framing: view.framing,
          action: `Character sheet: ${c.name}, ${view.id} view`,
        },
        outFile,
      });
      cs.sheets[view.id] = outFile;
      log("bible", `sheet ${c.id}/${view.id}`);
    }

    // Voice: real path designs a voice from the character description and
    // stores the minted voice_id; mock path records the synth pitch.
    if (!cs.voice_id) {
      if (p.voice?.designVoice && !forceMock && process.env.ELEVENLABS_API_KEY) {
        try {
          const { voice_id } = await p.voice.designVoice({ character: c });
          cs.voice_id = voice_id;
          log("bible", `voice designed for ${c.id}: ${voice_id}`);
        } catch (e) {
          log("bible", `WARN voice design for ${c.id} failed (${String(e.message).slice(0, 90)}) — will use default voice`);
          cs.voice_id = null;
        }
      } else {
        cs.voice_id = null; // mock TTS uses character.speech.mock_pitch_hz
        log("bible", `voice for ${c.id}: mock (design pending API key)`);
      }
    }
  }

  // Intro jingle — generated once, reused on every episode (sonic brand).
  const jingleFile = path.join(dir, "jingle.wav");
  if (force || !state.jingle || !existsSync(jingleFile)) {
    await p.music.generateMusic({ durationS: 8, prompt: show.sound_kit.intro_jingle, outFile: jingleFile });
    state.jingle = jingleFile;
    log("bible", "intro jingle generated");
  }

  await writeFile(path.join(dir, "state.json"), JSON.stringify(state, null, 2));
  log("bible", `state saved -> ${path.join(dir, "state.json")}`);
  return state;
}
