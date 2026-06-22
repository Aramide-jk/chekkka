# Chekka — Core Features

> "Before you buy — Chekka."
> Nigeria's professional car inspection and verification platform.

---

## WHAT CHEKKA DOES

A buyer wants to purchase a used car but cannot fully trust the seller. Chekka sends a certified, independent inspector to physically examine the car on the buyer's behalf. The inspector photographs everything, checks every mechanical and physical component, and submits a structured report with a clear verdict. The buyer reads the report and decides whether to buy — before spending a single naira.

---

## THE FOUR USER ROLES

**Buyer** — Books inspections, tracks progress in real time, reads reports, chats with consultants, engages brokers for purchase assistance.

**Inspector** — Sets availability, receives job alerts, accepts jobs, visits the car, uploads live photos during the inspection, submits the structured report.

**Consultant** — Receives chat requests from buyers who need guidance, advises on which inspection type fits their situation, handles special cases, escalates complex requests to admin.

**Admin** — Manages the entire platform. Approves inspector applications, handles special inspection requests, monitors all live inspections, resolves disputes, manages broker requests, oversees overdue reports.

`role` is a field on the `users` document (enum: `"buyer" | "inspector" | "consultant" | "admin"`). It is **never** sent from the client at login — the server reads it from MongoDB after credential verification and uses it for all routing/authorization decisions.

---

---

## TECH STACK & CODE CONVENTIONS

Chekka follows the same architectural conventions as **managerenta-client**. This section is normative — every feature below assumes these defaults.

### Runtime & framework
- **Next.js 16** (App Router) with `output: "standalone"`, `reactStrictMode: true`, `poweredByHeader: false`.
- **React 19** + TypeScript strict mode (target ES2017, `moduleResolution: "bundler"`).
- Path alias `@/*` → `./src/*`.
- All route handlers run on `export const runtime = "nodejs"`.

### Server side
- **MongoDB** via **Mongoose 9** — one shared cached connection in `src/server/databases/mongoDB.ts` (`global.__chekkaMongooseCache`), called as `await connectMongoDB()` from inside `withApiHandler`.
- **Redis** via **ioredis** — one shared client in `src/server/databases/redis.ts` (`global.__chekkaRedis`) for rate limiting, OTP storage, list cache, and live-feed pub/sub fan-out.
- **JWT** auth using `jose` + `jsonwebtoken`, **bcrypt** for password hashing (cost 12), access + refresh tokens stored in HTTP-only cookies (`ACCESS_COOKIE`, `REFRESH_COOKIE`).
- **AWS S3** via `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` for buyer avatars, inspector documents (ID, certificate), and inspection photos. All read URLs are signed and refreshed inside Mongoose `post("aggregate")` hooks via `s3GetFileLink({ fileName, expiresInSeconds })`.
- **sharp** for image resize (inspector documents + inspection photos) via the shared `uploadAndResizeImage({ basePath, bufferOrUrl, shouldResize })` helper.
- **Zod 4** for every request body / query schema. Validators live in `src/server/validators/<resource>/validate.ts` and are called with `safeParse` — failure throws `ErrInvalidFields`.
- **prom-client** — every route is observed by `restResponseTimeHistogram` (handled inside `withApiHandler`); every Mongoose DB method wraps work with `databaseResponseTimeHistogram.startTimer()` and emits `{ operation, collection, method, success }` labels.
- **cron** — scheduled jobs (overdue-report sweep, payout-release sweep, OTP cleanup, refresh-token cleanup) registered in `src/server/constants/cron.ts` and started by `src/server/runtime/bootstrap.ts`.

### Client side
- **styled-components 6** with `compiler.styledComponents: true` and `StyledComponentsRegistry`. No Tailwind. Theme via CSS custom properties on `:root` and `[data-theme="dark"]`, defined in `src/styles/global.ts`.
- **SWR 2** for all reads. Hooks live in `src/hooks/<Domain>/` and follow the pattern:
  ```ts
  useSWR<IRawResponse>(`/api/...`, fetcher, { revalidateOnMount: true })
  // → useMemo() to map raw shape into the view-model the page renders
  ```
- **axios** wrapped by `src/constants/api.ts` and consumed via `fetcher` (`src/constants/fetcher.ts`).
- **react-toastify** for transient notifications, **react-spinners** for spinners, **nextjs-toploader** for top progress bar, **motion** for transitions, **react-icons** (Feather, Bootstrap-Icons) for iconography.
- **react-phone-number-input** + **validator** for phone fields; phones are stored in E.164 (Nigerian numbers like `+2348012345678`).

### Project structure (`src/`)

