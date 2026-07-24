// Real image + video providers via fal.ai's queue API.
// Activates automatically when FAL_KEY is set. Model ids come from env so we
// can A/B Seedream/Seedance/Kling/Veo without code changes (see .env.example).

import { writeFile } from "node:fs/promises";
import { keyframePrompt, videoPrompt } from "../../context.js";

async function falQueue(model, input) {
  const submit = await fetch(`https://queue.fal.run/${model}`, {
    method: "POST",
    headers: { Authorization: `Key ${process.env.FAL_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!submit.ok) throw new Error(`fal submit ${model} ${submit.status}: ${await submit.text()}`);
  const { status_url, response_url } = await submit.json();

  for (let i = 0; i < 240; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const s = await fetch(status_url, { headers: { Authorization: `Key ${process.env.FAL_KEY}` } });
    const st = await s.json();
    if (st.status === "COMPLETED") break;
    if (st.status === "FAILED" || st.status === "ERROR") throw new Error(`fal job failed: ${JSON.stringify(st)}`);
  }
  const r = await fetch(response_url, { headers: { Authorization: `Key ${process.env.FAL_KEY}` } });
  if (!r.ok) throw new Error(`fal result ${r.status}: ${await r.text()}`);
  return r.json();
}

async function download(url, outFile) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status} ${url}`);
  await writeFile(outFile, Buffer.from(await res.arrayBuffer()));
}

// fal accepts base64 data URIs anywhere it takes an image URL — no storage
// API dependency, no extra egress host.
const MIME = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", mp4: "video/mp4", wav: "audio/wav", mp3: "audio/mpeg" };
async function toDataUri(localFile) {
  const { readFile } = await import("node:fs/promises");
  const buf = await readFile(localFile);
  const ext = localFile.toLowerCase().split(".").pop();
  return `data:${MIME[ext] ?? "application/octet-stream"};base64,${buf.toString("base64")}`;
}

export async function generateKeyframe({ shot, show, outFile, referenceImages = [] }) {
  const { prompt, negative } = keyframePrompt(show, shot);
  const input = {
    prompt,
    negative_prompt: negative,
    image_size: { width: 1280, height: 720 },
  };
  // Character sheets as identity references: plain text-to-image models don't
  // accept them — route to the edit/reference variant when refs are present.
  let model = process.env.FAL_IMAGE_MODEL;
  if (referenceImages.length) {
    model = process.env.FAL_IMAGE_EDIT_MODEL || "fal-ai/bytedance/seedream/v4.5/edit";
    input.image_urls = await Promise.all(referenceImages.map(toDataUri));
  }
  const out = await falQueue(model, input);
  const url = out.images?.[0]?.url ?? out.image?.url;
  if (!url) throw new Error(`unexpected fal image output: ${JSON.stringify(out).slice(0, 300)}`);
  await download(url, outFile);
  return { file: outFile };
}

// Lip sync: re-animates the mouth in an existing clip to match dialogue audio.
// Kling LipSync accepts data URIs; audio must be >= 2s (pipeline pads to the
// clip duration, and dialogue shots have a 2.5s floor).
export async function applyLipSync({ clipFile, audioFile, outFile }) {
  const out = await falQueue(process.env.FAL_LIPSYNC_MODEL || "fal-ai/kling-video/lipsync/audio-to-video", {
    video_url: await toDataUri(clipFile),
    audio_url: await toDataUri(audioFile),
  });
  const url = out.video?.url;
  if (!url) throw new Error(`unexpected lipsync output: ${JSON.stringify(out).slice(0, 300)}`);
  await download(url, outFile);
  return { file: outFile };
}

export async function generateClip({ keyframe, keyframeUrl, shot, show, durationS, outFile }) {
  const imageUrl = keyframeUrl ?? (await toDataUri(keyframe));
  const out = await falQueue(process.env.FAL_VIDEO_MODEL, {
    image_url: imageUrl,
    prompt: videoPrompt(show, shot),
    duration: Math.min(Math.max(Math.round(durationS), 4), 12),
    resolution: "720p",
  });
  const url = out.video?.url ?? out.videos?.[0]?.url;
  if (!url) throw new Error(`unexpected fal video output: ${JSON.stringify(out).slice(0, 300)}`);
  await download(url, outFile);
  return { file: outFile };
}
