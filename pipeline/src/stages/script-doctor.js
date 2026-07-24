// Script Doctor (docs/plan/04 stage 1): automatic QA between the Screenwriter
// and production. Normalizes speaker ids, then enforces the two constraints
// LLMs most often violate: cast-only speakers and the runtime budget.

const CHARS_PER_SECOND = 14; // sitcom-pace speech, matches mock TTS timing

export function estimateRuntimeS(script) {
  const chars = script.scenes.flatMap((s) => s.lines).reduce((n, l) => n + l.text.length, 0);
  const beats = script.scenes.length * 2.5; // establishing beats + air
  return Math.round(chars / CHARS_PER_SECOND + beats);
}

// Accept ids, names, or case variants ("DANA" -> "dana"); fix in place.
export function normalizeScript(script, show) {
  const byKey = new Map();
  for (const c of show.characters) {
    byKey.set(c.id.toLowerCase(), c.id);
    byKey.set(c.name.toLowerCase(), c.id);
  }
  const locByKey = new Map();
  for (const l of show.locations) {
    locByKey.set(l.id.toLowerCase(), l.id);
    locByKey.set(l.name.toLowerCase(), l.id);
  }
  for (const scene of script.scenes) {
    scene.location_id = locByKey.get(String(scene.location_id).toLowerCase()) ?? scene.location_id;
    scene.character_ids = (scene.character_ids ?? []).map((id) => byKey.get(String(id).toLowerCase()) ?? id);
    for (const line of scene.lines) {
      line.character_id = byKey.get(String(line.character_id).toLowerCase()) ?? line.character_id;
    }
    // Ensure every speaker is listed as present in the scene.
    const speakers = new Set(scene.lines.map((l) => l.character_id));
    scene.character_ids = [...new Set([...scene.character_ids, ...speakers])];
  }
  return script;
}

export function validateScript(script, show, targetS) {
  const errors = [];
  const cast = new Set(show.characters.map((c) => c.id));
  const locs = new Set(show.locations.map((l) => l.id));

  const badSpeakers = new Set(
    script.scenes.flatMap((s) => s.lines.map((l) => l.character_id)).filter((id) => !cast.has(id))
  );
  if (badSpeakers.size)
    errors.push(
      `Unknown speakers: ${[...badSpeakers].join(", ")}. ONLY these character_id values exist: ${[...cast].join(", ")}. ` +
        `Off-screen characters may be referenced in action/dialogue but must never have lines.`
    );

  const badLocs = script.scenes.map((s) => s.location_id).filter((id) => !locs.has(id));
  if (badLocs.length)
    errors.push(`Unknown location_id: ${[...new Set(badLocs)].join(", ")}. Allowed: ${[...locs].join(", ")}.`);

  const est = estimateRuntimeS(script);
  if (est > targetS * 1.35)
    errors.push(
      `Too long: ~${est}s of material for a ${targetS}s episode. Cut to at most ` +
        `${Math.round(targetS * CHARS_PER_SECOND * 0.75)} total dialogue characters (~10-14 short lines). ` +
        `Keep the funniest beats; shorter lines are funnier.`
    );
  if (!script.scenes?.length) errors.push("Script has no scenes.");
  return { errors, estimated_runtime_s: est };
}
