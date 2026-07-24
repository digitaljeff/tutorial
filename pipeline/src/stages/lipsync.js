// Lip-sync stage (docs/plan/04 stage 3c): for each dialogue shot, pad the
// line audio to the shot's exact timeline (matching the assembly overlay
// offsets) and re-animate the mouth. Shot grammar guarantees one speaking
// character per shot, which is what makes this reliable.

import path from "node:path";
import { ffmpeg, log } from "../util.js";

export const LINE_LEAD_S = 0.3; // dialogue starts this far into its shot (must match shotlist.js)

// Build an audio file that matches the clip's timeline exactly:
// lead silence + line + tail padding to the full shot duration.
export async function padLineAudio({ audioFile, durationS, outFile }) {
  await ffmpeg([
    "-i", audioFile,
    "-af", `adelay=${Math.round(LINE_LEAD_S * 1000)}:all=1,apad`,
    "-t", String(durationS),
    outFile,
  ]);
  return outFile;
}

export async function lipSyncShots({ shots, providers, workDir, enabled = true }) {
  if (!enabled) return log("lipsync", "disabled (--no-lipsync)");
  const dialogueShots = shots.filter((s) => (s.line_times ?? s.lines ?? []).length > 0);
  let done = 0;
  await Promise.all(
    dialogueShots.map(async (shot) => {
      const lt = shot.line_times[0];
      const padded = path.join(workDir, `ls_pad_${shot.idx}.wav`);
      await padLineAudio({ audioFile: lt.audioFile ?? lt.line._audioFile, durationS: shot.duration_s, outFile: padded });
      await providers.lipsync.applyLipSync({ clipFile: shot.clipFile, audioFile: padded, outFile: shot.clipFile });
      log("lipsync", `shot ${shot.idx} synced (${++done}/${dialogueShots.length})`);
    })
  );
}
