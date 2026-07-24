# 01 — Product Spec

## Personas

| Persona | Who | What they need |
|---|---|---|
| **Director** (primary) | Creator building one or more shows | Show bible tools, script control, one-click episode production, cost predictability, a channel to publish to |
| **Viewer** | Consumer of the Network | Feed, channel pages, subscriptions, watch history, likes/comments |
| **Advertiser** (Phase 4+) | Business buying ads | Business manager, campaign builder, targeting, reporting, billing |
| **Admin/Trust & Safety** (internal) | Backlot staff | Moderation queues, takedowns, credit/refund tools, abuse detection |

## Object model (top level)

```
Account (user)
└── Channel (public identity; 1 per account in v1, like a YouTube channel)
    └── Show (many per channel)
        ├── Show Bible (knowledge base — see doc 03)
        │   ├── Characters (profile, sheet images, personality, voice)
        │   ├── Locations / Sets (reference images, descriptions)
        │   ├── Style Guide (visual style, writing style, tone, rating)
        │   ├── Sound Kit (SFX palette, score style, intro/jingle, laugh track y/n)
        │   └── Canon (season arcs, episode summaries, continuity facts)
        ├── Seasons → Episodes
        │   └── Episode: Idea → Script → Storyboard → Scenes/Shots → Cut → Published video
        └── Assets (every generated image/audio/video, versioned, reusable)
```

Key rule: **a Director manages multiple shows simultaneously**, and every show is fully isolated — its own bible, cast, assets, and canon. Nothing leaks between shows unless the Director explicitly copies (e.g., re-use a voice).

## Feature areas

### A. Show management
- Create show: title, logline, genre/format preset (sitcom, drama, sketch, mockumentary…), target episode length, rating (G/PG/PG-13), aspect ratio (16:9 / 9:16 for shorts).
- Format presets pre-fill the style guide (e.g., "Multi-cam sitcom" → laugh track on, 3 standing sets, A/B plot structure, 2–4 jokes/page).
- Dashboard per show: bible completeness meter, season progress, credit spend, episode statuses.

### B. Show Bible (the differentiator — full spec in doc 03)
- **Characters:** guided builder (identity → appearance → personality/traits/quirks → speech style → relationships → arc). Generates a *character sheet*: turnaround images (front/side/back, expressions) + canonical appearance descriptor used verbatim in every downstream prompt. Voice: pick from library, design from description, or clone (with consent flow) via ElevenLabs; store `voice_id` + delivery settings per character.
- **Locations/Sets:** name, description, reference images (generated or uploaded), lighting/time-of-day variants. Standing sets get locked reference images for consistency.
- **Style guide:** visual style (e.g., "3D animated, Pixar-adjacent, warm palette"), negative styles, writing voice, humor style, pacing rules, censor rules.
- **Sound kit:** intro jingle + title card, outro, score mood palette, laugh track toggle, per-show SFX library.
- **Canon:** season story arc (beginning → end destination), episode-by-episode arc beats, continuity ledger (facts established in aired episodes — auto-extracted from approved scripts, Director-editable).

### C. Episode creation
- **Writers' room:** agent proposes a season arc, then a slate of episode pitches that each advance the arc. Director can accept, edit, reorder, or type their own idea ("bottle episode where the power goes out").
- **Script:** agent writes a properly formatted script (scene headings, action lines, dialogue, parentheticals) sized to target runtime (~a strict beat budget for 60s: cold open beat, 2–3 scene beats, button/tag). Director edits inline or gives notes ("make Dana meaner"); agent revises. **Script approval is a hard gate** — nothing generates until the Director approves, because everything downstream costs credits.
- **Pre-production (automatic):** script → shot list. Each shot gets: location ref, characters present, framing, action, dialogue lines, duration (≤ the video model's clip cap), continuity notes. Cost estimate shown; Director confirms spend.
- **Production (automatic):** the pipeline of doc 04 — keyframes → video clips → dialogue audio → lip sync → SFX → score → assembly.
- **Review:** Director watches the cut with a per-shot timeline; can **retake** any single shot (with a note) without regenerating the episode; can swap line reads; then Publish.

### D. Network (viewer side)
- Channel page: banner, shows, episodes, subscriber count.
- Show page: poster, trailer, seasons/episodes list, "play from S1E1".
- Feed: subscriptions feed + discovery (editorial at first, algorithmic later).
- Viewer actions: subscribe, like, comment (moderated), share, watch history, continue-watching.
- Publishing: publish to channel (public/unlisted), or export MP4 (with/without Backlot end-card depending on tier).
- All published content carries **AI-generated labels** and C2PA content credentials (see doc 08).

### E. Monetization (see doc 06)
- Tiers: Free (watch + tiny trial credits), Creator, Studio, Network (details in doc 06).
- Credit meter with pre-generation estimates and per-episode receipts.

### F. Ad platform (Phase 4+ — design-only for now)
- Business Manager: org accounts, members/roles, payment methods.
- Campaign → Ad set (targeting: genre, show, audience geo/age) → Ad (video ≤30s, must pass moderation).
- Placements: pre-roll, mid-roll (only on 3min+ episodes), feed cards.
- Reporting: impressions, views, CTR. Revenue share to Directors.
- Data-model hooks reserved now: `impressions` events table, channel `monetization_status`.

## Primary user flow (first show, first episode)

1. Sign up → create channel → "Create your first show" wizard (format preset, logline, tone quiz).
2. Bible builder with progress meter. Minimum to unlock production: 2+ characters with sheets + voices, 1+ set, style guide, intro jingle (agent can generate all of these from the logline in "Fast Start" mode — Director just approves/edits).
3. Writers' room proposes a 6-episode season arc → Director tweaks → approves.
4. Pick episode 1 pitch → script drafted → Director notes → approve.
5. Cost estimate ("This episode: ~1,240 credits ≈ $9.10") → confirm.
6. Watch pipeline progress live (per-shot status board). Typical 60s episode target: **< 30 min wall clock**.
7. Review cut → 1–2 retakes → publish to channel + download MP4.

## Non-functional requirements

- **Consistency:** same character face/outfit/voice across shots and episodes (measured: face-similarity + Director retake-rate).
- **Reliability:** every pipeline step idempotent + resumable; a failed shot never kills an episode; automatic fallback provider per modality.
- **Cost safety:** hard per-episode credit ceiling; generation halts (resumable) if a step overruns estimate by >25%.
- **Latency targets:** script < 60s; full 60s episode < 30 min p50.
- **Rights:** Director owns their episodes (subject to model-provider licenses); voice cloning requires recorded consent attestation; uploads scanned for known-IP/celebrity likeness.
