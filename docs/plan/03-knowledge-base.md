# 03 — The Show Bible (per-show knowledge base)

The bible is the moat. It's what lets an agent produce episode 7 with the same faces, voices, sets, jokes-per-minute, and continuity as episode 1 — with no manual input.

## GBrain findings (as requested)

**What it is:** [`garrytan/gbrain`](https://github.com/garrytan/gbrain) — Garry Tan's open-source (MIT, TypeScript) "agent brain," ~27k stars, very active in 2026. Knowledge lives as **markdown files in a git repo synced into Postgres + pgvector**, one file per entity, in MECE directories (`people/`, `companies/`, `projects/`…). Every write auto-extracts typed relationship edges with zero LLM calls. Pages have a compiled "current truth" section above the line and an append-only dated timeline below it. Agents query it through 30+ MCP tools with hybrid search (vector + BM25 + reciprocal-rank fusion) and a `think` mode that returns cited synthesis.

**What "resolvers" are:** not GraphQL — they're **markdown decision-tree routing files**. A master `RESOLVER.md` the agent walks before filing or fetching anything ("is this a Person or a Company? new fact or update?"), plus a resolver README in every directory defining *what belongs here and what doesn't*, with concrete disambiguation tests. That's the mechanism that keeps an agent-maintained KB clean without a human librarian. Docs: [recommended schema](https://github.com/garrytan/gbrain/blob/master/docs/GBRAIN_RECOMMENDED_SCHEMA.md), [personal-brain tutorial](https://github.com/garrytan/gbrain/blob/master/docs/tutorials/personal-brain.md).

**Verdict for Backlot:** don't adopt GBrain wholesale — it's built for *agents extracting knowledge from unstructured life/work streams*, whereas our Directors **explicitly author** structured entities in a UI, and multi-tenant SaaS can't be one-git-repo-per-user at our scale. But we steal three of its ideas:

1. **Resolvers** → each show gets a generated `RESOLVER` spec that tells our agents which store answers which question ("character's voice? → `characters.voice_id`. What happened in ep 3? → episode summary, then transcript search."). Agents never guess where truth lives.
2. **Entity pages with two layers** → every character/location keeps a compiled *current-state* block (what goes into prompts) plus an append-only *timeline* of changes and episode appearances (continuity audit).
3. **Hybrid search only for unbounded text** — exactly their Postgres + pgvector + BM25 + RRF stack, which we already have for free in our own Postgres.

## How the industry does it (research summary)

Every shipping AI-storytelling product converged on **structured entities + deterministic prompt assembly — not vector RAG as the backbone**:

- **Sudowrite Story Bible:** cascade of structured cards (synopsis → characters → worldbuilding → outline → scenes); generation deterministically injects style + active characters + recent prose.
- **NovelAI Lorebooks:** keyword-triggered context entries (activation keys, always-on flags, insertion priority) — deterministic "RAG" with zero embeddings. Great for long-tail props/minor characters.
- **Fable's Showrunner (SHOW-1):** structured simulation state (character history, goals, location, time) fed through a prompt chain; voices cloned per character in advance; clips generated per dialogue line.
- **LTX Studio "Elements":** per-project registry of Characters/Objects/Locations, **@-taggable in any shot**, appearance defined once and enforced everywhere. Strongest UX pattern — we copy it.
- **Hedra "Elements":** same registry idea + 30-second voice cloning per character.

2026 consensus ("context engineering"): **if data is bounded, owned, and keyed by IDs the app already holds, template it into the prompt; use retrieval only for unbounded prose** (transcripts, long lore). Vector similarity ≠ task relevance; embedding a 40-row character table to fuzzily re-find it is strictly worse than injecting it exactly.

## Backlot's design: schema-first hybrid

### 1. Postgres is the source of truth (typed entities)

**Character** (the most important object in the product):

```jsonc
{
  "identity":   { "name", "age", "role": "protagonist|foil|recurring|extra", "occupation" },
  "appearance": {
    "canonical_descriptor": "EXACT reusable text block, e.g. 'DANA, late 30s, wiry,\n    copper curly hair in a messy bun, round gold glasses, olive utility jacket\n    over a mustard tee, jeans, red canvas sneakers'",
    "sheet_assets": ["turnaround_front","turnaround_side","turnaround_back",
                      "expressions_grid","full_body","bust"],  // generated once, locked
    "outfits": [{ "name": "default", "descriptor", "assets" }]
  },
  "personality": { "traits": [], "wants": "", "fears": "", "quirks": [],
                   "comedic_function": "e.g. deadpan foil; rule-of-three escalator" },
  "speech":     { "voice_provider": "elevenlabs", "voice_id": "…",
                  "voice_settings": { "stability", "similarity", "style" },
                  "verbal_tics": [], "vocabulary": "", "catchphrases": [],
                  "delivery_tags_default": "[dry]" },
  "relationships": [{ "character_id", "type": "sister|rival|boss", "dynamic": "…" }],
  "arc":         { "season_goal", "secret", "growth_direction" }
}
```

- The **canonical_descriptor** + **sheet assets** are injected verbatim into every image/video prompt featuring the character. This is the consistency mechanism (validated by the user's Seedance + character-sheet experience).
- The **speech block** drives ElevenLabs per line; the **personality block** drives the script agent.
- Two-layer page (GBrain pattern): the JSON above is the compiled current state; a separate append-only `character_events` timeline logs edits + episode appearances.

**Location/Set:** name, canonical descriptor, locked reference images (wide/detail, day/night variants), ambience SFX preset, standing-set flag.

**Style guide:** visual style block (verbatim prompt suffix + negative prompt), writing style (tone, humor style, pacing, rating rules), format rules (cold open? laugh track? act structure?).

**Sound kit:** intro jingle asset, outro, score mood palette, laugh-track style, SFX palette.

**Season arc:** destination ("where the season ends"), acts/beats, per-episode arc assignments — this is what makes "every episode leads the viewer toward the end of the story" enforceable: the episode agent receives *this episode's assigned beat* plus *previous episode summaries*.

### 2. Deterministic context assembly (the "Context Pack")

For any generation step, the assembler builds an exact pack from IDs it already knows:

```
ContextPack(scene) =
  style_guide.writing (script steps) or style_guide.visual (image/video steps)
+ characters[in scene].{canonical_descriptor | personality | speech} (fields per step type)
+ location.canonical_descriptor + refs
+ season_arc.beat[this_episode] + continuity digest
+ last-N scene summaries (this episode)
+ lorebook triggers (see below)
```

- The assembler is **versioned**, and every generation logs the exact assembled context → reproducible debugging and retakes.
- Different steps get different projections (the video prompt never needs the character's fears; the script agent never needs the negative image prompt).

### 3. Lorebook triggers (NovelAI pattern)

Minor entities (props, gags, one-off locations, running jokes) get keyword activation rules — if the scene brief mentions "the broken espresso machine," its card is injected. Keeps prompts lean without losing the long tail.

### 4. RAG only for the unbounded layer

- **pgvector in the same Postgres** (HNSW; hybrid with BM25 + RRF), chunked by **scene**, metadata-filtered by `show_id`/`episode`/`character_ids`. No extra vector vendor — per-show corpora will never hit the scale where Pinecone matters.
- Used for: "what happened between X and Y in season 1," callback-joke mining, fan-service continuity.

### 5. Continuity as data (canon ledger)

- After each episode is approved, an agent extracts `canon_facts` (fact, source episode, `valid_from`/`valid_until`, confidence) — Director can edit/veto. Temporal validity borrowed from Zep/Graphiti's model *without* adopting their infra (Zep is cloud-only now; if we ever want heavier automated extraction, **cognee** — Apache 2.0, self-hostable — is the fallback framework).
- A rolling **"canon so far" digest** (~1–2k tokens) is maintained per show; for continuity, the digest usually beats retrieval.

### 6. Fast Start mode

From just a logline + format preset, agents draft the entire bible (cast of 3–5 with sheets, 2–3 sets, style guide, jingle, season arc) as *proposals* the Director approves/edits card by card. Removes the blank-page problem; keeps the Director in control.

### Bible completeness gate

Production unlocks when: ≥2 characters with locked sheets + voices, ≥1 set, style guide complete, sound kit has an intro. The UI shows a completeness meter with one-click "generate this for me" on every missing card.
