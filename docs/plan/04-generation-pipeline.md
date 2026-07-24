# 04 — Agent Pipeline: Episode Idea → Finished Episode

The pipeline is a durable Temporal workflow with two human gates (script approval, final review). Every step is idempotent, checkpointed, retried with fallbacks, and cost-logged. A 60-second episode is the v1 unit of work.

## Agent roster

| Agent | Role | Inputs (Context Pack projection) | Output |
|---|---|---|---|
| **Showrunner** | Season arcs, episode pitches that advance the arc | Full bible + canon digest + arc state | Season arc; episode pitch slate |
| **Screenwriter** | Writes/revises the script | Writing style, characters (personality+speech), assigned arc beat, canon digest, runtime budget | Structured script (JSON scenes/lines, not just text) |
| **Script Doctor** | Automatic QA pass before the Director sees it | Script + bible | Continuity flags, runtime estimate, joke-density check, rating check |
| **Line Producer** | Script → shot list + cost quote | Approved script + provider constraints (clip caps, resolutions) | Shot list with per-shot spec + credit estimate |
| **Cinematographer** | Per-shot keyframes | Shot spec + character sheets + set refs + visual style | 1 keyframe image per shot (start frame) |
| **Director of Photography (video)** | Keyframe → clip | Keyframe + motion/action prompt + duration | Video clip per shot |
| **Voice Director** | Dialogue audio | Lines + character voice_id + delivery tags + emotional context | Per-line audio files |
| **Sound Designer** | SFX + ambience | Shot specs + sound kit | SFX cues with timeline placement |
| **Composer** | Score + stingers (intro/jingle generated once per show, reused) | Sound kit mood palette + episode emotional beats | Score bed(s) |
| **Editor** | Assembly | All assets + shot list timings | Timeline JSON → rendered cut |
| **Continuity Clerk** | Post-approval canon update | Final script + cut | canon_facts proposals, episode summary, embeddings |

"Agents" here are pipeline steps with dedicated prompts/tools — not free-roaming chat agents. Claude (Sonnet/Fable tier for writing, Haiku tier for mechanical passes) powers the LLM steps; media steps call the provider gateway.

## Stage 0 — Writers' room (interactive, cheap)

1. Showrunner maintains the season arc; proposes next-episode pitches (each tagged with the arc beat it advances).
2. Director picks a pitch **or types their own idea**; either path produces an `EpisodeBrief` (premise, arc beat, characters, sets, tone).

## Stage 1 — Script (human gate #1)

1. Screenwriter emits a **structured script**: `scenes[] → { slugline, location_id, character_ids, action_beats[], lines[] {character_id, text, delivery_tags, est_seconds} }`. Structure-first means downstream stages never parse screenplay prose.
2. Runtime budgeting: 60s target ≈ cold open (8s) + 2–3 scenes (40s) + button (7s) + title/credit bumpers (5s). ~10–14 dialogue lines total. The Script Doctor rejects overruns before the Director ever sees them.
3. Director reviews formatted screenplay view; inline edits or notes → Screenwriter revises (diff view). **Approval locks the script** and snapshots the bible version used.

## Stage 2 — Pre-production (automatic, seconds)

Line Producer converts script → **shot list**. For each shot:

```jsonc
{
  "idx": 3, "scene": 2, "duration_s": 8,          // ≤ video model clip cap
  "location_id": "set_cafe", "character_ids": ["dana","mo"],
  "framing": "two-shot, eye level, sitcom coverage",
  "action": "Dana slams the espresso machine; Mo flinches",
  "dialogue_line_ids": ["L7","L8"],               // lines spoken IN this shot
  "continuity": "Dana holds red mug from shot 2",
  "keyframe_prompt": "<assembled: style + character descriptors + set + framing>",
  "video_prompt": "<assembled: motion/action + dialogue timing>"
}
```

Shot grammar for sitcoms (cheap consistency win): **coverage patterns** — establish wide → alternating singles/two-shots for dialogue → reaction cutaways. Alternating singles means fewer characters per generated clip → far better face consistency and lip-sync, and it's authentic sitcom language.