```
src/
├─ app/                              ← Next.js App Router
│  ├─ layout.tsx                     ← Root layout (DM_Sans, BodyWrapper, StyledComponentsRegistry)
│  ├─ page.tsx                       ← Landing
│  ├─ login/  signup/  forgot-password/
│  ├─ onboarding/                    ← 3-slide first-login flow
│  ├─ dashboard/                     ← Routes by role server-side
│  ├─ book/                          ← 5-step booking flow
│  │  └─ [step]/page.tsx
│  ├─ inspections/[id]/              ← Lifecycle, live feed, report tabs
│  ├─ inspector/                     ← Application, jobs, schedule
│  ├─ chat/                          ← Consultant + broker chat
│  ├─ admin/                         ← Admin console
│  └─ api/                           ← Route handlers (see below)
├─ components/                       ← Atoms: Box, Button, Input, Text, Image, Loader, BodyWrapper, StyledComponentsRegistry
├─ layouts/                          ← Cross-cutting UI: Navbar, ModalWrapper, Pagination, Toast, Tooltip, UserAuthWrapper, NotFound
├─ libs/                             ← Page-level feature wrappers (one folder per route)
│  ├─ BookingWrapper/
│  ├─ InspectionWrapper/             ← Contains LiveFeed, ReportTabs sub-folders
│  ├─ InspectorJobsWrapper/
│  ├─ ConsultantChatWrapper/
│  ├─ BrokerWrapper/
│  └─ AdminWrapper/
├─ hooks/                            ← SWR + state hooks, one folder per domain
│  ├─ Context/                       ← AppContext, ThemeContext
│  ├─ Auth/                          ← useLogin, useSignup, useForgotPassword
│  ├─ Booking/                       ← useBookingFlow, useInspectorList
│  ├─ Inspection/                    ← useInspection, useLiveFeed, useReport
│  ├─ Inspector/                     ← useInspectorJobs, useInspectorSchedule
│  ├─ Chat/                          ← useConsultantChat, useBrokerChat
│  └─ Admin/
├─ constants/                        ← Client constants (api, fetcher, formatNumber, getErrorMessage, getSeoMetadata, defaultEnvOptions, supportedImageMimeTypes)
├─ types/                            ← Shared TypeScript types per domain
├─ styles/                           ← global.ts, theme tokens
└─ server/                           ← Server-only code (every file: `import "server-only"`)
   ├─ databases/                     ← mongoDB.ts, redis.ts
   ├─ lib/                           ← handler.ts, auth.ts, cookies.ts, rateLimit.ts, response.ts, upload.ts, clientIp.ts
   ├─ models/                        ← One folder per collection — index.ts (schema + DB methods), types.ts, utils.ts
   │  ├─ users/                      ← buyer/inspector/consultant/admin in one collection, discriminated by `role`
   │  ├─ inspectorProfiles/          ← Inspector-only data (specialisations, schedule, documents)
   │  ├─ inspections/                ← The core entity — booking + lifecycle + report
   │  ├─ inspectionPhotos/           ← Live-feed photos, append-only
   │  ├─ chats/  messages/
   │  ├─ brokerRequests/
   │  ├─ disputes/
   │  ├─ notifications/
   │  └─ transactions/               ← Payments (Paystack) + payouts
   ├─ services/                      ← One function per file — business logic that orchestrates models, S3, cache, notifications
   ├─ validators/                    ← Zod schemas, one folder per resource
   ├─ helpers/s3/                    ← getS3Instance, s3GetFileLink, s3UploadAssetImage, uploadAndResizeImage, uploadFile
   ├─ constants/                     ← errors/, env, decodeJwtToken, cron, isOriginAllowed, supportedImageMimeTypes
   ├─ middleware/                    ← Per-domain server middlewares (e.g. inspector approval gate)
   ├─ metrics/                       ← Prometheus histograms
   └─ runtime/bootstrap.ts           ← Cron + warm-up; wired via instrumentation.ts
```

### Route-handler skeleton

Every `src/app/api/*/route.ts` follows this pattern verbatim:

```ts
import type { NextRequest } from "next/server";
import { ErrInvalidAction, ErrInvalidFields } from "@/server/constants";
import {
    created,
    handleError,
    parseMultipart,
    singleFileBuffer,
    withApiHandler,
    withAuth,
} from "@/server/lib";
import { createInspection } from "@/server/services";
import { createInspectionBodySchema } from "@/server/validators/inspections/validate";

export const runtime = "nodejs";

export const POST = withApiHandler(
    { route: "/api/inspections" },
    withAuth(async ({ req, auth }) => {
        try {
            const parsed = await parseMultipart(req as NextRequest);
            const body = createInspectionBodySchema.safeParse(parsed.fields);
            if (!body.success) throw ErrInvalidFields;

            const result = await createInspection({
                payload: { ...body.data, buyerId: auth.userId },
            });
            if (!result) throw ErrInvalidAction;

            return created(result, "Inspection booked");
        } catch (error) {
            return handleError(error);
        }
    }),
);
```

