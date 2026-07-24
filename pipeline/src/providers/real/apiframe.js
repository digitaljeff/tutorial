// apiframe.ai v2 adapter — UNOFFICIAL Suno wrapper (also proxies Udio, Lyria,
// ElevenLabs Music, Mureka behind one key). PROTOTYPE-ONLY per docs/plan/08:
// Suno has no official public API and wrapper access carries ToS/rights risk.
// Published episodes must use the licensed path (ElevenLabs Music / Lyria)
// until Suno's official partner API accepts us. Selected via MUSIC_PROVIDER=apiframe.
//
// v2 API (afk_ keys): POST /v2/music/generate {model, prompt} with x-api-key
// header -> {jobId}; poll GET /v2/jobs/{id} -> result.tracks[].audioUrl.

import { writeFile, unlink } from "node:fs/promises";
import { ffmpeg } from "../../util.js";

const BASE = "https://api.apiframe.ai/v2";
const headers = () => ({ "x-api-key": process.env.APIFRAME_API_KEY, "Content-Type": "application/json" });

export async function generateMusic({ durationS, prompt, outFile }) {
  const model = process.env.APIFRAME_MUSIC_MODEL || "suno";
  const sub = await fetch(`${BASE}/music/generate`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model,
      prompt: `${prompt}. Instrumental only, no vocals. Short production music cue for an animated sitcom.`,
    }),
  });
  const subText = await sub.text();
  if (!sub.ok) throw new Error(`apiframe music/generate ${sub.status}: ${subText.slice(0, 200)}`);
  const { jobId } = JSON.parse(subText);

  let result;
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const res = await (await fetch(`${BASE}/jobs/${jobId}`, { headers: headers() })).json();
    if (res.status === "COMPLETED") { result = res.result; break; }
    if (res.status === "FAILED" || res.status === "ERROR") throw new Error(`apiframe job failed: ${JSON.stringify(res.error ?? res).slice(0, 200)}`);
  }
  const track = result?.tracks?.[0];
  if (!track?.audioUrl) throw new Error(`apiframe: no track in result (job ${jobId})`);

  const audio = await fetch(track.audioUrl);
  if (!audio.ok) throw new Error(`apiframe audio download ${audio.status} — allowlist ${new URL(track.audioUrl).host}?`);
  const raw = `${outFile}.raw.mp3`;
  await writeFile(raw, Buffer.from(await audio.arrayBuffer()));
  // Full-length songs come back; trim to the requested bed length with a tail fade.
  await ffmpeg(["-i", raw, "-t", String(durationS), "-af", `afade=t=out:st=${Math.max(0, durationS - 2)}:d=2`, outFile]);
  await unlink(raw).catch(() => {});
  return { file: outFile, source: `apiframe-${model}`, track_id: track.id, title: track.title };
}
