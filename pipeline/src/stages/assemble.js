// Editor stage (docs/plan/04 stage 4): Episode timeline -> finished MP4.
// Real FFmpeg pipeline regardless of mock/real generation:
//   title card -> clips (hard cuts) -> credits
//   dialogue placed at known TTS offsets (no ASR anywhere)
//   music bed ducked under dialogue via sidechain compression
//   two-pass-lite loudness normalize, ASS captions burned in

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { ffmpeg, log } from "../util.js";

const W = 1280, H = 720, FPS = 24;
const CARD_S = 2.5;

async function makeCard({ line1, line2, outFile, durationS = CARD_S }) {
  const esc = (s) => s.replace(/[:'\\]/g, " ");
  await ffmpeg([
    "-f", "lavfi", "-i", `color=c=0x1a1a24:s=${W}x${H}:d=${durationS}`,
    "-vf",
    `drawtext=text='${esc(line1)}':fontcolor=0xF5C518:fontsize=72:x=(w-text_w)/2:y=h/2-70,` +
      `drawtext=text='${esc(line2)}':fontcolor=white@0.85:fontsize=30:x=(w-text_w)/2:y=h/2+30,` +
      `fade=t=in:d=0.4,fade=t=out:st=${durationS - 0.4}:d=0.4,format=yuv420p`,
    "-r", String(FPS), "-c:v", "libx264", "-preset", "veryfast", outFile,
  ]);
  return outFile;
}

function assTime(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  const sec = (s % 60).toFixed(2).padStart(5, "0");
  return `${h}:${String(m).padStart(2, "0")}:${sec}`;
}

function buildAss(shots, show, offsetS) {
  const colors = ["&H00A8E8FF&", "&H00FFD09B&", "&H00B5E8B5&", "&H00E8B5D8&"];
  const charColor = new Map(show.characters.map((c, i) => [c.id, colors[i % colors.length]]));
  let events = "";
  for (const shot of shots) {
    for (const lt of shot.line_times ?? []) {
      const c = show.characters.find((x) => x.id === lt.line.character_id);
      const start = assTime(lt.start_s + offsetS);
      const end = assTime(lt.start_s + lt.duration_s + offsetS);
      const text = `{\\c${charColor.get(c.id)}}${c.name}:{\\c&H00FFFFFF&} ${lt.line.text.replace(/[{}\\]/g, "")}`;
      events += `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}\n`;
    }
  }
  return `[Script Info]
ScriptType: v4.00+
PlayResX: ${W}
PlayResY: ${H}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, Outline, Shadow, Alignment, MarginL, MarginR, MarginV
Style: Default,DejaVu Sans,34,&H00FFFFFF,&H00101018,&H80101018,0,2,0,2,40,40,36

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${events}`;
}

export async function assemble({ shots, script, show, musicFile, workDir, outFile }) {
  const titleCard = await makeCard({
    line1: show.title,
    line2: script.title,
    outFile: path.join(workDir, "card_title.mp4"),
  });
  const creditsCard = await makeCard({
    line1: "Created with Backlot",
    line2: `Director: you  |  Cast: ${show.characters.map((c) => c.name).join(", ")}`,
    outFile: path.join(workDir, "card_credits.mp4"),
  });

  // 1) Video: hard-cut concat of title + clips + credits (all pre-normalized).
  const videoFiles = [titleCard, ...shots.map((s) => s.clipFile), creditsCard];
  const concatList = path.join(workDir, "concat.txt");
  await writeFile(concatList, videoFiles.map((f) => `file '${path.resolve(f)}'`).join("\n"));
  const videoOnly = path.join(workDir, "video.mp4");
  await ffmpeg(["-f", "concat", "-safe", "0", "-i", concatList, "-c:v", "libx264", "-preset", "veryfast", "-r", String(FPS), "-an", videoOnly]);
  log("assemble", `video track: ${videoFiles.length} segments`);

  // 2) Audio: dialogue lines at absolute offsets, music ducked underneath.
  const lineEntries = shots.flatMap((s) => s.line_times ?? []);
  const inputs = [];
  const delayFilters = [];
  lineEntries.forEach((lt, i) => {
    inputs.push("-i", lt.audioFile);
    const ms = Math.round((lt.start_s + CARD_S) * 1000);
    delayFilters.push(`[${i + 1}:a]adelay=${ms}:all=1[l${i}]`);
  });
  const dlgMix =
    lineEntries.length > 0
      ? `${delayFilters.join(";")};${lineEntries.map((_, i) => `[l${i}]`).join("")}amix=inputs=${lineEntries.length}:normalize=0[dlg]`
      : `anullsrc=r=44100:cl=stereo,atrim=0:1[dlg]`;
  const filter =
    `${dlgMix};` +
    `[dlg]asplit=2[d1][sc];` +
    `[0:a]volume=0.9[mus];` +
    `[mus][sc]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=400[mducked];` +
    `[d1][mducked]amix=inputs=2:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11[aout]`;
  const audioMix = path.join(workDir, "audio.m4a");
  await ffmpeg(["-i", musicFile, ...inputs, "-filter_complex", filter, "-map", "[aout]", "-c:a", "aac", audioMix]);
  log("assemble", `audio track: ${lineEntries.length} dialogue lines + ducked music bed`);

  // 3) Captions from known TTS timings, burn-in, mux.
  const assFile = path.join(workDir, "captions.ass");
  await writeFile(assFile, buildAss(shots, show, CARD_S));
  await ffmpeg([
    "-i", videoOnly, "-i", audioMix,
    "-vf", `ass=${assFile}`,
    "-map", "0:v", "-map", "1:a",
    "-c:v", "libx264", "-preset", "veryfast", "-c:a", "copy", "-shortest",
    outFile,
  ]);
  return outFile;
}
