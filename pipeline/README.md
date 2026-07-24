# Backlot Pipeline — Phase 0 spike

Episode idea → script → shot list → keyframes → clips → voiced dialogue → music → **assembled MP4**, per [docs/plan/04-generation-pipeline.md](../docs/plan/04-generation-pipeline.md).

Runs **with zero API keys**: every modality has a local mock (ffmpeg-generated placeholder keyframes, zoompan clips, character-pitched tone "voices", synth music). Drop real keys into `.env` and each modality flips to its real provider automatically — no code changes.

## Run it

```bash
cd pipeline
node src/cli.js doctor                 # check ffmpeg + which providers are live
node src/cli.js bible                  # build show bible: character sheets, voices, jingle
node src/cli.js produce                # produce an episode (auto-builds bible if missing)
node src/cli.js produce --idea "Mo accidentally becomes a local celebrity"
node src/cli.js retake --ep out/ep-XXXX --shot 3 --note "push in closer on Dana"
node src/cli.js review --ep out/ep-XXXX   # local review UI: player + shot board + retakes
node src/cli.js produce --mock         # force mocks even if keys are set
```

Every `produce` prints a **pre-flight cost quote** (the credit-metering mechanic
from docs/plan/06) before generation, and writes an `episode.json` manifest that
powers retakes and reassembly without regenerating anything else.

Requires Node ≥ 20 and ffmpeg on PATH. No npm install — zero dependencies.

Output lands in `out/ep-<timestamp>/`:

```
script.json      structured script (scenes → lines with delivery tags)
shotlist.json    shots with timings, framing, prompts
keyframes/       one start-frame per shot
clips/           one video clip per shot
audio/           per-line dialogue + music bed
work/            title/credit cards, concat list, captions.ass, stems
episode.mp4      the finished cut
```

## Enabling real providers (tomorrow)

```bash
cp .env.example .env   # then fill in:
```

| Key | Unlocks | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | Real Screenwriter (Claude) | structured-JSON script generation |
| `FAL_KEY` | Real keyframes (Seedream) + clips (Seedance image-to-video) | model ids configurable in `.env` for A/B runs |
| `ELEVENLABS_API_KEY` | Real character voices + music | voices need `voice_id` per character (Voice Design) — until then uses the default voice |

Modalities activate independently — e.g. set only `ANTHROPIC_API_KEY` to get real scripts with mock video (cheap way to test script quality).

## What's real already (kept for production)

- **Assembly**: hard-cut concat, dialogue at exact TTS offsets, sidechain music ducking, loudnorm master, ASS captions from script timings (no ASR), title/credit cards.
- **Audio-driven timing**: dialogue is generated first; clip durations derive from actual line durations.
- **Coverage grammar**: establishing shot + one speaking character per shot (better consistency + lip-sync, authentic sitcom cutting).
- **Context assembly**: character canonical descriptors + style guide templated into every prompt (docs/plan/03).

## What's built beyond generation

- **Bible stage** (`bible`): character turnaround sheets (3 views each), Voice Design minting (`voice_id` per character once ElevenLabs key lands), intro jingle — persisted to `out/bible/<show>/state.json`, generated once, reused every episode. Sheets are passed as reference images to real keyframe/clip generation.
- **Retakes** (`retake`): regenerate a single shot from the episode manifest, optionally steered by a director note (note is injected into the regeneration prompt and recorded in retake history). Only that shot's keyframe+clip re-generate; the episode reassembles in seconds.
- **Review UI** (`review`): local web page with the episode player, retake history, and a shot strip (keyframe, timing, dialogue, retake button + note field per shot). Prototype of the product review screen.
- **Cost quotes**: unit costs from docs/plan/05 produce a per-episode dollar quote pre-generation and scale straight into the credit system.

## Next (Phase 0 exit criteria — docs/plan/07)

- [ ] Real-key shakedown: run bible + produce against live APIs, fix adapter field names (fal model input shapes, Voice Design endpoints are best-effort until first run)
- [ ] Lip-sync pass wiring (Seedance 1.5 native vs Kling LipSync A/B)
- [ ] 5 test episodes; measure cost, wall-clock, retake-worthy shot %
