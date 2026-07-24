// Mock Screenwriter: deterministic structured script so the pipeline runs
// end-to-end with zero API keys. Same output schema as the real provider.

export async function generateBible({ logline, title, id }) {
  const slug = id ?? (title ?? logline).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24);
  return {
    id: slug,
    title: title ?? `Mock: ${logline.slice(0, 30)}`,
    logline,
    format: { preset: "multi-cam-sitcom", target_runtime_s: 60, aspect: "16:9", rating: "PG", laugh_track: false },
    style_guide: {
      visual: "3D animated sitcom, warm palette",
      visual_negative: "photorealistic, text overlays, extra people",
      writing: "Two-hander banter, setup/punchline, PG.",
    },
    sound_kit: { score_mood: "light playful underscore", intro_jingle: "8 second bright sting" },
    characters: [
      {
        id: "alex", name: "ALEX", role: "protagonist",
        appearance: { canonical_descriptor: "ALEX, 30s, short black hair, blue jacket, white tee" },
        personality: { traits: ["earnest", "anxious", "kind"], wants: "to keep it together", comedic_function: "escalator" },
        speech: { voice_hint: "Female voice, 30s, bright mezzo, quick.", verbal_tics: ["nervous laugh"], delivery_tags_default: "[tense]" },
      },
      {
        id: "sam", name: "SAM", role: "foil",
        appearance: { canonical_descriptor: "SAM, 40s, shaved head, grey hoodie, calm eyes" },
        personality: { traits: ["dry", "unbothered", "loyal"], wants: "a quiet day", comedic_function: "deadpan foil" },
        speech: { voice_hint: "Male voice, 40s, low baritone, slow.", verbal_tics: ["one-word answers"], delivery_tags_default: "[dry]" },
      },
    ],
    locations: [
      { id: "main_set", name: "Main set", canonical_descriptor: "The main interior set of the show", mock_color: "0x33556b" },
      { id: "back_room", name: "Back room", canonical_descriptor: "A cramped back room", mock_color: "0x4a5568" },
    ],
    season_arc: { destination: "They pull it off, together.", current_beat: "Episode 1: establish the world." },
  };
}

export async function generateSeason({ show, episodeCount = 6 }) {
  return {
    arc: {
      destination: show.season_arc.destination,
      acts: ["Establish the rivalry", "Escalating schemes backfire", "Accidental victory"],
    },
    episodes: Array.from({ length: episodeCount }, (_, i) => ({
      number: i + 1,
      title: `Mock Episode ${i + 1}`,
      premise: `A ${show.title} situation escalates at the ${show.locations[0].name}.`,
      arc_beat: "Advances the season arc (mock).",
    })),
  };
}

export async function generateScript({ show, idea }) {
  const [a, b] = show.characters; // two-hander
  const loc = show.locations[0].id;
  const loc2 = (show.locations[1] ?? show.locations[0]).id;
  const topic = idea?.trim() || "the espresso machine breaks on rent day";

  return {
    title: `Pilot: ${topic.slice(0, 40)}`,
    scenes: [
      {
        slugline: `INT. ${show.locations[0].name.toUpperCase()} - MORNING (COLD OPEN)`,
        location_id: loc,
        character_ids: [a.id, b.id],
        action: `${a.name} stares at the disaster of the day: ${topic}. ${b.name} sips coffee, unmoved.`,
        lines: [
          { character_id: a.id, text: `Okay. Okay okay okay. This is fine. This is a list problem. One: nobody panics.`, delivery_tags: "[tense]" },
          { character_id: b.id, text: `You're the only one here.`, delivery_tags: "[calm]" },
          { character_id: a.id, text: `Two: nobody tells the customers.`, delivery_tags: "[whisper]" },
          { character_id: b.id, text: `Still just you.`, delivery_tags: "[dry]" },
        ],
      },
      {
        slugline: `INT. ${show.locations[0].name.toUpperCase()} - CONTINUOUS`,
        location_id: loc,
        character_ids: [a.id, b.id],
        action: `${a.name} paces behind the counter improvising increasingly bad solutions while ${b.name} calmly does the one thing that will actually work.`,
        lines: [
          { character_id: a.id, text: `We pivot. Cold brew only. We rebrand: 'Steamed... but, like, emotionally.'`, delivery_tags: "[manic]" },
          { character_id: b.id, text: `I texted the repair guy.`, delivery_tags: "[calm]" },
          { character_id: a.id, text: `Three: we fire the repair guy for knowing our weakness.`, delivery_tags: "[tense]" },
          { character_id: b.id, text: `He's my cousin. He's coming for free.`, delivery_tags: "[dry]" },
          { character_id: a.id, text: `...Four: we love the repair guy.`, delivery_tags: "[deflated]" },
        ],
      },
      {
        slugline: `INT. ${show.locations[1]?.name.toUpperCase() ?? show.locations[0].name.toUpperCase()} - LATER (BUTTON)`,
        location_id: loc2,
        character_ids: [a.id, b.id],
        action: `Crisis over. ${a.name} exhales for the first time all day. ${b.name} hands her a perfect cup.`,
        lines: [
          { character_id: b.id, text: `Machine's fixed. You can stop making lists.`, delivery_tags: "[warm]" },
          { character_id: a.id, text: `One: thank you. Two: we never speak of this.`, delivery_tags: "[soft]" },
          { character_id: b.id, text: `Already forgot it.`, delivery_tags: "[dry]" },
        ],
      },
    ],
  };
}
