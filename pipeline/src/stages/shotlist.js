// Line Producer (docs/plan/04): structured script -> shot list.
// Sitcom coverage grammar: an establishing two-shot per scene, then alternating
// singles per dialogue line (one speaking character per shot = better lip-sync
// and face consistency). Shot durations are AUDIO-DRIVEN: filled in after TTS.

export function scriptToShotlist(script, show) {
  const shots = [];
  let idx = 0;
  for (const [sceneIdx, scene] of script.scenes.entries()) {
    // Establishing shot (no dialogue) only for scene changes, kept short.
    shots.push({
      idx: idx++,
      scene: sceneIdx,
      location_id: scene.location_id,
      character_ids: scene.character_ids,
      framing: "wide establishing two-shot, eye level",
      action: scene.action,
      lines: [],
      base_duration_s: 2.0,
    });
    for (const line of scene.lines) {
      shots.push({
        idx: idx++,
        scene: sceneIdx,
        location_id: scene.location_id,
        character_ids: [line.character_id],
        framing: "medium single, sitcom coverage, character facing slightly off-camera",
        action: `${show.characters.find((c) => c.id === line.character_id).name} speaks: "${line.text.slice(0, 60)}"`,
        lines: [line],
        base_duration_s: 0, // audio-driven; set after TTS
      });
    }
  }
  return shots;
}

// Called after TTS: shot duration = dialogue duration + breathing room.
export function applyAudioTiming(shots, lineDurations) {
  let t = 0;
  for (const shot of shots) {
    const dialogue = shot.lines.reduce((s, l) => s + (lineDurations.get(l) ?? 0), 0);
    shot.duration_s = Math.max(shot.base_duration_s, +(dialogue + 0.6).toFixed(2));
    shot.start_s = +t.toFixed(2);
    // Lines start 0.3s into the shot, sequential.
    let lt = t + 0.3;
    shot.line_times = shot.lines.map((l) => {
      const d = lineDurations.get(l) ?? 0;
      const entry = { line: l, start_s: +lt.toFixed(2), duration_s: d };
      lt += d + 0.25;
      return entry;
    });
    t += shot.duration_s;
  }
  return { shots, total_s: +t.toFixed(2) };
}
