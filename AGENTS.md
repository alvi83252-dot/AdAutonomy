# AdAutonomy — Agent & Build Specification (Single Source of Truth)

Canonical specification for **all** coding agents working in this repo:
**Cursor · Codex · Claude Code · OpenCode.**

Read this file before editing anything. It is the shared contract.
`CLAUDE.md`, `opencode.json`, and `.cursor/rules/adautonomy.mdc` all point here so
every tool reads the same spec with no drift.

> Project: AdAutonomy — a self-running advertising company powered entirely by AI
> agents. Built for the Cursor Hands Off London Hackathon.

---

## 0. Mission & non-negotiables

- AdAutonomy autonomously turns a `{ productName, targetMarket, campaignGoal }` brief
  into a full ad campaign: creative → audience → simulation → safety → feedback →
  payments → investor summary → deployment exports.
- **MUST run fully offline.** `npm run dev` works with **no `.env`, no API keys, no
  internet.** No paid APIs may become a hard dependency.
- Defaults are offline-first: `LLM_PROVIDER=mock`, `DEMO_MODE=true`,
  `USE_SQLITE_FALLBACK=true`.
- **Every external call (OpenAI, PayPal, Supabase) MUST degrade to a deterministic
  local fallback.** A missing key must never break the demo.
- Single command to run (`npm run dev`). `npm run build` MUST also pass offline.

---

## 1. Tech stack (pinned — do not bump majors without sign-off)

Next.js 14.2.x (App Router) · TypeScript 5.7 (strict) · Tailwind CSS 3.4 + shadcn/ui ·
Framer Motion 11 · next-themes · Supabase JS (optional) · Node 20 · Docker multi-stage.

---

## 2. Repo map

```
app/              Next.js routes + /api endpoints (route handlers)
components/       UI — shadcn/ui primitives in components/ui, animated comps above
lib/agents/       10 agents + messaging.ts + consensus.ts + index.ts
lib/llm/          provider.ts (router) + mockProvider.ts (deterministic offline templates)
lib/storage/      db.ts — JSON files in /data, optional Supabase init
lib/calendar/     icsGenerator.ts (.ics export)
lib/pdf/          exportPack.ts (printable campaign pack)
lib/video/        AI video-ad generation (bonus module)
lib/social/       social platform helpers (bonus module)
lib/orchestrator.ts  CEO: createCampaign + runPipeline
lib/pipeline.ts      PIPELINE_STEPS — the ONLY place step order is defined
lib/types.ts         canonical data model — import from @/lib/types, never redefine
eve/              Vercel Eve structure (representational, offline)
data/             runtime: campaigns.json, agent_log.json, agent_state.json (gitignored)
```

---

## 3. Commands

| Purpose | Command |
|---|---|
| Dev (offline) | `npm run dev` |
| Build (must pass offline) | `npm run build` |
| Lint | `npm run lint` |
| Typecheck *(add: `tsc --noEmit`)* | `npm run typecheck` |
| Docker | `docker-compose up --build` |

---

## 4. Environment contract

- Source of truth: `.env.example`. Copy to `.env.local` (dev) or `.env` (prod/docker).
- **Required to run: NONE.** Every variable is optional with a safe default in code.
- Adding a new env var ⇒ document it in `.env.example` in the same change.
- Secrets are server-only. **Never** put a secret behind a `NEXT_PUBLIC_` prefix.

---

## 5. Data model

`lib/types.ts` is the canonical schema. Always `import type { … } from '@/lib/types'` —
never redefine these shapes inline. Persisted campaign state = `CampaignState`.

---

## 6. Agent roster & contracts

Every agent is `async (campaign: CampaignState) => Promise<CampaignState>` and MUST:

1. Wrap LLM work in `withRetry(fn, fallback, name)` (`lib/agents/consensus.ts`).
2. On failure: **retry once → deterministic template fallback → continue** with reduced
   confidence. Never throw out of the pipeline for a recoverable error.
3. Log activity via `sendMessage()` (`lib/agents/messaging.ts`).
4. Persist a memory note via `updateAgentMemory()` (`lib/storage/db.ts`).
5. Return a **new** state (immutable update) with `currentStep` advanced.

