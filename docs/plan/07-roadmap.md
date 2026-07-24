# 07 — Roadmap

Guiding rule: **prove the magic first**. The magic moment is "I approved a script and got back a watchable 60-second episode with my characters, their voices, my sets." Everything else (network, ads) is sequenced after that works repeatably.

## Phase 0 — Pipeline spike (2–3 weeks)

Goal: validate the generation stack end-to-end with **no product UI** — scripts + a hardcoded demo show bible.

- [ ] Hardcode one demo show (2 characters w/ sheets + ElevenLabs voices, 1 set, style guide).
- [ ] CLI pipeline: idea → Claude script (structured JSON) → shot list → keyframes → image-to-video clips → per-line TTS → lip sync → FFmpeg assembly with music bed → MP4.
- [ ] Produce 5+ test episodes; measure: cost/episode, wall-clock, retake-worthy shots %, character consistency.
- [ ] A/B the top 2 video providers and top 2 keyframe image models on the same shots (doc 05 candidates).
- **Exit criteria:** one 60s episode ≤ target cost (see doc 06), ≥80% of shots usable without retake, and we've *watched it and it's actually funny/watchable*. If consistency fails here, we iterate on character-sheet technique before building any product.

## Phase 1 — The Studio MVP (6–8 weeks)

Goal: a real user can do the full loop for their own show.

- [ ] Auth, accounts, Stripe subscription + credit ledger.
- [ ] Show CRUD + Show Bible builder (characters, sheets, voices via Voice Design, sets, style guide, sound kit) + Fast Start mode.
- [ ] Writers' room: season arc + episode pitches; script editor with notes/revisions; approval gate.
- [ ] Temporal episode workflow (doc 04) with live shot board, retakes, credit quotes/ceilings.
- [ ] Review player + MP4 export (watermarked on lower tiers).
- [ ] Provider gateway w/ primary+fallback per modality; generation/cost ledger; basic admin.
- **Exit criteria:** 10–20 design-partner Directors produce episodes without us touching anything; retake rate <25%; unit economics within doc 06 envelope.

## Phase 2 — The Network (4–6 weeks, overlaps late Phase 1)

- [ ] Channels, show pages, episode pages; publish flow with moderation gate (automated scans + human queue).
- [ ] Viewer accounts, subscriptions/follows, likes, comments (moderated), watch history.
- [ ] Feeds: subscriptions + curated discovery rows (no ML recsys yet).
- [ ] Mux playback + analytics (views, completion rate) surfaced to Directors.
- [ ] AI-content labeling + C2PA credentials on every published episode (doc 08).
- **Exit criteria:** episodes watchable publicly; ≥30% average completion on 60s eps among non-creator viewers.

## Phase 3 — Depth & scale (ongoing after launch)

- Longer episodes (3–5 min, act structure), multi-episode batch production ("produce the season").
- 9:16 shorts auto-cutdowns of episodes (distribution flywheel to TikTok/Reels/Shorts).
- Character marketplace (license community characters/voices between shows), show collaboration roles (co-directors).
- Third-party publish integrations (YouTube/TikTok APIs) with disclosure flags set automatically.
- Recommendation feed, notifications, mobile apps (Expo).
- Viewer-side monetization experiments: channel memberships, tipping.

## Phase 4 — Ad platform (only after Network has real watch time)

- Business Manager (orgs, roles, payment methods) → campaign/ad set/ad objects → pre-roll + feed placements → basic reporting → Director revenue share.
- Don't start until: consistent DAU watch time and content moderation is proven. (Data model hooks already reserved in doc 02.)

## Team & effort assumptions

Phases 0–2 are buildable by 1–2 strong full-stack engineers + heavy AI-assisted development, with design contracted. The pipeline (Phase 0/1) is the deep work; the Network is standard CRUD+video product.

## Key metrics per phase

| Phase | North star |
|---|---|
| 0 | Cost + consistency per episode |
| 1 | Episodes produced per Director per week; retake rate |
| 2 | Watch completion rate; subscriber conversion |
| 3 | Weekly watch minutes; creator retention |
| 4 | Ad fill rate; creator payout per 1k views |

## API keys needed from you (tomorrow)

Priority order for Phase 0:
1. **Anthropic** (script agents) — have already if building with Claude.
2. **fal.ai** (single account → Seedance/Kling/Veo candidates, Flux/Nano-Banana images, lip sync models) — fastest way to A/B everything in Phase 0.
3. **ElevenLabs** (Creator tier minimum for voice cloning + commercial license; API key).
4. Optional for A/B: **Google AI Studio / Vertex** (Veo + Imagen + Lyria direct), **OpenAI** (gpt-image fallback).
5. Later phases: Stripe, Mux, Cloudflare R2 — no rush.
