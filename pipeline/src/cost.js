// Cost estimator (docs/plan/06): every episode gets a pre-flight quote and a
// post-production receipt. Unit costs are the mid-2026 numbers from
// docs/plan/05-model-stack.md — refresh when providers reprice.

const UNIT = {
  script_llm: 0.5, // Claude script + revisions, per episode
  keyframe: 0.04, // Seedream 4.5 per image
  video_per_s: 0.052, // Seedance 1.5 Pro 720p w/ audio (~$0.26 per 5s)
  tts_per_char: 0.0001, // ElevenLabs multilingual ~$0.10/1k chars
  music_per_min: 0.15, // ElevenLabs Music (verify tier)
  lipsync_per_shot: 0.05, // Kling LipSync via fal (verify billed rate)
  sheet_image: 0.04, // per character-sheet view
  voice_design: 0.1, // per designed voice (preview text credits)
};

export function quoteEpisode({ shots, script }) {
  const videoSeconds = shots.reduce((s, x) => s + (x.duration_s ?? x.base_duration_s ?? 5), 0);
  const chars = script.scenes.flatMap((s) => s.lines).reduce((n, l) => n + l.text.length, 0);
  const items = [
    { item: "script (LLM)", qty: 1, usd: UNIT.script_llm },
    { item: "keyframes", qty: shots.length, usd: shots.length * UNIT.keyframe },
    { item: `video (${videoSeconds.toFixed(0)}s)`, qty: shots.length, usd: videoSeconds * UNIT.video_per_s },
    { item: `dialogue TTS (${chars} chars)`, qty: chars, usd: chars * UNIT.tts_per_char },
    {
      item: "lip sync (dialogue shots)",
      qty: shots.filter((s) => (s.lines ?? []).length).length,
      usd: shots.filter((s) => (s.lines ?? []).length).length * UNIT.lipsync_per_shot,
    },
    { item: "music bed", qty: 1, usd: (videoSeconds / 60) * UNIT.music_per_min },
  ];
  const total = items.reduce((s, i) => s + i.usd, 0);
  return { items, total_usd: +total.toFixed(2), video_seconds: +videoSeconds.toFixed(1) };
}

export function quoteBible({ show, viewsPerCharacter = 3 }) {
  const n = show.characters.length;
  const items = [
    { item: "character sheets", qty: n * viewsPerCharacter, usd: n * viewsPerCharacter * UNIT.sheet_image },
    { item: "voice design", qty: n, usd: n * UNIT.voice_design },
    { item: "intro jingle", qty: 1, usd: 8 / 60 * UNIT.music_per_min },
  ];
  const total = items.reduce((s, i) => s + i.usd, 0);
  return { items, total_usd: +total.toFixed(2) };
}

export function printQuote(title, quote, { mock }) {
  console.log(`\n--- ${title} ---`);
  for (const i of quote.items) console.log(`  ${i.item.padEnd(28)} $${i.usd.toFixed(2)}`);
  console.log(`  ${"TOTAL (est.)".padEnd(28)} $${quote.total_usd.toFixed(2)}${mock ? "  (mock providers: $0.00 actual)" : ""}\n`);
}
