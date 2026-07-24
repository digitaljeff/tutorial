# 02 — System Architecture

## Design principles

1. **The pipeline is a durable workflow, not a chat.** Episode production is a long-running (minutes–hours), expensive, partially-failing DAG of third-party API calls. It must be checkpointed, resumable, idempotent, and observable per step. This is the technical heart of the product.
2. **Deterministic context assembly.** Agents never "search and hope" — the show bible is structured data, and each generation step receives an exactly-templated context pack (see doc 03). RAG is a supplement for long canon, not the backbone.
3. **Provider abstraction from day one.** Every modality (script LLM, image, video, TTS, music, SFX, lipsync) sits behind an internal interface with a primary and fallback provider, per-provider rate-limit queues, and per-call cost logging. Models will be swapped constantly in 2026; the product cannot be married to any of them.
4. **Everything is an asset.** Every generated artifact (image, clip, audio line, mix, cut) is content-addressed, versioned, and linked to the prompt + model + params + cost that produced it. Retakes and audits fall out of this for free.

## High-level diagram

```
                 ┌──────────────────────────────────────────────┐
                 │                 Clients                       │
                 │  Web app (Next.js) · later mobile (Expo)      │
                 └──────────────┬───────────────────────────────┘
                                │ HTTPS / WebSocket (pipeline progress)
                 ┌──────────────▼───────────────────────────────┐
                 │            API (tRPC or REST + OpenAPI)       │
                 │  Auth (Clerk/Auth.js) · Billing (Stripe)      │
                 └────┬───────────────┬─────────────────┬───────┘
                      │               │                 │
        ┌─────────────▼──┐   ┌────────▼────────┐  ┌─────▼──────────┐
        │  Postgres       │   │ Orchestrator     │  │ Object storage │
        │  (Supabase/     │   │ (Temporal Cloud  │  │ R2/S3 + CDN    │
        │   Neon)         │   │  or Inngest)     │  │                │
        │  + pgvector     │   │ Episode DAG,     │  │ assets, masters│
        │  show bibles,   │   │ retries, human-  │  │                │
        │  episodes,      │   │ in-loop gates    │  └─────┬──────────┘
        │  credits ledger │   └────────┬────────┘        │
        └─────────────────┘            │                 │
                              ┌────────▼─────────────────▼────────┐
                              │        Provider Gateway            │
                              │ per-modality adapters + queues     │
                              │  LLM  · Image · Video · TTS ·      │
                              │  Lipsync · Music · SFX             │
                              │ (fal.ai / direct APIs, webhooks)   │
                              └────────┬──────────────────────────┘
                                       │
                              ┌────────▼──────────┐
                              │  Render workers    │
                              │  FFmpeg assembly,  │
                              │  audio mix, loudness│
                              │  captions, encodes │
                              └────────┬──────────┘
                                       │
                              ┌────────▼──────────┐
                              │  Delivery          │
                              │  Mux or CF Stream  │
                              │  (HLS, thumbnails, │
                              │   analytics)       │
                              └───────────────────┘
```

## Recommended stack (v1)

| Layer | Choice | Why |
|---|---|---|
| Web app | Next.js + TypeScript, Tailwind, shadcn/ui | Fast to build studio UI; SSR for public Network pages (SEO) |
| API | Next.js server actions/tRPC for app + a small Node/Fastify service for webhooks & workers | Keep one language across app + pipeline |
| Auth | Clerk (or Auth.js) | Orgs/roles later for Business Manager |
| DB | Postgres (Neon or Supabase) + pgvector | Single source of truth; JSONB for flexible bible fields; pgvector for canon search |
| Orchestration | **Temporal Cloud** (alternative: Inngest for a lighter start) | Durable, resumable, human-in-the-loop signals (script approval), per-step retries — exactly the episode DAG's needs |
| Job queues | Provider gateway workers on Temporal activities; BullMQ only if we skip Temporal | Rate-limit isolation per provider |
| Storage | Cloudflare R2 (no egress fees — video-heavy product) + content-addressed keys | Cost |
| Video delivery | Mux for launch (first **100k delivered min/mo free**, built-in analytics) → migrate hot delivery to R2+CDN progressive MP4/HLS at scale (~10× cheaper past ~1M watched min/mo) | Free launch tier, cheap scale path |
| Assembly | FFmpeg workers (containerized; Fargate/Lambda containers — a 60s episode renders for **well under $0.01**); Remotion (Automators license, $100/mo min) only for motion-graphics intros/title cards; fal.ai's ffmpeg-compose endpoint as a no-DevOps stepping stone in Phase 0 | Full control; managed JSON-video APIs (Shotstack/Creatomate) cost $1.3–1.5k/mo at our volume for the same output |
| Realtime progress | WebSocket/SSE from orchestrator events | The "shot board" UX |
| Payments | Stripe (subscriptions + metered credits + customer portal) | Standard |
| Observability | OpenTelemetry + Langfuse (LLM traces) + per-call cost ledger in Postgres | Cost control is existential here |
| Moderation | OpenAI moderation / Hive for text+image+video frames + human queue | Required before Network goes public |

