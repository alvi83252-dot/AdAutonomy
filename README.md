# AdAutonomy

**A self-running advertising company powered entirely by AI agents.**

Built for the Cursor Hands Off London Hackathon.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## What It Does

Provide a product name, target market, and campaign goal — AdAutonomy autonomously:

1. Extracts a structured campaign brief (BriefingAgent)
2. Generates ad copy + creative assets (CreativeAgent)
3. Selects audiences + channels (AudienceAgent)
4. Simulates campaign performance (SimulationAgent)
5. Runs safety/compliance checks (SafetyAgent)
6. Simulates customer feedback (FeedbackAgent)
7. Processes financial flows via PayPal Sandbox (PaymentAgent)
8. Produces investor-ready summary (InvestorAgent)
9. Exports campaign timeline (.ics) + printable pack (DeploymentAgent)

## Environment Setup

```bash
cp .env.example .env.local
```

Key variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `LLM_PROVIDER` | `mock` (offline) or `openai` | `mock` |
| `OPENAI_API_KEY` | OpenAI API key (optional) | — |
| `DEMO_MODE` | Auto-approve agent actions | `true` |
| `PAYPAL_CLIENT_ID` | PayPal Sandbox client ID | — |
| `PAYPAL_CLIENT_SECRET` | PayPal Sandbox secret | — |
| `USE_SQLITE_FALLBACK` | File-based storage fallback | `true` |
| `MODAL_SIMULATION_URL` | Deployed Modal web function URL | local fallback |
| `SEAPOINT_WEBHOOK_URL` | Optional authorized finance snapshot webhook | local controls |
| `MANUS_API_KEY` | Official Manus API v2 key | local supervisor |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | — |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable (anon) key | — |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase secret (server) key | — |

### Supabase

1. Copy credentials into `.env.local` (see `.env.example`).
2. In the [Supabase SQL Editor](https://supabase.com/dashboard), run `supabase/schema.sql` to create tables.
3. Campaigns sync to Supabase on save; `data/` JSON files remain the offline fallback.

**Two ways to connect to the same database:**

| Method | Env var | Used for |
|--------|---------|----------|
| Supabase API | `NEXT_PUBLIC_SUPABASE_URL` + keys | Your Next.js app (`@supabase/supabase-js`) |
| Direct Postgres | `DATABASE_URL` | `psql`, DBeaver, Prisma/Drizzle migrations, raw SQL |

Both point at the same PostgreSQL database Supabase hosts for you.

Install Supabase agent skills (optional, for Cursor):

```bash
npx skills add supabase/agent-skills
```


## Modal Serverless Simulation

The SimulationAgent can run its Monte Carlo campaign forecast on Modal. If Modal is
not configured or cannot be reached, the same workflow automatically uses the
deterministic local compute fallback.

1. Install and authenticate the Modal CLI:

```bash
python -m pip install -r modal/requirements.txt
modal setup
```

2. Deploy the web function:

```bash
npm run modal:deploy
```

3. Copy the generated endpoint URL into `.env.local`:

```bash
MODAL_SIMULATION_ENABLED=true
MODAL_SIMULATION_URL=https://your-workspace--adautonomy-simulation-simulate.modal.run
MODAL_SIMULATION_RUNS=5000
```

For live development, use `npm run modal:serve`. Optional Modal proxy tokens are
supported with `MODAL_PROXY_KEY` and `MODAL_PROXY_SECRET`; they are only sent from
the Next.js server and are never exposed to the browser.

The Simulation page displays `Modal serverless` when the remote job succeeds and
`Local fallback` when offline operation is used.

## Seapoint Financial Control

PaymentAgent now applies a Seapoint-inspired finance layer to every campaign:

- consolidated cash, monthly burn, and runway reporting
- AI-style bookkeeping categorisation
- invoice capture and approval thresholds
- projected campaign cash flow
- finance data passed into InvestorAgent and the campaign export pack

These capabilities follow Seapoint's publicly documented product surface. Seapoint
does not currently publish a public developer API, so AdAutonomy does not invent
one. The complete workflow runs locally by default.

If you have an authorized private endpoint or automation bridge, configure:

```bash
SEAPOINT_WORKFLOW_ENABLED=true
SEAPOINT_WEBHOOK_URL=https://your-authorized-endpoint.example/finance
SEAPOINT_WEBHOOK_TOKEN=your-secret
```

AdAutonomy sends an `adautonomy.finance_snapshot.created` JSON event and falls back
to local controls if delivery fails. View the results at `/finance`.

## Manus Multi-Agent Orchestration

The CEO Orchestrator can use the official Manus API v2 to create a private,
asynchronous supervisory task before the specialist-agent pipeline begins.
Manus returns structured JSON containing:

- campaign execution strategy
- delegation objectives and priorities
- validation criteria for every agent
- risk and approval checkpoints

AdAutonomy validates this plan against its allow-listed pipeline before execution.
Manus cannot add, remove, or reorder agents, and a task that requests confirmation
or an external action is rejected in favor of the local supervisor fallback.

Create an API key in the
[Manus integration settings](https://manus.im/app/settings/integrations), then set:

```bash
MANUS_ORCHESTRATION_ENABLED=true
MANUS_API_KEY=your-api-key
MANUS_AGENT_PROFILE=manus-1.6-lite
```

Optional settings include `MANUS_PROJECT_ID`, `MANUS_TASK_TIMEOUT_MS`, and
`MANUS_POLL_INTERVAL_MS`. The API key is used only by the Next.js server. View the
resulting plan and private Manus task link at `/orchestration`.

## Architecture

```
/lib/agents/     — 10 specialized AI agents
/lib/orchestrator.ts — CEO pipeline coordinator
/lib/modal/      — Modal client, validation, and local compute fallback
/modal/app.py    — deployable Modal web function
/lib/seapoint/   — cash flow, bookkeeping, invoices, and webhook bridge
/lib/manus/      — official Manus v2 task client and validated supervisor
/eve/            — Vercel Eve agent structure
/data/           — Agent logs, state, campaigns
/app/            — Next.js 14 App Router pages
```

### Agents

| Agent | Role |
|-------|------|
| BriefingAgent | Project Manager |
| CreativeAgent | Design Team |
| AudienceAgent | Marketing Team |
| SimulationAgent | Data Analyst |
| SafetyAgent | Compliance Officer |
| FeedbackAgent | Customer Support |
| InvestorAgent | Finance Team |
| PaymentAgent | Finance Ops |
| DeploymentAgent | Operations |
| Orchestrator | CEO |

## Docker

```bash
docker-compose up --build
```

## Sponsor Integrations

Cursor · OpenAI · Supabase · Modal · Seapoint · Manus AI · Elyos AI · Wassist · Seedcamp · Blue Wire Capital · IO · Dragonfly · 10 Downing Street · CodeWall · PayPal Sandbox · Halkin Offices

## License

MIT
