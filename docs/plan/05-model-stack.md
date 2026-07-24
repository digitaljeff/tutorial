# 05 — Model Stack (research synthesis, July 2026)

All prices are mid-2026 numbers from vendor docs + trackers; several official pages were unreachable during research, so **verify flagged numbers before hard-coding unit economics**. The provider gateway (doc 02) assumes quarterly repricing anyway.

## Headline findings

1. **Seedance validated and upgraded.** Your Seedance experience holds: it's still the best character-sheet-driven video stack, and **Seedance 2.0** (2026) removes the pain points — up to **15s clips**, **omni-reference (9 images + 3 videos + 3 audio)**, and **native multi-shot prompting** ("Shot 1:… Shot 2:…") producing multi-cut sequences with consistent characters in one generation. **Seedance 1.5 Pro** adds native audio with phoneme-level lip sync at ~¼ the price — the cost workhorse.
2. **Sora is dead** — API shuts down Sept 24, 2026. Excluded entirely.
3. **PlayHT/PlayAI is dead** (Meta acqui-hire, service terminated Dec 31, 2025). ElevenLabs' position for character voice is even stronger.
4. **Music is a legal minefield except licensed APIs.** Suno: no official API (partner-gated). Udio: walled garden, no exports. Safe: ElevenLabs Music (Merlin/Kobalt-licensed), Google Lyria on Vertex (IP-indemnified), Stable Audio 2.5 (licensed training data).
5. **Provider churn is structural** (Sora, PlayHT, Groq voice deprecations in 12 months) → the gateway abstraction isn't optional.

## VIDEO (the big cost + quality driver)

| Model | Clip cap | Consistency features | Audio | Price (approx) | Notes |
|---|---|---|---|---|---|
| **Seedance 2.0** (fal/BytePlus/Replicate) | 15s | 9 img + 3 video + 3 audio refs; native multi-shot; best cross-shot face/outfit consistency | ref-audio support (verify native dialogue output) | ~$0.24/s 720p fast, ~$0.30/s 720p std, ~$0.68/s 1080p | **PRIMARY (hero shots, multi-character scenes)** |
| **Seedance 1.5 Pro** | 4–12s | first-frame lock, 1–6 refs, last-frame control | **native audio + multilingual lip sync** | ~$0.26 per 5s 720p w/ audio; ~$0.116/s 1080p | **PRIMARY (dialogue workhorse — cheapest lip-synced dialogue)** |
| **Kling 3.0 / Turbo** | 15s | Multi-Elements refs; 6-shot multi-shot; visual CoT | native audio + lip sync (5 langs) | ~$0.084–0.126/s | **FALLBACK #1** (near parity, de-risks ByteDance dependency) |
| **Veo 3.1 / Fast / Lite** (Gemini API) | 8s (+extend to ~148s) | 3 ref images ("Ingredients"), first/last frame | **best native dialogue audio** | $0.40/s std, ~$0.15/s Fast, ~$0.05/s Lite | **ALTERNATE for hero dialogue**; only 3 refs; voice differs clip-to-clip (bad for recurring characters) |
| Wan 2.5/2.6 | 10s | **lip syncs to YOUR uploaded audio file** | via upload | ~$0.05–0.15/s | Interesting: exact-voice control; open-weight lineage → LoRA path |
| Hailuo 2.3 | 6–10s | good motion | none | ~$0.19–0.49/clip | B-roll/action inserts |
| Runway Gen-4.5 | — | Act-Two performance transfer | separate | ~$0.12–0.25/s (conflicting) | Niche: acting fidelity via human performance |

**Audio-attached generation (tested July 2026):** Wan 2.5 i2v accepts our ElevenLabs line audio and generates the clip already speaking in that voice — one step instead of generate+lipsync, character stayed on-model in tests. **Blocked for now:** it burns transcribed subtitles into the frame (trained-in behavior with speech audio; `enable_subtitle:false` and negative prompts both failed) and clips are locked to 5s/10s. Revisit with **Wan 2.7 reference-to-video** (refs + audio in one endpoint) — if solved, dialogue shots become single-generation while Seedance keeps establishing/action shots.

