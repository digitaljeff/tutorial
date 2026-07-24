# Backlot

The easiest way to create, produce, and publish AI-generated sitcoms and serialized shows — a per-show knowledge base ("Show Bible") plus an agent pipeline that turns approved scripts into finished, voiced, scored, edited episodes, and a network where viewers subscribe and watch.

**Full planning docs:** [docs/plan/00-overview.md](docs/plan/00-overview.md)

| # | Doc |
|---|---|
| 00 | [Overview & product map](docs/plan/00-overview.md) |
| 01 | [Product spec](docs/plan/01-product-spec.md) |
| 02 | [Architecture](docs/plan/02-architecture.md) |
| 03 | [Show Bible / knowledge base (incl. GBrain findings)](docs/plan/03-knowledge-base.md) |
| 04 | [Agent generation pipeline](docs/plan/04-generation-pipeline.md) |
| 05 | [Model stack research (video/image/voice/music, July 2026)](docs/plan/05-model-stack.md) |
| 06 | [Economics: credits, pricing, margins](docs/plan/06-economics.md) |
| 07 | [Roadmap & API keys needed](docs/plan/07-roadmap.md) |
| 08 | [Risks & legal](docs/plan/08-risks-and-legal.md) |
| 09 | [Competitive landscape](docs/plan/09-competitive-landscape.md) |

## Studio (Phase 1 MVP)

Web app over the pipeline: dashboard, show bible, episode pages with shot-board retakes, and produce-from-slate.

```bash
cd studio && npm install && npm run build && npm start   # http://localhost:3000
```

Requires the pipeline set up first (see `pipeline/README.md`) — the studio reads/writes `pipeline/out/`.