Output: shot list + **credit quote**. Director confirms spend (soft gate; auto-confirm under a user-set threshold).

## Stage 3 — Production (automatic, parallel fan-out)

Per shot, a child workflow runs this DAG (all shots in parallel, provider-rate-limit-bounded):

```
        ┌─ 3a. Keyframe image (character sheets + set refs as reference images)
        │        └─ auto-QC: face match vs sheet, character count, style score
        │            └─ fail → regenerate (≤2 retries) → else flag for review
        ├─ 3b. Dialogue audio per line (ElevenLabs: voice_id + delivery tags)
        │        └─ auto-QC: duration vs budget, transcription match (STT round-trip)
        └─ 3c. Video clip: image-to-video from keyframe, duration = shot spec
                 └─ if dialogue shot → lip-sync pass (clip + line audio)
                 └─ auto-QC: duration, corruption, face drift sampling
```

- **3a before 3c always** (image-to-video, never raw text-to-video) — the keyframe is where consistency is enforced and it's ~100× cheaper to retry an image than a clip.
- Dialogue timing: audio is generated **first**, its actual duration sets the clip duration (audio-driven timing), avoiding chipmunk cuts.
- Multi-line shots: lip-sync tools handle one speaker best → shot grammar prefers one speaking character per shot; reactions are silent clips.
- Every asset stored with `generation` record (prompt, model, cost) → single-shot **retakes** are trivial.
- Fallback ladder per modality (doc 05): e.g. video primary fails/filtered → fallback provider with translated prompt; 2 provider failures → shot flagged "needs director" without blocking siblings.

## Stage 4 — Post-production (automatic)

1. **Sound Designer** places SFX cues (ElevenLabs SFX / library) + set ambience + optional laugh track (timed after button lines — script structure marks jokes, so placement is data-driven, not guessed).
2. **Composer** provides score bed for the episode's emotional curve; show intro/outro jingles come from the sound kit (generated once, reused every episode = sonic brand + zero marginal cost).
3. **Editor** builds an **Episode JSON** timeline (our own DSL: scenes → shots → dialogue timing → music/SFX cues → caption style), compiled to an FFmpeg filtergraph (and to OpenTimelineIO only as a later export adapter for humans who want to touch up in Resolve/Premiere):
   - hard cuts on dialogue beats (sitcom grammar), **J/L-cuts** (audio leads/lags video 200–500ms) computed from known TTS line timings — this alone makes AI episodes feel edited
   - scene transitions via xfade presets or pre-rendered motion-blur "bridge" clips (which also hide lighting/character drift between AI clips)
   - audio mix: dialogue stem normalized ~−16 LUFS, music bed ducked via sidechain compression or deterministic volume automation from known dialogue timings, SFX layer, two-pass loudnorm master to −14 LUFS
   - captions: **no ASR needed** — TTS returns word timestamps, so perfectly-timed ASS/VTT captions come free from the script; burn-in optional, sidecar always
   - title card + credits from show metadata (Remotion templates)
4. FFmpeg render (clips normalized to uniform codec/fps/pix_fmt on ingest so stitching is cheap) → 1080p master + renditions → R2 → Mux/CDN.

## Stage 5 — Review (human gate #2) & publish

- Director sees the cut on a shot-strip timeline: play, per-shot **Retake** (with note → re-runs just that shot's sub-DAG), swap line reads, nudge music.
- Publish → moderation scan → Network page + optional MP4 export. Continuity Clerk updates canon (Director approves fact diffs).

## Failure & cost containment

- Per-episode hard credit ceiling; workflow pauses (resumable) at 125% of quote.
- Idempotency keys on every provider call (no double-billing on retries).
- Content-filter failures get one automatic "sanitize prompt" rewrite pass before flagging.
- All partial work survives: an episode is never regenerated wholesale.

## v1 pipeline targets

- 60s episode ≈ 8–10 shots, ~12 dialogue lines: **p50 < 30 min wall clock** (dominated by video-clip queue times), all fan-out parallel.
- Retake rate is the north-star quality metric; target < 20% of shots after month 1 tuning.