- `withApiHandler` provides: rate limiting (default 100 req / 60 s), MongoDB readiness, Prometheus timing, consistent error envelope.
- `withAuth` provides: JWT verification, silent refresh-token rotation, automatic cookie reset on the response.
- Success envelopes use `ok()` / `created()`; failures use `fail()` / `handleError()`. All return `{ code, message, data }`.

### Mongoose model skeleton

Every model in `src/server/models/<resource>/index.ts` follows the same conventions seen in the `users` collection:

- `schema.pre("save")` to bcrypt-hash passwords / OTPs.
- `schema.pre("aggregate")` to inject `{ $match: { deleted: false } }`, add a `$addFields: { id: { $toString: "$_id" } }` stage, and `$project` away sensitive fields.
- `schema.post("aggregate")` to swap S3 `fileName` references for **signed URLs** (`s3GetFileLink({ fileName, expiresInSeconds: 60 * 60 * 24 })`).
- Every read/write helper (`createXxxDB`, `getXxxByIdDB`, …) is wrapped in `databaseResponseTimeHistogram.startTimer()` and labeled `{ operation, collection, method, success }`.
- Soft-delete via `deleted: { type: Boolean, default: false, select: false }`.
- Model export memoizes against `mongoose.models[collectionName]` so hot-reload doesn't re-register.

### Tooling
- **Biome 2** for lint + format. Indent = **tabs, width 4**. Import organization on save.
- **Playwright** for E2E (`/e2e/auth.spec.ts`, `/e2e/booking.spec.ts`, `/e2e/inspection-lifecycle.spec.ts`).
- **tsx** for one-off scripts (e.g. `scripts/seed.ts`).
- Deploy via the same Dockerfile + `buildspec.yml` / `amplify.yml` pattern.

---

---

## CORE FEATURE 1 — AUTHENTICATION & ONBOARDING

### Buyer Sign Up
- Buyer creates an account with full name, username, email, phone number (E.164 via `react-phone-number-input`), and password.
- Optional profile photo upload — sent as `multipart/form-data`, parsed with `parseMultipart`, resized with `uploadAndResizeImage({ basePath: "users/avatars", shouldResize: true })`.
- Google sign-in via `jose` ID-token verification, then `getUserByEmailDB` → create or link.
- All fields validated by `signupBodySchema` (Zod, `.strict()`). Duplicate `email` / `username` rely on the Mongoose `unique: true` index, surfaced as `ErrEmailAlreadyExists` / `ErrUsernameAlreadyExists`.
- On first login the buyer sees a 3-slide onboarding (`src/libs/OnboardingWrapper`) before landing on `/dashboard`. The "onboardingCompleted" flag is a boolean on the user document.

### Inspector Application (3 Steps)
- Implemented as `/inspector/apply` with three sub-routes; intermediate state lives in `useInspectorApplication` (a hook backed by `useState` + `useReducer`, persisted to `localStorage` per draft until submission).
- **Step 1** — personal: name, phone, email, city of operation.
- **Step 2** — professional: years of experience, vehicle specialisations (multi-select), bio, password.
- **Step 3** — documents: government ID (required), automotive certificate (required), optional extra — uploaded as multipart, stored in S3 under `inspectors/<userId>/documents/`.
- Final submit → `POST /api/inspectors/applications` → service `submitInspectorApplication` → creates a `users` doc with `role: "inspector"`, `status: "pending"`, and a paired `inspectorProfiles` doc. Admin review queue is filled by `getPendingInspectorApplicationsDB`.
- Admin approves / rejects with reason → `PATCH /api/admin/inspectors/[id]/status` → updates `status` and emits the notification chain (in-app + SMS + email).

### Login
- `loginBodySchema` (Zod, `.strict()`): `{ email: zod.email(), password: zod.string().min(1).max(128) }`.
- Service `login` uses `getUserByEmailWithPasswordDB` (which uses `.select("+password")`), `bcrypt.compare`, then `user.generateAuthToken(ip)` to mint access + refresh JWTs and append to `refreshTokens[]` (capped at 10 — older ones trimmed).
- Cookies written via `setAuthCookies({ accessToken, refreshToken, ... })`. Role-based redirect happens in the **server component** after `verifyAuthToken` resolves — never relayed by the client.
- Approved inspectors → `/inspector/dashboard`; pending → `/inspector/pending`; rejected → `/inspector/rejected`; suspended → `/inspector/suspended`.

