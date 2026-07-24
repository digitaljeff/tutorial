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
async function toDataUri(localFile) {
  const { readFile } = await import("node:fs/promises");
  const buf = await readFile(localFile);
  const ext = localFile.toLowerCase().endsWith(".jpg") || localFile.toLowerCase().endsWith(".jpeg") ? "jpeg" : "png";
  return `data:image/${ext};base64,${buf.toString("base64")}`;
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
