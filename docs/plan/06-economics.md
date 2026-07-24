# 06 — Economics: Credits, Pricing, Margins

## Unit costs (from doc 05 research, mid-2026 prices)

Per **60-second episode**, including a 1.5× video retake multiplier:

| Quality tier | Stack | Raw COGS |
|---|---|---|
| Draft (720p, Seedance 1.5 Pro native lip sync) | budget stack | **~$8–12** |
| Standard (720p fast Seedance 2.0 + lip-sync passes) | standard stack | **~$25–35** |
| Premium (1080p + sync.so polish + Veo hero shots) | premium stack | **~$60–90** |

Non-video costs (script LLM ~$0.75, voice ~$0.25, music amortized, SFX ~$0.20, images ~$0.75, render compute ~$0.10) total **under $2.50/episode** — video is 85–95% of COGS. Bible setup (sheets, voice design, jingle) is a one-time ~$3–8 per show.

**Strategic margin lever (from competitor research):** stylized/animated looks tolerate cheaper models. Open-model rendering (LTX-2 at ~$0.002/megapixel, Wan self-host, ~$0.01–0.02 true cost per generated second on fal H100s) could push a 60s episode toward **<$1 COGS** long-term. Hedra/Runway run 50–80% gross margins this way; InVideo resells closed models at ~0% generation margin and lives on breakage. We start on closed models (quality first), and treat open-model migration as the Phase 3 margin project.

## Credit system

- **1 credit = $0.01 retail** (simple mental math; industry-standard granularity).
- Every generation action has a posted credit price derived from provider cost × margin multiplier (target ~2.5–3× on generation, in line with Hedra/Runway; re-derived automatically when providers reprice).
- **Pre-flight quotes:** every episode shows its credit price before production starts (Story.com's transparency model — well-liked; InVideo's opaque pools are hated).
- **Credits roll over** while subscribed (differentiator — expiring credits are the #1 pricing complaint in this market). PAYG top-ups never expire.
- Retakes cost credits at the same posted rates; first N retakes per episode discounted 50% (quality goodwill, still margin-positive).

Illustrative pricing at ~2.5–3× on the standard stack: a 60s standard episode ≈ **$25–35 COGS → 7,500–9,000 credits ($75–90)** — too high for hobbyists, which is exactly why the **Draft tier matters**: iterate at draft (~2,500–3,000 credits ≈ $25–30), then "Master" the approved cut at standard/premium quality once. Expected blended: **~1.3 full-quality renders per finished episode** instead of 3–4.

## Subscription tiers (v1 proposal — validate in Phase 1)

| Tier | Price | Included credits | Features |
|---|---|---|---|
| **Viewer** | Free | 0 (300 one-time trial) | Watch, subscribe, comment; try Fast Start demo |
| **Creator** | $29/mo | 3,000 | 1 active show, draft-quality unlimited*, watermark-free 720p exports, voice design |
| **Studio** | $99/mo | 12,000 | 5 shows, 1080p masters, voice cloning (IVC), priority queue, no watermark |
| **Network** | $299/mo | 40,000 | Unlimited shows, premium stack, API access (later), team seats (later), early features |

*"unlimited" = generous soft cap with fair-use throttle, only at draft quality on open/cheap models once available.

- Annual: 2 months free. Credit top-ups: $10/1,000 with volume breaks ($45/5,000, $80/10,000).
- Subscription revenue covers fixed costs + included credits at ~50% blended margin; top-ups are the high-margin expansion revenue.

## Why people pay (value math)

A 60s AI episode assembled by hand across 6 tools (fal + ElevenLabs + Suno-ish + editor) costs a skilled operator $15–40 in API fees **plus 4–10 hours**. We deliver it in <30 min hands-off with persistent consistency. The subscription prices the time saved; credits price the compute.

## Network economics (later phases)

- Phase 2–3: Network is a retention/acquisition engine, not a revenue line. Cost: Mux streaming (~$0.0007–0.001/min delivered) + storage — budget ~$0.02–0.05 per episode per 100 views; watch time is cheap relative to generation.
- Phase 3 experiments: channel memberships (we take 20%), tipping.
- Phase 4 ads: CPM-based pre-roll/feed; 55/45 creator split (YouTube parity as the anchor). Requires meaningful DAU watch minutes first.
- **Remix rev-share** (Showrunner announced it, nobody shipped it): viewers generating episodes inside someone else's show world split credits spend with the original Director. Powerful creator-acquisition hook reserved for Phase 3.

## Cost-control mechanisms (financial safety)

1. Pre-authorization of credits before any pipeline run; hard stop + resumable pause at 125% of quote.
2. Per-user daily generation ceilings by tier; global provider spend circuit breaker.
3. Idempotency keys on all provider calls (no double-billing on retry).
4. Live margin dashboard per modality/provider; alerts when any provider's effective margin <40%.
5. New accounts: watermarked exports + velocity limits until payment history (chargeback fraud).

## Key financial assumptions to validate in Phase 0/1

- [ ] Actual retake multiplier (assumed 1.5×; if it's 3×, draft-tier pricing changes).
- [ ] Seedance 2.0 real per-second billing at 720p fast via fal (tracker numbers conflict).
- [ ] ElevenLabs Music episode-use licensing tier (Enterprise question — doc 08).
- [ ] Wall-clock p50 per episode (queue times drive perceived value).
- [ ] Draft→Master funnel ratio (assumed 1.3 full renders per finished episode).
