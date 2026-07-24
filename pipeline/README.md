# Backlot Pipeline — Phase 0 spike

Episode idea → script → shot list → keyframes → clips → voiced dialogue → music → **assembled MP4**, per [docs/plan/04-generation-pipeline.md](../docs/plan/04-generation-pipeline.md).

Runs **with zero API keys**: every modality has a local mock (ffmpeg-generated placeholder keyframes, zoompan clips, character-pitched tone "voices", synth music). Drop real keys into `.env` and each modality flips to its real provider automatically — no code changes.

## Run it

```bash
cd pipeline
node src/cli.js doctor                 # check ffmpeg + which providers are live
node src/cli.js produce                # produce an episode of the demo show
node src/cli.js produce --idea "Mo accidentally becomes a local celebrity"
node src/cli.js produce --mock         # force mocks even if keys are set
```

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

## Next (Phase 0 exit criteria — docs/plan/07)

- [ ] Character sheet generation step (Seedream sequential batch) + pass sheets as reference images to keyframes/clips
- [ ] ElevenLabs Voice Design step to mint `voice_id`s for Dana and Mo
- [ ] Lip-sync pass wiring (Seedance 1.5 native vs Kling LipSync A/B)
- [ ] 5 test episodes; measure cost, wall-clock, retake-worthy shot %
