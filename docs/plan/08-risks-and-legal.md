# 08 — Risks, Legal, Trust & Safety

## Legal / rights

| Risk | Detail | Mitigation |
|---|---|---|
| **Music licensing** | AI music is the most litigated modality (RIAA v. Suno/Udio; UMG/Sony suits still active mid-2026). Udio is a walled garden (no export); Suno has no official API. ElevenLabs Music is label-licensed (Merlin, Kobalt) but **film/TV use may require Enterprise terms** — this directly touches our use case. | Use only licensed/indemnified music APIs (ElevenLabs Music — confirm episode use with their sales; Google Lyria on Vertex has IP indemnification; Stable Audio trained on licensed data). Never integrate unofficial Suno/Udio wrappers. |
| **Voice cloning consent** | Cloning a real person's voice without consent = right-of-publicity + ELVIS-Act-style state laws; ElevenLabs requires verified consent for cloning. | Default path is **Voice Design** (synthetic voices from text descriptions — no real person). Cloning requires recorded consent attestation stored immutably; block celebrity-soundalike prompts. |
| **Character likeness / IP** | Users will try "make a show starring Homer Simpson / Tom Cruise." | Prompt+image screening for known characters/celebrities (moderation classifiers + blocklists); ToS ban; DMCA agent registered; repeat-infringer policy (DMCA §512 safe harbor requires it). |
| **Output ownership** | Directors expect to own episodes. Ownership flows from provider terms (most grant output rights on paid tiers) + our ToS assigning our contribution. Pure AI output has thin copyright (US Copyright Office guidance) — Director's creative control (scripts, bible, editing choices) strengthens their claim. | ToS: Director owns episodes; we get a license to host/stream/promote. Document human creative contribution per episode (we have it — notes, edits, retakes). |
| **Provider volatility** | Sora API killed with 6 months notice; PlayHT acquired and shut down within 6 months; Groq deprecated hosted voices. This WILL happen to something in our stack. | Provider gateway abstraction (doc 02), fallbacks per modality, asset re-generation capability from stored prompts, no provider-proprietary data formats. |

## Platform / content safety

- **Moderation pipeline (required before Network is public):** script text scan at approval; keyframe scan before video spend (cheap early gate); final video frame-sampling + audio transcript scan before publish; human review queue for flags; user reporting on all public content.
- **Ratings:** shows declare a rating; generation enforces it (script agent rules + output scan). No sexual content involving minors-appearing characters — hard blocks, zero tolerance, NCMEC reporting where legally required.
- **AI disclosure:** every published episode labeled "AI-generated"; embed **C2PA Content Credentials** in exports; when third-party publishing arrives, auto-set YouTube's "altered/synthetic content" disclosure and equivalents (TikTok auto-labels C2PA media). This is both compliance (EU AI Act transparency obligations are in force for synthetic media) and brand positioning — we're proudly an AI studio, not a deepfake mill.
- **COPPA:** Network is 13+ at launch (no child accounts); if content is "directed to children," ad targeting restrictions apply later — Phase 4 concern, flag in ad policy design.
- **Election/impersonation abuse:** block political-figure likenesses and news-format shows impersonating real outlets.

## Financial risks

- **Negative-margin generation:** a bug or abuse loop calling video APIs is real money. Mitigations: credit pre-authorization before every pipeline run, per-user and global spend circuit breakers, idempotency keys, anomaly alerts.
- **Credit arbitrage/fraud:** stolen cards buying credits → chargebacks after GPU spend. Stripe Radar, delayed high-volume unlocks, export watermarks on new accounts.
- **Model price swings:** costs in doc 06 assume mid-2026 prices; repricing happens quarterly. Credit system decouples our retail price from provider cost; re-quote credits per episode dynamically.

## Product risks

1. **Consistency not good enough → uncanny/off-model episodes.** This is the existential product risk. Phase 0 exists to prove it before any product build. Seedance 2.0's omni-reference (9 images) is the current best answer; keyframe-first pipeline resets drift every shot.
2. **"Slop" perception.** AI shows are widely mocked when generic. Counter: the bible forces specificity (comedic function per character, style rules); quality bar gates (auto-QC + director approval); curation on the Network homepage.
3. **Episodes aren't funny.** LLM humor is hit-or-miss. Counter: joke-structure-aware script prompts (setup/punchline beats as structured data), Script Doctor pass, and the Director's notes loop. Comedy taste is the Director's job; we make iteration cheap.
4. **Churn after novelty.** Season-arc mechanics + audience feedback loops (viewers subscribe → Director motivated) are the retention design; watch metrics per episode close the loop.

## Compliance checklist (pre-Network launch)

- [ ] ToS + content policy + DMCA agent registration
- [ ] Privacy policy (GDPR/CCPA), data deletion flows
- [ ] Voice consent capture flow + storage
- [ ] Moderation pipeline live (automated + human queue + appeals)
- [ ] AI-content labels + C2PA embedding
- [ ] Age gate (13+), geo considerations (EU AI Act transparency)
- [ ] Payment compliance (Stripe handles PCI; sales tax via Stripe Tax)
