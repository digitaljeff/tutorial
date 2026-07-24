// Mock media providers: everything is generated locally with ffmpeg so the
// full pipeline (keyframe -> clip -> dialogue audio -> music -> assembly)
// runs with zero API keys. Shapes match the real providers exactly.

import { ffmpeg } from "../../util.js";

const W = 1280, H = 720, FPS = 24;

// Keyframe: location-colored card with a vignette + shot label, so cuts are
// visually distinguishable in the assembled episode.
export async function generateKeyframe({ shot, show, outFile }) {
  const loc = show.locations.find((l) => l.id === shot.location_id);
  const color = loc?.mock_color ?? "0x555555";
  const label = `${shot.idx}. ${shot.location_id} | ${shot.character_ids.join(" + ")}`;
  const action = shot.action.replace(/[:'\\]/g, " ").slice(0, 70);
  await ffmpeg([
    "-f", "lavfi", "-i", `color=c=${color}:s=${W}x${H}`,
    "-vf",
    `vignette,drawtext=text='${label}':fontcolor=white:fontsize=40:x=(w-text_w)/2:y=h/2-60,` +
      `drawtext=text='${action}':fontcolor=white@0.8:fontsize=24:x=(w-text_w)/2:y=h/2+20`,
    "-frames:v", "1", outFile,
  ]);
  return { file: outFile };
}

// Clip: slow zoompan over the keyframe for the shot duration (mirrors the real
// image-to-video step; keyframe-first is the production architecture too).
export async function generateClip({ keyframe, durationS, outFile }) {
  const frames = Math.round(durationS * FPS);
  await ffmpeg([
    "-loop", "1", "-i", keyframe,
    "-vf",
    `zoompan=z='min(zoom+0.0008,1.15)':d=${frames}:s=${W}x${H}:fps=${FPS},format=yuv420p`,
    "-t", String(durationS), "-c:v", "libx264", "-preset", "veryfast", outFile,
  ]);
  return { file: outFile };
}

// Dialogue line: character-pitched tone with vibrato ("voice-ish") whose
// duration scales with text length, so timing logic downstream is realistic.
export async function generateLineAudio({ line, character, outFile }) {
  const durationS = Math.max(1.0, Math.min(8, line.text.length / 15));
  const pitch = character.speech.mock_pitch_hz ?? 220;
  await ffmpeg([
    "-f", "lavfi",
    "-i", `sine=frequency=${pitch}:duration=${durationS.toFixed(2)}`,
    "-af", "vibrato=f=6:d=0.4,volume=0.55,afade=t=in:d=0.05,afade=t=out:st=" + (durationS - 0.1).toFixed(2) + ":d=0.1",
    outFile,
  ]);
  return { file: outFile, durationS };
}

// Lip sync mock: passthrough — the clip already exists, nothing to move.
export async function applyLipSync({ clipFile, outFile }) {
  if (clipFile !== outFile) {
    const { copyFile } = await import("node:fs/promises");
    await copyFile(clipFile, outFile);
  }
  return { file: outFile };
}

// Music bed: soft two-note pad long enough to cover the episode.
export async function generateMusic({ durationS, outFile }) {
  await ffmpeg([
    "-f", "lavfi", "-i", `sine=frequency=196:duration=${durationS}`,
    "-f", "lavfi", "-i", `sine=frequency=247:duration=${durationS}`,
    "-filter_complex", "[0:a][1:a]amix=inputs=2:normalize=0,volume=0.25,tremolo=f=0.5:d=0.3[a]",
    "-map", "[a]", outFile,
  ]);
  return { file: outFile };
}
