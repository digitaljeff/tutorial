// Orchestrator: episode idea -> finished MP4 (docs/plan/04 stages 1-4).
// In production this becomes a Temporal workflow; the stage boundaries and
// artifact layout here map 1:1 onto those future activities.

import path from "node:path";
import { writeFile } from "node:fs/promises";
import { getProviders } from "../providers/registry.js";
import { scriptToShotlist, applyAudioTiming } from "./shotlist.js";
import { assemble } from "./assemble.js";
import { ensureDir, log } from "../util.js";

export async function produceEpisode({ show, idea, outRoot, forceMock = false }) {
  const p = getProviders({ forceMock });
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

  // Stage 2 — shot list
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

  // Stage 3b — keyframes then clips, all shots in parallel
  await Promise.all(
    shots.map(async (shot) => {
      const kf = path.join(dirs.keyframes, `shot${String(shot.idx).padStart(2, "0")}.png`);
      await p.image.generateKeyframe({ shot, show, outFile: kf });
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
  await assemble({ shots, script, show, musicFile, workDir: dirs.work, outFile });
  await writeFile(
    path.join(epDir, "shotlist.json"),
    JSON.stringify(shots.map(({ lines, line_times, ...s }) => ({ ...s, lines: lines.map((l) => l.text) })), null, 2)
  );
  log("done", `episode at ${outFile}`);
  return { outFile, epDir, script, shots };
}