**Lip-sync post-passes:** Kling LipSync ($0.014 per 5s — dirt cheap, slow ~12min) for bulk; **sync.so lipsync-2-pro** ($0.067–0.083/s, needs $249/mo Scale plan) for rescue-quality fixes. Hedra Character-3 (~6 credits/s; audio-driven full character video ≈ $2/60s effective) is a candidate for close-up talking shots but is talking-head-oriented, not scene blocking.

**Chosen video strategy (60s episode, 8–10 shots):**
- Keyframe-first (image → video) always; character sheets as omni-reference inputs.
- Dialogue audio generated **first** (ElevenLabs), then either (a) Seedance 1.5 Pro native lip sync, or (b) silent clip + lip-sync pass, chosen per shot by the Line Producer based on shot type. A/B this in Phase 0.
- Multi-shot generations (Seedance 2.0 / Kling 3.0) for scenes with rapid cut sequences — this may collapse 3 shots into one generation and is the newest, most promising technique.
- 720p fast tier for iteration/retakes; final render pass at 1080p only for approved shots.
- **Do not use:** Sora (dying), HeyGen/D-ID (corporate avatar look), consumer UIs (Higgsfield/Krea — no production API posture).

## IMAGES (character sheets + keyframes)

| Need | Primary | Fallback | Why |
|---|---|---|---|
| Character turnaround sheets | **Seedream 4.5/5.0** (~$0.03–0.04/img, 10 refs, **sequential batch: up to 15 mutually-consistent images in one call**) | Nano Banana 2 / Pro (multi-turn editing keeps identity) | One call ≈ a whole consistent character sheet; same ByteDance ecosystem as Seedance video |
| Multi-character scene keyframes | **Nano Banana Pro / NB2** (up to 14 refs, **5-character consistency spec**, ~$0.067 batch) | **GPT Image 2** (LMArena #1 by record margin; ~$0.0265 batch medium), FLUX.2 Pro (10 refs, ~$0.03) | Only Google specs multi-character consistency explicitly; GPT Image 2 has best prompt adherence for staging |
| Show style lock | Style-suffix prompts v1; later **Recraft style_id** (persistent style object) or **FLUX.2 Dev LoRA** (open-weight, $999/mo self-host license) | Ideogram 4.0 (now open-weight) | Recraft = style only (not identity); LoRA = strongest lock, most engineering |
| Avoid | Midjourney (no public API, 1 ref, wrapper ToS risk), Imagen 4 (no reference input) | | |

## VOICE (dialogue)

**Primary: ElevenLabs** — confirmed as planned. Key specifics:
- **Eleven v3** (GA Feb 2026): 1 credit/char, **audio tags** (`[laughs]`, `[whispers]`, `[sighs]`…) = exactly our `delivery_tags` mechanism.
- **Text-to-Dialogue API** (`/v1/text-to-dialogue`): multi-speaker generation with realistic turn-taking, ≤10 voices, ≤2,000 chars/request — potentially one call per scene.
- **Voice Design API** (text → voice, 3 previews): our default character-voice path (no consent issues). **IVC cloning** (1–3 min audio, Starter+) with consent flow; PVC later. Verify PVC-on-v3 support.
- Commercial license from Starter ($5/mo); Creator ($22/mo, 100k credits) is our floor. API ~$0.10/1k chars; a 60s episode (~1,200 chars dialogue) ≈ **$0.12–0.26**. Concurrency 10 @ Creator, 20 @ Pro — fine for launch, plan Scale/Business as volume grows.

**Fallbacks:** **MiniMax Speech 2.8** (arena-topping quality, cloning + voice design, ~$60–100/1M chars — verify; consume via Together/Replicate to sidestep China-residency concerns) and **Hume Octave 2** (prompt-based voice design + per-line acting instructions + multi-speaker; pricing tiers conflicting — verify). **Cartesia Sonic 3** as the cheap/low-latency option ($5–37/1M chars). OpenAI TTS: no cloning/custom voices (13 presets) — not viable for characters. Google Gemini-TTS: great style control but cloning is allowlist-gated.

## MUSIC (intros, jingles, score)

| Provider | Status | Price | Rights |
|---|---|---|---|
| **ElevenLabs Music v2** (primary) | Official API | ~$0.15/min (post-cut; conflicting $0.15–0.50 — **verify**) | Merlin+Kobalt licensed; "broad commercial use" on paid plans; **film/TV may need Enterprise — confirm with sales early** |
| **Google Lyria 2/3 Pro** (Vertex) (fallback) | Official API (3 Pro in preview) | Lyria 2: $0.06/30s | **IP indemnification** — strongest legal shield |
| Stable Audio 2.5 | Official API | ~$0.20/gen (≤3 min) | Licensed training (AudioSparx); instrumental-leaning |
| MiniMax Music 3.0 | Official API | $0.15/gen (≤5 min); $0.03 via fal | rights per provider; provenance unclear |
| Suno / Udio | **No official API / walled garden** | — | **Do not integrate** (wrappers violate ToS; litigation live) |

Show intro/jingle: generated **once per show** at bible-build (a few candidates, Director picks) → zero marginal cost per episode + sonic brand consistency.

## SFX + AMBIENCE

- **ElevenLabs SFX v2** (primary): 30s max, looping, 40 credits/s explicit-duration (~$0.09–0.26 per episode's 5–10 cues).
- Later, at scale: **Epidemic Sound Partner API** (200k pre-cleared SFX + 50k tracks; free prototyping tier, custom-priced Scale/Enterprise) — flat-fee library beats per-generation costs and adds quality floor; also a music fallback.
- Avoid OptimizerAI (tiny, reported 2026 breach); Freesound only with CC0 filter if ever.

## SCRIPT / AGENT LLMs

- **Claude Sonnet (current gen)** for Screenwriter/Showrunner (long-context bible + best-in-class writing); **Claude Haiku** for mechanical passes (shot-list conversion, QC checks, canon extraction). Structured outputs everywhere (JSON script schema).
- Cost per episode: script + revisions + shot list + QC ≈ 50–150k tokens ≈ **$0.30–1.00**. Negligible vs video.

## Aggregator strategy

- **fal.ai as the primary gateway** for video + image (Seedance all versions incl. reference-to-video, Kling + LipSync, Veo, Wan, Hailuo, FLUX, Seedream, GPT Image 2 endpoints, Stable Audio): one account, one billing, queue API + webhooks, production SLAs (powers Hedra, Canva, Adobe). **WaveSpeed/Replicate** as secondary resellers for price/redundancy.
- **Direct APIs:** ElevenLabs (voice/SFX/music), Anthropic (LLM), Google Vertex (Lyria, and Veo/Imagen if we go direct for indemnification).
- Phase 0 A/B matrix: {Seedance 2.0, Seedance 1.5, Kling 3.0, Veo 3.1 Fast} × {Seedream 4.5, NB Pro, GPT Image 2 keyframes} on identical shots from the demo show.

## Per-60s-episode cost envelope (video-dominated)

| Stack variant | Video | Audio (TTS+music+SFX) | Images (keyframes+retakes) | LLM | Total est. |
|---|---|---|---|---|---|
| Budget (Seedance 1.5 Pro 720p native lip sync) | ~$4–6 | ~$0.55 | ~$0.50 | ~$0.50 | **~$6–8** |
| Standard (Seedance 2.0 720p fast + lip-sync passes) | ~$18–20 | ~$0.55 | ~$0.75 | ~$0.75 | **~$20–22** |
| Premium (2.0 @1080p + sync.so polish, Veo hero shots) | ~$50+ | ~$0.75 | ~$1 | ~$1 | **~$55+** |

Assume a **1.5–2× retake multiplier** on video in practice. These envelopes drive the credit pricing in doc 06.
