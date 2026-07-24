# Backlot — AI Studio for Serialized Shows

**Working title:** Backlot *(the studio backlot is where a show's standing sets, props, and cast live between shoots — exactly what our per-show knowledge base is. Name is provisional and easy to change later.)*

## One-liner

Backlot is the easiest way to create, produce, and publish an AI-generated sitcom or serialized show. A user (the **Director**) builds a show bible once — characters, voices, sets, style, season arc — and AI agents turn episode ideas into finished, edited, publish-ready video episodes with zero manual production work.

## Why it's needed

Making even a 60-second AI show today means juggling 6+ tools: an LLM for scripts, an image model for character sheets, a video model (15s clip limits), a voice cloner, a music generator, and an editor to stitch it all together — while manually re-prompting character descriptions in every single generation to keep faces, voices, and sets consistent. Consistency is the #1 failure mode and the #1 time sink. Nobody has packaged the full **script → scenes → voiced, scored, edited episode** pipeline behind a persistent show bible.

## The three products inside Backlot

1. **The Studio (creation)** — per-show knowledge base ("Show Bible"), character/set/voice management, script generation, and an agent pipeline that produces finished episodes.
2. **The Network (distribution)** — channels, shows, episodes, subscribers, feeds. Viewers follow channels and watch episodes, YouTube-style. Export also supported (download / publish elsewhere).
3. **The Ad Platform (monetization, last)** — self-serve advertiser accounts and a business manager, Meta-Ads-style, running against Network inventory.

## Core loop

```
Create Show → Build Show Bible → Agent proposes season arc & episodes
      → Director picks/prompts an episode idea → Agent writes script
      → Director approves script → Agent pipeline generates all scenes
      → Auto-assembly (clips + dialogue + SFX + score + intro)
      → Director reviews cut → per-scene retakes if needed → Publish/Export
```

## Business model

- **Subscription** (SaaS tiers) grants access to the Studio + a monthly credit allowance.
- **Credits** meter actual generation cost (script, images, video seconds, voice, music). Every episode has a computed credit cost shown *before* generation starts.
- Later: Network ad revenue share; advertiser spend.

## Scope guardrails for v1

- Episodes start at **~60 seconds** (4–8 stitched clips) to validate the pipeline end-to-end, then scale up.
- One video "primary stack" + one fallback, not an open-ended model zoo.
- Publish = Backlot Network channel page + MP4 export. Third-party auto-publish (YouTube/TikTok APIs) comes later.
- Ad platform is explicitly **Phase 4+** — designed for in the data model, not built.

## Document map

| Doc | Contents |
|---|---|
| [01-product-spec.md](01-product-spec.md) | Personas, features, user flows, screens |
| [02-architecture.md](02-architecture.md) | System architecture, tech stack, services |
| [03-knowledge-base.md](03-knowledge-base.md) | Show Bible design, schemas, context assembly, GBrain findings |
| [04-generation-pipeline.md](04-generation-pipeline.md) | Agent roles and the script→video workflow |
| [05-model-stack.md](05-model-stack.md) | Research: video/image/voice/music model landscape + chosen stack |
| [06-economics.md](06-economics.md) | Unit costs per episode, credit system, subscription tiers |
| [07-roadmap.md](07-roadmap.md) | Phased build plan with milestones |
| [08-risks-and-legal.md](08-risks-and-legal.md) | IP, moderation, AI-disclosure, platform risks |
| [09-competitive-landscape.md](09-competitive-landscape.md) | Competitors, market proof, gaps we exploit, positioning |
