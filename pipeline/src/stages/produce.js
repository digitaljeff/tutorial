// Orchestrator: episode idea -> finished MP4 (docs/plan/04 stages 1-4).
// In production this becomes a Temporal workflow; the stage boundaries and
// artifact layout here map 1:1 onto those future activities.

import path from "node:path";
import { writeFile } from "node:fs/promises";
import { getProviders } from "../providers/registry.js";
import { scriptToShotlist, applyAudioTiming } from "./shotlist.js";
import { assemble } from "./assemble.js";
import { buildBible, loadBibleState } from "./bible.js";
import { quoteEpisode, printQuote } from "../cost.js";
import { ensureDir, log } from "../util.js";

export function characterSheets(bible, characterIds) {
  if (!bible) return [];
  return characterIds.flatMap((id) => {
    const s = bible.characters[id]?.sheets ?? {};
    return [s.front, s.side].filter(Boolean);
  });
}

export async function produceEpisode({ show, idea, outRoot, forceMock = false }) {
  const p = getProviders({ forceMock });

  // Stage 0 — ensure the show bible exists (sheets, voices, jingle).
  let bible = await loadBibleState(outRoot, show);
  if (!bible) {
    log("bible", "no bible state found — building show bible first");
    bible = await buildBible({ show, outRoot, forceMock });
  }
  for (const c of show.characters) {
    c.speech.voice_id = bible.characters[c.id]?.voice_id ?? c.speech.voice_id;
  }

  const epDir = await ensureDir(path.join(outRoot, `ep-${Date.now()}`));
  const dirs = {
    keyframes: await ensureDir(path.join(epDir, "keyframes")),
    clips: await ensureDir(path.join(epDir, "clips")),
    audio: await ensureDir(path.join(epDir, "audio")),
    work: await ensureDir(path.join(epDir, "work")),
  };

  // Stage 1 — script (human gate in the product; auto-approved in the spike)
  log("script", `writing script for idea: "${idea}"`);
  const script = await p.llm.generateScript({ show, idea });
  await writeFile(path.join(epDir, "script.json"), JSON.stringify(script, null, 2));
  const lineCount = script.scenes.reduce((n, s) => n + s.lines.length, 0);
  log("script", `"${script.title}" — ${script.scenes.length} scenes, ${lineCount} lines`);

  // Stage 2 — shot list + pre-flight quote (soft gate in the product)
  const shots = scriptToShotlist(script, show);
  log("shotlist", `${shots.length} shots (coverage grammar: establishing + singles)`);

  // Stage 3a — dialogue audio FIRST (audio-driven timing)
  const lineDurations = new Map();
  await Promise.all(
    shots.flatMap((shot) =>
      shot.lines.map(async (line, li) => {
        const character = show.characters.find((c) => c.id === line.character_id);
        const outFile = path.join(dirs.audio, `s${shot.idx}_l${li}.wav`);
        const { durationS } = await p.tts.generateLineAudio({ line, character, outFile });
        lineDurations.set(line, durationS);
        line._audioFile = outFile;
      })
    )
  );
  const { total_s } = applyAudioTiming(shots, lineDurations);
  for (const shot of shots) for (const lt of shot.line_times) lt.audioFile = lt.line._audioFile;
  log("tts", `${lineDurations.size} lines voiced; episode body ${total_s}s`);
  printQuote(`Episode quote: "${script.title}"`, quoteEpisode({ shots, script }), {
    mock: forceMock || !process.env.FAL_KEY,
  });

  // Stage 3b — keyframes then clips, all shots in parallel.
  // Character sheets ride along as identity references (real providers).
  await Promise.all(
    shots.map(async (shot) => {
      const kf = path.join(dirs.keyframes, `shot${String(shot.idx).padStart(2, "0")}.png`);
      await p.image.generateKeyframe({
        shot,
        show,
        outFile: kf,
        referenceImages: characterSheets(bible, shot.character_ids),
      });
      shot.keyframeFile = kf;
      const clip = path.join(dirs.clips, `shot${String(shot.idx).padStart(2, "0")}.mp4`);
      await p.video.generateClip({ keyframe: kf, shot, show, durationS: shot.duration_s, outFile: clip });
      shot.clipFile = clip;
    })
  );
  log("video", `${shots.length} keyframes + clips generated`);

  // Stage 3c — music bed (covers cards + body)
  const musicFile = path.join(dirs.audio, "music.wav");
  await p.music.generateMusic({
    durationS: Math.ceil(total_s + 6),
    prompt: show.sound_kit.score_mood,
    outFile: musicFile,
  });

  // Stage 4 — assembly
  const outFile = path.join(epDir, "episode.mp4");
  await assemble({ shots, script, show, musicFile, jingleFile: bible.jingle, workDir: dirs.work, outFile });

  // Manifest: everything needed for retakes + reassembly.
  const manifest = {
    show_id: show.id,
    idea,
    script,
    music_file: musicFile,
    jingle_file: bible.jingle,
    retakes: [],
    shots: shots.map((s) => ({
      idx: s.idx,
      scene: s.scene,
      location_id: s.location_id,
      character_ids: s.character_ids,
      framing: s.framing,
      action: s.action,
      duration_s: s.duration_s,
      start_s: s.start_s,
      keyframeFile: s.keyframeFile,
      clipFile: s.clipFile,
      line_times: (s.line_times ?? []).map((lt) => ({
        start_s: lt.start_s,
        duration_s: lt.duration_s,
        audioFile: lt.audioFile,
        line: { character_id: lt.line.character_id, text: lt.line.text, delivery_tags: lt.line.delivery_tags },
      })),
    })),
  };
  await writeFile(path.join(epDir, "episode.json"), JSON.stringify(manifest, null, 2));
  log("done", `episode at ${outFile}`);
  return { outFile, epDir, script, shots };
}
