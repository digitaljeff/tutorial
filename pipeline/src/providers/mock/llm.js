// Mock Screenwriter: deterministic structured script so the pipeline runs
// end-to-end with zero API keys. Same output schema as the real provider.

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
