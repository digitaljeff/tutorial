// Retake stage (docs/plan/04 stage 5): regenerate ONE shot from the episode
// manifest — optionally steered by a director note — then reassemble the cut.
// Nothing else regenerates; this is the core cost-containment mechanic.

import path from "node:path";
import { readFile, writeFile, copyFile } from "node:fs/promises";
import { getProviders } from "../providers/registry.js";
import { assemble } from "./assemble.js";
import { loadBibleState } from "./bible.js";
import { characterSheets } from "./produce.js";
import { log } from "../util.js";
import { demoShow } from "../bible/demo-show.js";

const SHOWS = { [demoShow.id]: demoShow }; // show registry (Postgres later)

export async function loadManifest(epDir) {
  return JSON.parse(await readFile(path.join(epDir, "episode.json"), "utf8"));
}

export async function retakeShot({ epDir, shotIdx, note, outRoot, forceMock = false }) {
  const p = getProviders({ forceMock });
  const manifest = await loadManifest(epDir);
  const show = SHOWS[manifest.show_id];
  if (!show) throw new Error(`unknown show '${manifest.show_id}'`);
  const shot = manifest.shots.find((s) => s.idx === Number(shotIdx));
  if (!shot) throw new Error(`no shot ${shotIdx} in ${epDir}`);
  const bible = await loadBibleState(outRoot, show);

  // Director note steers the regeneration prompt (recorded in the manifest).
  const genShot = note ? { ...shot, action: `${shot.action}. DIRECTOR NOTE: ${note}` } : shot;
  log("retake", `shot ${shot.idx}${note ? ` — note: "${note}"` : ""}`);

  await copyFile(shot.keyframeFile, shot.keyframeFile.replace(/\.png$/, `.v${(manifest.retakes.length || 0) + 1}.png`)).catch(() => {});
  await p.image.generateKeyframe({
    shot: genShot,
    show,
    outFile: shot.keyframeFile,
    referenceImages: characterSheets(bible, shot.character_ids),
  });
  await p.video.generateClip({
    keyframe: shot.keyframeFile,
    shot: genShot,
    show,
    durationS: shot.duration_s,
    outFile: shot.clipFile,
  });
  const { normalizeClipDuration } = await import("../util.js");
  await normalizeClipDuration(shot.clipFile, shot.duration_s);
  if (shot.line_times?.length) {
    const { lipSyncShots } = await import("./lipsync.js");
    await lipSyncShots({ shots: [shot], providers: p, workDir: path.join(epDir, "work") });
  }

  const outFile = path.join(epDir, "episode.mp4");
  await assemble({
    shots: manifest.shots,
    script: manifest.script,
    show,
    musicFile: manifest.music_file,
    jingleFile: manifest.jingle_file,
    workDir: path.join(epDir, "work"),
    outFile,
  });

  manifest.retakes.push({ shot: shot.idx, note: note ?? null, at: new Date().toISOString() });
  await writeFile(path.join(epDir, "episode.json"), JSON.stringify(manifest, null, 2));
  log("retake", `shot ${shot.idx} regenerated + episode reassembled`);
  return { outFile };
}
