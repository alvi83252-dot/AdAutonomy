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
| `WASSIST_API_KEY` | Wassist key for the live WhatsApp feedback line (optional) | — |
| `WASSIST_FEEDBACK_ENABLED` | Toggle the Wassist integration | `true` |

The app runs fully offline with `LLM_PROVIDER=mock` and no API keys.

## Connect to WhatsApp (Wassist)

The **FeedbackAgent** can collect customer feedback on a real WhatsApp line,
powered by [Wassist](https://wassist.app). This is **optional** — with no key
the agent uses deterministic mock feedback and nothing breaks.

When `WASSIST_API_KEY` is set, the FeedbackAgent (pipeline step 6) automatically
provisions a WhatsApp agent for the campaign and returns a click-to-chat link.

### Setup

1. Create a key at [wassist.app](https://wassist.app) → **Settings → API Keys**.
2. Add it to `.env.local` (gitignored — never commit it):

   ```bash
   WASSIST_API_KEY=your-key-here
   # WASSIST_API_BASE defaults to https://backend.wassist.app/api/v1
   ```

3. Run a campaign. The FeedbackAgent creates a WhatsApp feedback agent and
   surfaces a `connectUrl` at the top of the **Customer Feedback (Wassist)**
   card on the `/investor` page, e.g.
   `https://wa.me/447424845871?text=/connect:<agentId>`.
4. **Open that link on your phone** (or message the shown sandbox number). Your
   first message opens WhatsApp's 24-hour service window — required before the
   business can reply or send messages.

### How it behaves

- **Offline-first.** No key, a blocked key, a non-2xx response, or a network
  timeout all degrade to local mock feedback — the pipeline still reaches
  `deployed`. The key is **server-only** (never exposed with a `NEXT_PUBLIC_`
  prefix).
- **Sandbox by default.** The `connectUrl` deep-links to Wassist's shared
  sandbox number. To message real customers, connect your own WhatsApp Business
  Account (WABA) and deploy the agent to your number
  (`POST /whatsapp-accounts/{id}/deploy-agent/`).
- **Sending a message via the API** requires an *active* conversation (the
  contact must message first); outside the 24-hour window, send a pre-approved
  template instead.

### Reference

Full Wassist API docs (auth, agents, conversations, messages, templates,
webhooks, routing) and a zero-dependency client live in the bundled skill at
[`.claude/skills/wassist/`](.claude/skills/wassist/SKILL.md). The integration
code is in [`lib/wassist/client.ts`](lib/wassist/client.ts) and
[`lib/agents/feedbackAgent.ts`](lib/agents/feedbackAgent.ts).

## Architecture

```
/lib/agents/     — 10 specialized AI agents
/lib/orchestrator.ts — CEO pipeline coordinator
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