### Forgot Password
- `POST /api/auth/forgot-password` accepts email or phone, generates a 6-digit numeric OTP, stores it in Redis as `forgot-password:<userId>` with a `setex` TTL of `10 * 60`, dispatches via SMS + email provider.
- `POST /api/auth/verify-otp` checks the OTP against Redis; success returns a short-lived reset token (signed JWT, 5-min TTL).
- `POST /api/auth/reset-password` accepts the reset token + new password → `changePasswordDB` (Mongoose `pre("findOneAndUpdate")` re-hashes the password automatically).
- Expired OTPs auto-purge via the Redis TTL; a cron in `src/server/constants/cron.ts` also clears any orphan reset tokens daily.

---

---

## CORE FEATURE 2 — INSPECTION BOOKING (5-STEP FLOW)

The central transaction of the platform. Implemented as `/book/[step]/page.tsx` with the wizard state held in `useBookingFlow` (a context hook in `src/hooks/Booking/`). **Nothing is persisted until the Paystack callback confirms payment.**

### Step 1 — Car Details
- Buyer selects seller type: Dealership or Private Owner.
- Fields: car make, car model, year of manufacture, color, location (city + address or landmark), seller contact (optional), notes (optional).
- Validated against `bookingStep1Schema` (Zod). Stored only in client state (`useBookingFlow`) at this stage.

### Step 2 — Inspection Type
Three types loaded from `GET /api/inspection-types` (cached in Redis for 1 h):

**Standard** — Complete inspection. Fixed price. 48-hour turnaround. Normal flow.

**Premium** — Priority inspector pool, faster turnaround. Higher fixed price. Normal flow.

**Special Request** — No fixed price. Skips steps 3–5 and redirects the buyer to a consultant chat (`/chat/consultant?context=special-request`). Admin manually creates the inspection record after the consultation.

### Step 3 — Inspector Selection
- `GET /api/inspectors?city=<>&type=<>&limit=&offset=` → service `getAvailableInspectors` runs a Mongoose aggregation joining `users` + `inspectorProfiles`, filtering on `status: "approved"`, `availability.toggleOn: true`, and the buyer's city.
- Each profile card shows: signed-URL avatar, name, star rating (computed in a `$lookup` against the reviews collection), total completed inspections, city, specialisations, bio, last 5 reviews.
- Buyer filters via local SWR re-fetch with updated query string: `?sort=topRated | mostInspections | nearest`.
- Buyer views the full profile in `ModalWrapper` (from `src/layouts/ModalWrapper/`) before selecting.

### Step 4 — Scheduling
- `GET /api/inspectors/[id]/availability?from=<ISO>&to=<ISO>` returns: `{ date, slots: ["09:00","11:00","14:00","16:00"] }[]` where every entry already excludes booked slots and blocked dates.
- Calendar component reads this and disables (greys out) any date with `slots.length === 0`.
- Slots are constant: `09:00`, `11:00`, `14:00`, `16:00`.
- Summary card under the calendar reflects the selection before proceeding.

### Step 5 — Payment
- Order summary card: car details, inspection type, inspector, date, time.
- Price breakdown: inspection fee + platform service fee + total. All values formatted via `formatNumber` with `₦` prefix and `toLocaleString("en-NG")`.
- `POST /api/payments/initialise` calls **Paystack** server-side to mint a transaction reference. Client redirects to Paystack's hosted page.
- `POST /api/payments/webhook` (separately wrapped with `withApiHandler({ rateLimit: false })` and signature-verified using the Paystack webhook secret) marks the transaction as paid and, **inside a `mongoose.startSession()` transaction**, creates:
  1. The `inspections` document (status = `"submitted"`),
  2. A `transactions` document linking buyer + inspector + inspection,
  3. A queued notification to the inspector and a confirmation to the buyer.
- Inspector is **only** locked to the job after the webhook callback completes. Booking confirmation toast + redirect to `/inspections/[id]`.

---

---

## CORE FEATURE 3 — THE INSPECTION LIFECYCLE

Every inspection moves through six stages in order. No stage can be skipped. The stage is a single field on the `inspections` document:

```ts
status: "submitted" | "assigned" | "scheduled" | "in_progress" | "report_processing" | "completed"
```

Stage transitions are gated server-side in service files (`assignInspection`, `scheduleInspection`, `startInspection`, `markReportProcessing`, `submitInspectionReport`) — the client never PATCHes `status` directly.