## The Provider Gateway (key abstraction)

```ts
interface GenerationProvider<TIn, TOut> {
  id: string;                       // "seedance-1.5-pro@fal"
  modality: "llm"|"image"|"video"|"tts"|"lipsync"|"music"|"sfx";
  estimateCost(req: TIn): Credits;  // used for pre-flight episode quotes
  submit(req: TIn): Promise<JobRef>;   // async, webhook/poll for completion
  fetchResult(ref: JobRef): Promise<TOut>;
}
```

- Each adapter normalizes: prompt format, reference-image slots, duration caps, resolution, safety filters, error taxonomy (retryable / content-blocked / provider-down).
- Router picks primary vs fallback per show settings + live provider health.
- Every call writes a `generation` row: inputs hash, model, latency, raw cost, credits charged, output asset id. This table IS the billing meter and the debugging tool.
- Aggregators (fal.ai) get us most video/image models behind one billing account + webhook pattern; direct integrations (ElevenLabs, OpenAI/Anthropic, Gemini) where aggregators lag. Final per-model choices in doc 05.

## Core services (deployable units)

1. **app** — Next.js (studio + network + admin).
2. **api-workers** — webhook receivers (provider callbacks, Stripe), Temporal workers running pipeline activities.
3. **render-workers** — FFmpeg/Remotion containers (autoscale on queue depth; the only compute-heavy service we run ourselves).
4. **moderation-workers** — async scans of scripts, frames, audio before publish.

All stateless; state lives in Postgres + R2 + Temporal.

## Data model (core tables, abridged)

```
users, channels, subscriptions(channel↔user), follows
shows(id, channel_id, format_preset, style_guide jsonb, sound_kit jsonb, status)
characters(id, show_id, profile jsonb, canonical_descriptor text,
           sheet_asset_ids[], voice_provider, voice_id, voice_settings jsonb)
locations(id, show_id, descriptor, ref_asset_ids[], variants jsonb)
seasons(id, show_id, arc jsonb, status)
episodes(id, season_id, idea, status: idea|scripting|approved|producing|review|published,
         script jsonb, shotlist jsonb, cost_estimate, cost_actual, runtime_s)
shots(id, episode_id, idx, spec jsonb, keyframe_asset, clip_asset,
      audio_assets[], status, retake_count)
assets(id, show_id, kind, uri, sha256, meta jsonb, parent_asset_id, generation_id)
generations(id, provider, model, modality, request_hash, cost_usd, credits, status, ...)
canon_facts(id, show_id, episode_id?, fact text, embedding vector, status)
credit_ledger(id, user_id, delta, reason, generation_id?, stripe_ref?)
-- reserved for Phase 4: ad_accounts, campaigns, ad_sets, ads, impressions
```

## Security & tenancy

- Row-level security by `channel_id`/`show_id` (Supabase RLS or app-layer guards).
- Signed URLs for all assets; masters private, published renditions via CDN.
- Voice-clone consent artifacts stored immutably alongside the voice record.
- Per-user spend caps + anomaly alerts (a runaway loop calling video APIs is a real financial risk).

## Build vs buy summary

- **Buy:** model inference (all of it), video delivery (Mux), auth, payments, moderation classifiers.
- **Build:** show bible + context assembly, episode DAG, provider gateway, assembly/render, the Network, credits.
- **Don't build yet:** recommendation algorithm (editorial + chronological first), mobile apps, ad server.
