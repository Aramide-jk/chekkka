# Chekka

> "Before you buy — Chekka."
> Nigeria's professional car inspection and verification platform.

A Next.js 16 monolith built on the same conventions as `managerenta-client`:
Mongoose for persistence, Redis for cache/rate-limiting/pub-sub, S3 for
images, styled-components for UI, SWR for client reads, and Zod for every
request body.

---

## Phase status

| Phase | Scope | Status |
|---|---|---|
| 1 | Foundation + Landing page | ✅ shipped |
| 2 | Auth (login/signup/onboarding/forgot-password) + `users` model | ⏳ next |
| 3 | Buyer dashboard shell | ⏳ |
| 4 | Booking wizard (5 steps) + Paystack | ⏳ |
| 5 | Inspection lifecycle + live feed (SSE + Redis pub/sub) | ⏳ |
| 6 | Report submission + Verdict tabs | ⏳ |
| 7 | Consultant chat + Broker requests | ⏳ |
| 8 | Inspector application + dashboard + schedule + earnings | ⏳ |
| 9 | Admin console | ⏳ |

Each phase ships its own Mongoose models, Zod validators, services, route
handlers, hooks, and screens — wired into the same `withApiHandler` /
`withAuth` skeleton.

---

## Getting started

```bash
cp .env.example .env
yarn install
yarn dev
```

Then open <http://localhost:3000>.

### Useful scripts

| Command | What it does |
|---|---|
| `yarn dev` | Next.js dev server |
| `yarn build` | Production build (standalone output) |
| `yarn start` | Run the standalone server |
| `yarn ts.check` | Type-check the project |
| `yarn lint` | Biome lint + format check |
| `yarn format` | Biome auto-format |
| `yarn e2e` | Playwright E2E suite |
| `yarn seed` | Run `scripts/seed.ts` (Phase 2+) |

---

## Architecture

Mirrors `managerenta-client` exactly:

- **App Router** (`src/app/`) with `runtime = "nodejs"` on every route handler.
- **`src/server/`** is server-only (`import "server-only"` on every file).
  - `databases/` — cached singletons for Mongo (`__chekkaMongooseCache`) and
    Redis (`__chekkaRedis`).
  - `lib/` — `withApiHandler` (rate limit + DB readiness + metrics + errors),
    `response` (`ok`/`created`/`fail`/`handleError`), `clientIp`, `rateLimit`.
  - `metrics/` — Prometheus histograms (`restResponseTimeHistogram`,
    `databaseResponseTimeHistogram`).
  - `constants/` — env vars, error singletons, allowed origins.
  - `runtime/bootstrap.ts` — invoked once by `instrumentation.ts` on cold start.
- **`src/libs/<Feature>Wrapper/`** — one folder per page (landing, booking,
  inspection, …).
- **`src/components/`** — atoms (Box, Button, Icon, Pill, Logo, Avatar,
  Stars, Photo, Spinner, Card, Text).
- **`src/hooks/Context/`** — `AppContext` (env, login state) +
  `ThemeContext` (dark/light/system, `data-theme` on `<html>`).
- **`src/styles/global.ts`** — Chekka design tokens (warm graphite + antique
  gold) declared as CSS variables in a `createGlobalStyle`.

---

## Design source

The page designs live in a Claude Design handoff bundle. The landing page
(`/`) is a faithful styled-components port of the bundle's `screens-landing.jsx`.

Future phases will port the remaining screens (auth, buyer, inspector,
consultant, admin) using the same atoms and tokens.

---

## Tech stack

- Next.js 16 (App Router) · React 19 · TypeScript strict
- Mongoose 9 · ioredis 5 · @aws-sdk/client-s3 · sharp
- jose · jsonwebtoken · bcrypt (cost 12)
- styled-components 6 · SWR 2 · motion · nextjs-toploader
- Zod 4 · prom-client 15 · cron 4
- Biome 2 (tabs, width 4) · Playwright