### Stage 1 — Submitted
Booking is paid (Paystack webhook landed). Awaiting inspector accept/decline. A `cron` job watches submissions older than the accept window and reassigns.

### Stage 2 — Assigned
Inspector accepted via `POST /api/inspections/[id]/accept`. Buyer is notified. `inspections.assignedAt` set.

### Stage 3 — Scheduled
Inspector confirmed the visit with the seller (`POST /api/inspections/[id]/confirm-seller`). Appointment locked.

### Stage 4 — Inspection In Progress
Inspector tapped "Start Inspection". `inspections.startedAt` set, the live-feed channel (`Redis pub/sub: inspection:<id>:photos`) is created, and buyer receives the live-feed link.

### Stage 5 — Report Processing
`POST /api/inspections/[id]/complete-physical` flips the stage and stamps `reportDeadline = startedAt + 48h`. A cron checks this deadline.

### Stage 6 — Completed
Report submitted via `POST /api/inspections/[id]/report`. Report becomes readable, payout is queued (`transactions.payoutStatus = "held"`).

---

---

## CORE FEATURE 4 — LIVE INSPECTION FEED

### What it is
While the inspector is physically at the car (Stage 4), every photo they take is broadcast in real time to the buyer's screen.

### Data model
- New documents go into the `inspectionPhotos` collection: `{ inspectionId, section, url, note?, takenAt, sequence }`. Append-only; never updated.
- Inspector's "currently examining" section lives on the parent `inspections` doc as `currentSection`.

### Inspector side
- `/inspector/inspections/[id]/live` (page) → `LiveCapture` component in `src/libs/InspectionWrapper/components/LiveCapture/`.
- Section selector: Exterior, Interior, Engine, Test Drive, Other.
- Camera button → captures, then `POST /api/inspections/[id]/photos` as `multipart/form-data`. Service `appendLivePhoto`:
  1. Resizes via `uploadAndResizeImage({ basePath: "inspections/<id>/photos" })`,
  2. Persists the `inspectionPhotos` record,
  3. **Publishes to Redis** on channel `inspection:<id>:photos`.
- Short video clips and per-photo text notes are accepted in the same endpoint (mime + size limits inside `parseMultipart`).
- "Currently examining" updates → `PATCH /api/inspections/[id]/current-section` → publishes `inspection:<id>:status`.
- Minimum 30 photos enforced server-side before `POST /api/inspections/[id]/complete-physical` succeeds.

### Buyer side
- `/inspections/[id]/live` (page) opens an **EventSource** (Server-Sent Events) to `/api/inspections/[id]/stream`, which subscribes to the Redis channel and streams events to the browser.
- The SWR cache for `/api/inspections/[id]/photos` is `mutate()`-d on every event.
- Sticky bar shows `inspections.currentSection` (live-updated via the same stream).
- Each photo card: section label + `takenAt` timestamp + optional inspector note.
- Tapping a photo opens fullscreen swipe view (existing `layouts/ModalWrapper` + simple Swipe component — no extra carousel dep).
- Live photo count updates from the SWR cache length.

---

---

## CORE FEATURE 5 — THE INSPECTION REPORT

The final product. Structured into seven tabs. The full report is one embedded document on `inspections.report`. Rendered by `ReportTabs` in `src/libs/InspectionWrapper/components/ReportTabs/`.

### Overview Tab
- Vehicle information table: Year, Make, Model, Mileage, Transmission, VIN Number, Interior Type, Interior Color, Body Color, Engine, Drive Type, Fuel Type.
- Counts: items that passed, minor issues, serious issues — computed at submit time inside `submitInspectionReport`, persisted on `report.summary` for fast reads.

### Exterior Tab
Body Alignment, Paint Condition, Scratches, Dents, Rust, Exterior Lights, Windshield, Wiper Blades, Tyres, Bumpers, Door Mirrors, Sunroof, Back-up Camera.

### Interior Tab
Dashboard and Warning Lights, Seats and Upholstery, Air Conditioning, Infotainment System, Power Windows, Central Locking, Interior Odour, Boot and Trunk, Spare Tyre.

### Mechanical Tab
Engine Condition, Engine Oil, Cooling System, Battery, Brake System, Transmission, Suspension, Fluid Leaks, Air Filter, Belts and Hoses, Power Steering, Exhaust System.

### Road Test Tab
Road Test Conducted (Yes/No), Engine Performance, Transmission Performance, Braking, Steering, Suspension, Wheel Bearing, Differential, Engine Starting, OBD2 Computer Diagnosis.

### Photos Tab
Full grid of all 30–50 inspection photos — same `inspectionPhotos` collection, just without the live stream. Fullscreen swipe is the same component as the live feed.