| Agent | Company role | Reads | Writes |
|-------|--------------|-------|--------|
| BriefingAgent | Project Manager | brief | extractedBrief |
| CreativeAgent | Design Team | brief | creatives[] |
| AudienceAgent | Marketing Team | brief | audiences[] |
| SimulationAgent | Data Analyst | creatives, audiences | simulation |
| SafetyAgent | Compliance Officer | creatives | safetyFlags[] (+ veto on critical) |
| FeedbackAgent | Customer Support | creatives | feedback[] |
| PaymentAgent | Finance Ops | budget | payments[] (PayPal sandbox) |
| InvestorAgent | Finance Team | all | investorSummary |
| DeploymentAgent | Operations | all | .ics + printable pack |
| Orchestrator | CEO | all | runs pipeline, consensus, final approval |

Bonus modules (VideoAgent, SocialMediaAgent, Assistant) follow the same contract.

---

## 7. Orchestration protocol

- **Step order lives ONLY in `lib/pipeline.ts` (`PIPELINE_STEPS`).** Keep
  `STEP_RUNNERS` in `lib/orchestrator.ts` index-aligned with it. Changing one without
  the other is a bug.
- **Messaging:** `sendMessage` / `receiveMessages` → `data/agent_log.json`.
- **Consensus** (`lib/agents/consensus.ts`): **≥3 approvals OR 1 veto.** SafetyAgent
  emits a veto `ApprovalVote` when an unresolved high/critical flag exists.
- **DEMO_MODE=true** ⇒ auto-approve, but **still log every message and vote.**
- **Escalation targets:** risk → SafetyAgent · missing info → BriefingAgent ·
  critical failure → Orchestrator.

---

## 8. Offline & fault tolerance (acceptance-critical)

- With **no `.env` at all**, `npm run dev` plus a full campaign run MUST complete and
  reach `status === 'deployed'`. **This is the demo. Protect it.**
- `parseJSON` failures are caught by `withRetry`; fallbacks return valid typed data.

---

## 9. PayPal sandbox contract

- PaymentAgent uses PayPal **sandbox** REST (orders create/capture) when
  `PAYPAL_CLIENT_ID` + `PAYPAL_CLIENT_SECRET` are present; otherwise returns a mock
  `PaymentRecord`.
- IDs prefixed `mock-` are local simulations.
- **Never** call live (non-sandbox) PayPal. **Never** log credentials.

---

## 10. UI standards (Fable-5 level)

- Framer Motion for cinematic transitions; glassmorphism; dark/light via `next-themes`.
- **MUST respect `prefers-reduced-motion`** — gate heavy animation behind it.
- Keep shadcn/ui primitives in `components/ui` structurally intact; compose above them.
- The `impeccable` design hook runs on UI edits — address its findings before "done".

---

## 11. Sponsor → module map (judging)

Cursor = this repo · OpenAI = `lib/llm` · Supabase = `lib/storage` · Modal / Seapoint /
Manus / Elyos / Wassist / Seedcamp / Blue Wire / IO / Dragonfly = simulated via env
flags + agent roles · PayPal = `paymentAgent` · 10 Downing Street = SafetyAgent ethics ·
CodeWall = this spec + lint/typecheck · Halkin Offices = footer credit.

---

## 12. Conventions

- TS strict; no `any` in new code.
- Immutable state updates; never mutate `CampaignState` in place.
- Path alias `@/*`; named exports; server-only secrets.

---

## 13. Definition of Done

- [ ] `npm run build` passes offline
- [ ] `npm run typecheck` clean
- [ ] full campaign reaches `'deployed'` with the mock provider and **no keys**
- [ ] any new env var documented in `.env.example`
- [ ] no secrets committed
- [ ] `prefers-reduced-motion` respected for new animation
- [ ] new/changed agent has retry + fallback + log + memory

---

## 14. Do NOT

- Add a required paid API or a hard internet dependency.
- Break the single-command run or commit real secrets.
- Hand-edit `data/*.json` runtime files.
- Let `PIPELINE_STEPS` and `STEP_RUNNERS` diverge in order.
