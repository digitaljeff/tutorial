// Deterministic Context Pack assembly (docs/plan/03-knowledge-base.md).
// Each pipeline stage receives an exactly-templated projection of the bible —
// agents never search-and-hope.

export function writingContext(show) {
  const cast = show.characters
    .map(
      (c) =>
        `${c.name} (${c.role}): traits ${c.personality.traits.join(", ")}; wants ${c.personality.wants}; comedic function: ${c.personality.comedic_function}; tics: ${c.speech.verbal_tics.join(", ")}`
    )
    .join("\n");
  return [
    `SHOW: ${show.title} — ${show.logline}`,
    `WRITING STYLE: ${show.style_guide.writing}`,
    `FORMAT: ${show.format.target_runtime_s}s episode, rating ${show.format.rating}.`,
    `CAST:\n${cast}`,
    `LOCATIONS: ${show.locations.map((l) => `${l.id} = ${l.name}`).join("; ")}`,
    `SEASON ARC BEAT: ${show.season_arc.current_beat}`,
    `CANON SO FAR: ${show.canon_digest}`,
  ].join("\n\n");
}

export function keyframePrompt(show, shot) {
  const chars = shot.character_ids
    .map((id) => show.characters.find((c) => c.id === id).appearance.canonical_descriptor)
    .join(". ");
  const loc = show.locations.find((l) => l.id === shot.location_id).canonical_descriptor;
  return {
    prompt: `${show.style_guide.visual}. ${loc}. ${chars}. ${shot.framing}. ${shot.action}`,
    negative: show.style_guide.visual_negative,
  };
}

export function videoPrompt(show, shot) {
  return `${shot.action}. ${shot.framing}. Subtle natural motion, characters gesturing while speaking, sitcom coverage. ${show.style_guide.visual}`;
}
