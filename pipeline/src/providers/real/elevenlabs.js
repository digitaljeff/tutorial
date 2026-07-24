// Real dialogue audio via ElevenLabs TTS.
// Activates automatically when ELEVENLABS_API_KEY is set.
// v3 audio tags: delivery_tags like "[dry]" are prepended to the text when the
// model supports them (eleven_v3); stripped otherwise.

import { writeFile } from "node:fs/promises";
import { ffprobeDuration } from "../../util.js";

export async function generateLineAudio({ line, character, outFile }) {
  const model = process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2";
  const voiceId = character.speech.voice_id || process.env.ELEVENLABS_DEFAULT_VOICE;
  const useTags = model.startsWith("eleven_v3");
  const text = useTags && line.delivery_tags ? `${line.delivery_tags} ${line.text}` : line.text;

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ text, model_id: model }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  await writeFile(outFile, Buffer.from(await res.arrayBuffer()));
  return { file: outFile, durationS: await ffprobeDuration(outFile) };
}

// Voice Design: mint a synthetic voice from the character description
// (no cloning consent needed — docs/plan/08). Two-step: generate previews,
// then save the first preview as a permanent voice. Endpoint shapes per
// ElevenLabs text-to-voice docs — verify against live docs on first run.
export async function designVoice({ character }) {
  const desc =
    `${character.name}: ${character.personality.traits.join(", ")}. ` +
    `Voice for an animated sitcom character. ${character.speech.delivery_tags_default} energy. ` +
    `${character.role === "foil" ? "Low, unhurried, deadpan." : "Quick, bright, wound tight."}`;
  const preview = await fetch("https://api.elevenlabs.io/v1/text-to-voice/design", {
    method: "POST",
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      voice_description: desc,
      text: "You want the truth about this coffee? It has notes. Mostly notes of regret, but notes.",
    }),
  });
  if (!preview.ok) throw new Error(`ElevenLabs voice design ${preview.status}: ${await preview.text()}`);
  const { previews } = await preview.json();
  const save = await fetch("https://api.elevenlabs.io/v1/text-to-voice", {
    method: "POST",
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      voice_name: `backlot-${character.id}`,
      voice_description: desc,
      generated_voice_id: previews[0].generated_voice_id,
    }),
  });
  if (!save.ok) throw new Error(`ElevenLabs voice save ${save.status}: ${await save.text()}`);
  return { voice_id: (await save.json()).voice_id };
}

// Music: ElevenLabs Music API (verify plan tier + pricing tomorrow, doc 05).
export async function generateMusic({ durationS, prompt, outFile }) {
  const res = await fetch("https://api.elevenlabs.io/v1/music", {
    method: "POST",
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: prompt ?? "light jazzy sitcom underscore, brushed drums, upright bass, playful, instrumental",
      music_length_ms: Math.round(durationS * 1000),
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs Music ${res.status}: ${await res.text()}`);
  await writeFile(outFile, Buffer.from(await res.arrayBuffer()));
  return { file: outFile };
}
