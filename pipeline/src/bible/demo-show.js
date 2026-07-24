// Hardcoded demo Show Bible for the Phase 0 spike.
// In the product this lives in Postgres (see docs/plan/03-knowledge-base.md);
// the shape here mirrors that schema so the context assembler carries over.

export const demoShow = {
  id: "steamed",
  title: "Steamed",
  logline:
    "A wound-tight owner and her cosmically relaxed barista keep a failing coffee shop alive out of pure spite.",
  format: {
    preset: "multi-cam-sitcom",
    target_runtime_s: 60,
    aspect: "16:9",
    rating: "PG",
    laugh_track: false,
  },
  style_guide: {
    visual:
      "3D animated sitcom, warm Pixar-adjacent look, soft key lighting, shallow depth of field, muted teal and amber palette, clean rounded character design",
    visual_negative: "photorealistic, live action, horror, gritty, text overlays, watermark",
    writing:
      "Fast two-hander banter. Setup/punchline rhythm, rule-of-three escalations, no meanness without warmth underneath. PG. Every scene ends on a button.",
  },
  sound_kit: {
    score_mood: "light jazzy sitcom underscore, brushed drums, upright bass, playful",
    intro_jingle: "8 second bright jazzy sting with a kettle whistle flourish",
  },
  characters: [
    {
      id: "dana",
      name: "DANA",
      role: "protagonist",
      appearance: {
        canonical_descriptor:
          "DANA, late 30s woman, wiry and precise, copper curly hair in a messy bun, round gold glasses, olive utility jacket over a mustard tee, jeans, red canvas sneakers",
      },
      personality: {
        traits: ["controlling", "caffeinated", "secretly sentimental"],
        wants: "to prove the shop can beat the chain across the street",
        comedic_function: "escalator — turns molehills into five-alarm emergencies",
      },
      speech: {
        voice_provider: "elevenlabs",
        voice_id: null, // set after Voice Design tomorrow
        mock_pitch_hz: 300,
        verbal_tics: ["talks in numbered lists when stressed"],
        delivery_tags_default: "[tense]",
      },
    },
    {
      id: "mo",
      name: "MO",
      role: "foil",
      appearance: {
        canonical_descriptor:
          "MO, mid 20s man, tall and unhurried, short locs, calm heavy-lidded eyes, faded lavender hoodie under a denim apron, silver ring on thumb",
      },
      personality: {
        traits: ["unbothered", "wise in useless ways", "loyal"],
        wants: "a quiet shift and the perfect pour",
        comedic_function: "deadpan foil — one flat line deflates Dana's spiral",
      },
      speech: {
        voice_provider: "elevenlabs",
        voice_id: null,
        mock_pitch_hz: 170,
        verbal_tics: ["never uses more words than necessary"],
        delivery_tags_default: "[calm]",
      },
    },
  ],
  locations: [
    {
      id: "shop_counter",
      name: "Coffee shop counter",
      canonical_descriptor:
        "Interior of a small independent coffee shop, worn wooden counter, brass espresso machine with a hand-taped 'DO NOT TOUCH' note, chalkboard menu with prices crossed out and rewritten, morning light through a fogged front window",
      mock_color: "0x8a5a2b",
    },
    {
      id: "shop_backroom",
      name: "Back room",
      canonical_descriptor:
        "Cramped coffee shop back room, metal shelving stacked with mismatched cup sleeves, a flickering fluorescent tube, one sad motivational poster of a cat",
      mock_color: "0x4a5568",
    },
  ],
  season_arc: {
    destination: "The chain across the street closes — because Dana and Mo accidentally out-community it.",
    current_beat: "Episode 1: establish the rivalry and the team's dynamic.",
  },
  canon_digest: "Pilot. Nothing established yet beyond the bible.",
};
