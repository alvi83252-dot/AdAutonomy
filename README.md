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

The app runs fully offline with `LLM_PROVIDER=mock` and no API keys.

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