### Verdict Tab
Three possible verdicts, each rendered as a colored card via CSS-var theme tokens:
- **Worth Buying** — `--Success-700`
- **Buy With Caution** — neutral amber
- **Not Recommended** — `--Error-600`

Below the verdict: written summary + items to fix with priority (`Low | Medium | High`).

### Report Actions
- **Download as PDF** — generated server-side via `@react-pdf/renderer` at `GET /api/inspections/[id]/report.pdf`. The buyer's browser hits the route directly so the response is streamed.
- **Share** — generates a signed, time-limited share link stored in Redis (`share:<inspectionId>:<nonce>` with TTL 7 d).
- **Book another inspection** — pre-fills the booking wizard with the same car details.
- **Talk to a Broker** — see Feature 6.

### Report state
- Once submitted, the report is locked. `submitInspectionReport` runs inside a Mongoose transaction and sets `inspections.reportLockedAt`. Subsequent PATCH attempts throw `ErrReportLocked` (a new shared error in `src/server/constants/errors/`).

---

---

## CORE FEATURE 6 — BROKER SERVICE

### What it is
After reading their report, a buyer can request a Chekka broker to handle the entire purchase on their behalf.

### Data model
- New collection: `brokerRequests`. Status enum:
  ```ts
  status: "broker_assigned" | "negotiation" | "purchase_confirmed" | "payment_coordinated" | "in_transit" | "delivered"
  ```
- Each request links `buyerId`, `brokerId` (a user with `role: "admin"` or `role: "broker"` — depending on whether brokers become a separate role later), and `inspectionId`.

### How it works
- Buyer taps "Talk to a Broker" on `/inspections/[id]` → opens `ModalWrapper` with the brokerage copy verbatim:
  *"You've seen the report. Now let a Chekka broker take it from here — negotiate the price with the seller, coordinate your payment securely, and arrange delivery of the car straight to your door. You don't have to meet the seller, travel to the car, or handle a single kobo directly. A small brokerage fee applies."*
- Two options: **Connect Me With a Broker** or **No thanks, I'll handle it myself**.
- On proceed → form for budget, preferred payment method, delivery address, special instructions. Validated by `createBrokerRequestSchema` (Zod).
- `POST /api/broker-requests` → service `createBrokerRequest` creates the doc with `status: null`, queues a notification to the admin queue.
- Admin assigns a broker via `PATCH /api/admin/broker-requests/[id]/assign` → broker becomes the chat counterparty in `chats` (see Feature 7's data model; chat type is `chatType: "broker"`).
- Status tracker drawn from `brokerRequests.status` — the broker advances it via `PATCH /api/broker-requests/[id]/status`.

---

---

## CORE FEATURE 7 — CONSULTANT CHAT

### What it is
A live chat with a Chekka consultant for buyers who need guidance before booking.

### Data model
- `chats` collection: `{ buyerId, consultantId?, chatType: "consultant" | "broker", status: "pending" | "active" | "closed", lastMessageAt }`.
- `messages` collection: `{ chatId, senderId, kind: "text" | "attachment" | "recommendation" | "escalation", body, attachments[], createdAt }`. Append-only.
- `recommendation` messages carry a structured payload `{ inspectionType, price, description, ctaLink }` — rendered as a card with a **Book Now** button on the buyer side.

### Buyer side
- Entry points: booking flow step 2 ("Inspection Type") sidebar; homepage CTA; bottom navigation "Chat" tab.
- `/chat` lists consultants with their online status (read from Redis `consultant:<id>:online` heartbeat keys with a 30 s TTL).
- First-open quick prompts (constants in `src/constants/`): "Is this car worth inspecting?", "Which plan should I choose?", "I have a special inspection request".
- Standard chat UI: messages, attachments via `parseMultipart`, timestamps.
- Real-time updates use the same SSE pattern as the live feed: `GET /api/chats/[id]/stream` subscribes to Redis channel `chat:<id>:messages` and `mutate`s the SWR cache for `/api/chats/[id]/messages`.

### Consultant side
- `/consultant/chats` (server component, role-gated) lists all conversations; pending (unassigned) ones surface in a separate tab.
- Recommendation cards: consultant fills a small form → `POST /api/chats/[id]/messages` with `kind: "recommendation"` and the payload.
- Escalate: `POST /api/chats/[id]/escalate` with a reason — appends an `escalation` message and updates the chat's `escalatedTo: adminUserId` field. Admin sees the chat in their queue.

---

---

## CORE FEATURE 8 — INSPECTOR JOB MANAGEMENT

### Availability Toggle
- Boolean on the `inspectorProfiles` document: `availability.toggleOn`.
- `PATCH /api/inspector/availability` flips it. When `false`, `getAvailableInspectors` filters this inspector out of search results.

### Receiving and Responding to Jobs
- New job alerts come via in-app notification (the `notifications` collection + SSE on `/api/notifications/stream`), SMS, and email.
- Job card shows car details, location, scheduled date/time, payout.
- `POST /api/inspections/[id]/accept` → service `acceptInspection`:
  - Verifies the job is still `submitted`,
  - Verifies the calling inspector matches `inspections.assignedInspectorId` (the one offered first),
  - Sets `status: "assigned"`, notifies the buyer.
- `POST /api/inspections/[id]/decline` logs the action, then service `reassignInspection` offers it to the next candidate.
- The accept window is enforced by a cron that watches `submitted` jobs older than the window.

### Job Detail
- Full car details, buyer notes, seller contact with a one-tap `tel:` link.
- "Mark seller as contacted" → `PATCH /api/inspections/[id]/seller-contacted`. Server enforces this within 24 h of accept (`inspections.acceptedAt + 24h`); otherwise the job appears on the admin's overdue dashboard.
- 24-h countdown computed client-side from `acceptedAt`.
- "Start Inspection" button on `/inspector/inspections/[id]` only enabled when `scheduledFor <= now`. Pressing it calls `POST /api/inspections/[id]/start`.

### Report Submission
- `/inspector/inspections/[id]/report` is the form route.
- Every checklist item has a `status` field: `"good" | "minor" | "serious" | "n/a"`. The Zod schema `submitInspectionReportSchema` enforces that any `minor` / `serious` item carries a non-empty `comment`.
- Final verdict + mandatory summary required.
- Preview screen renders the same `ReportTabs` component the buyer will see — no separate template.
- `POST /api/inspections/[id]/report` runs in a Mongoose transaction:
  1. Validates payload,
  2. Computes `summary` counts,
  3. Sets `inspections.report`, `status: "completed"`, `reportLockedAt: new Date()`,
  4. Sets `transactions.payoutStatus: "held"` with `payoutEligibleAt = now + 48h`,
  5. Notifies the buyer.

---

---

## CORE FEATURE 9 — INSPECTOR SCHEDULE MANAGEMENT

- `inspectorProfiles.schedule` is an embedded subdocument:
  ```ts
  schedule: {
      weekly: {
          mon: { active: boolean, slots: [{ time: string, on: boolean }] },
          tue: { ... }, ...
      },
      blockedDates: [Date],
  }
  ```
- Inspector toggles days/slots on `/inspector/schedule` → `PATCH /api/inspector/schedule`.
- Blocked dates: `POST /api/inspector/schedule/block` / `DELETE /api/inspector/schedule/block/[date]`.
- The buyer's scheduling calendar in **Step 4** reads `GET /api/inspectors/[id]/availability` which composes (a) `schedule.weekly`, (b) `schedule.blockedDates`, and (c) already-booked slots from `inspections` where `scheduledFor` falls inside the date range — all in one aggregation. Cache TTL = 60 s in Redis, busted on any schedule write.

---

---

## CORE FEATURE 10 — ADMIN PLATFORM MANAGEMENT

Admin console lives under `/admin/*` and is gated by `withAuth` + a role middleware (`requireRole("admin")`) that lives in `src/server/middleware/`.

### Inspector Applications
- Queue: `GET /api/admin/inspectors?status=pending`.
- Detail view shows all personal details, professional background, equipment checklist, signed S3 URLs to uploaded documents.
- Decision: `PATCH /api/admin/inspectors/[id]/status` with `{ status, reason? }` → service `decideInspectorApplication` updates the user + profile and emits the notification chain.

### Special Request Management
- Queue: `GET /api/admin/special-requests` (inspections with `inspectionType: "special_request"` and `status: "submitted"`).
- Admin reviews car details and notes.
- `POST /api/admin/special-requests/[id]/assign` accepts `{ inspectorId, customPrice }` and creates the `inspections` record (skipping Steps 3–5 of the normal flow) inside a transaction with the corresponding `transactions` document. Buyer is notified.

### Live Monitoring
- `GET /api/admin/inspections/live` returns all inspections in `status: "in_progress"` with inspector name, car, location, `currentSection`, and `photoCount` (from a `$lookup` on `inspectionPhotos`).
- Admin can open `/admin/inspections/[id]/live` — same SSE feed as the buyer, mounted read-only.

### Disputes
- `disputes` collection: `{ inspectionId, raisedBy, statement, messages: [...], status, internalNotes: [...] }`.
- Buyer's 48-h window enforced server-side from `inspections.completedAt`.
- Admin sees buyer statement, full report, conversation thread; can write `internalNotes` (visible only to admin) via `POST /api/admin/disputes/[id]/note`.
- `POST /api/admin/disputes/[id]/resolve` accepts `{ resolution: "buyer" | "inspector" | "closed" }`. Inside a transaction it updates the dispute, triggers refund (Paystack) or payout-release (`transactions.payoutStatus`).

### Overdue Reports
- `GET /api/admin/inspections/overdue` returns inspections with `status: "report_processing"` past `reportDeadline`.
- Reminder: `POST /api/admin/inspections/[id]/remind` — triggers SMS to inspector.
- Reassign: `POST /api/admin/inspections/[id]/reassign`.
- Flag inspector: `PATCH /api/admin/inspectors/[id]/flag`.
- Cron job (`src/server/constants/cron.ts`) populates this list every 15 minutes; the page is also reactive (SWR `refreshInterval: 30_000`).

### Inspector Management
- `GET /api/admin/inspectors?status=active|suspended|pending&search=&limit=&offset=` powers a unified list.
- Profile view aggregates inspection history, reviews, earnings via a single Mongoose aggregation.
- Suspend / remove / manually assign via dedicated endpoints under `/api/admin/inspectors/[id]/*`.

### Broker Request Management
- `GET /api/admin/broker-requests` returns all active requests with buyer + car + verdict + budget.
- `POST /api/admin/broker-requests/[id]/assign` writes `brokerId` and opens the chat.
- Status tracker can be updated by admin too; the buyer-broker chat is opened in the same UI as Feature 7.

---

---

## CORE FEATURE 11 — NOTIFICATIONS

Every significant event creates a row in the `notifications` collection. Channels are layered:

| Channel | Delivery mechanism |
|---|---|
| In-app | `notifications` doc + SSE on `/api/notifications/stream` + bell badge in `Navbar` |
| SMS | Provider call inside the service (queued via Redis if the provider is unreachable) |
| Email | Provider call inside the service |

The service `emitNotification({ userId, kind, channels, payload })` writes the doc and dispatches the requested channels in parallel. **In-app** is sent for every event; SMS for high-priority events; email for bookings, reports, and account-level communications.

### Buyer Notifications
- Inspection booking confirmed
- Inspector assigned
- Appointment scheduled and confirmed
- Inspection started — with a direct link to the live feed
- Report processing — countdown underway
- Report ready — with a direct link to the report
- New message from consultant
- Admin update on a special request
- Broker assigned
- Broker status update at each stage
- Dispute resolved

### Inspector Notifications
- New job available in their city
- Job confirmed after acceptance
- Reminder one hour before scheduled inspection (cron-driven)
- Report submission deadline approaching (cron-driven)
- Report submitted successfully
- Payout released

### Admin Notifications
- New inspector application submitted
- New special request submitted
- New dispute opened
- New broker request
- Inspector completed report
- Report gone overdue (cron-driven)

---

---

## CORE FEATURE 12 — PAYOUT AND PAYMENT LOGIC

Implemented entirely server-side in `src/server/services/transactions/` and gated by cron.

- All buyer payments go to the platform via Paystack — never directly to the inspector.
- On report submission: `transactions.payoutStatus` = `"held"`, `payoutEligibleAt = now + 48h`.
- If a dispute is opened within 48 h: `payoutStatus` flips to `"held_dispute"` until the dispute resolves.
- If no dispute is raised within 48 h: a cron sweeps eligible transactions and flips them to `"released"`, then triggers the Paystack transfer to the inspector's payout account.
- If the report is **not** submitted within 48 h: the job is overdue; `payoutStatus` stays `"held"`.
- Inspector earnings dashboard (`/inspector/earnings`) reads from a single aggregation on `transactions` and exposes per-job, weekly total, monthly total — blurred by default (`filter: blur(8px)`) with a `react-icons` eye toggle in local state.

Transaction states:
```ts
payoutStatus: "pending" | "held" | "held_dispute" | "released" | "refunded"
```

---

---

## SUMMARY — WHAT CHEKKA DOES IN ONE FLOW

Buyer pays via Paystack → webhook creates the `inspections` document in a Mongoose transaction → Inspector is assigned → Inspector visits the car → Buyer watches the live feed over SSE backed by Redis pub/sub → Inspector submits a structured report rendered through the same `ReportTabs` component → cron releases the payout 48 h later (or holds it on dispute) → Optionally, a broker handles the rest of the purchase.

Every step is tracked. Every party is notified. Every naira is protected until the job is done.

**Before you buy — Chekka.**
