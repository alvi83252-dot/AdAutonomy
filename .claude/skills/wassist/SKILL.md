---
name: wassist
description: >-
  Build, deploy, and operate WhatsApp AI agents with the Wassist REST API
  (backend.wassist.app). Use this skill whenever the user mentions Wassist,
  wants to create/configure/deploy a WhatsApp agent or bot, send WhatsApp
  messages or templates programmatically, set up WhatsApp webhooks or
  conversation routing, connect a WhatsApp Business Account (WABA), build a
  "Bring Your Own Agent" (BYOA) WhatsApp integration, or call any
  `backend.wassist.app/api/v1` endpoint — even if they don't say the word
  "API". Covers agents, conversations, messages, templates, phone numbers,
  webhooks, contacts, and the WhatsApp Business API proxy.
---

# Wassist API

Wassist turns AI agents into native WhatsApp assistants. This skill is the
working reference for its REST API: authentication, the resource model, and the
request/response shapes for every endpoint, plus copy-paste workflows for the
things people actually do (create an agent, send a message, wire up webhooks).

When a task needs a specific endpoint's full schema, read
[references/api-reference.md](references/api-reference.md) — it is the complete
endpoint catalog. For webhook signature verification and conversation routing,
read [references/webhooks-and-routing.md](references/webhooks-and-routing.md).
For a zero-dependency Python client you can import or run, use
[scripts/wassist_client.py](scripts/wassist_client.py).

## Fundamentals

| Thing | Value |
|---|---|
| Base URL | `https://backend.wassist.app/api/v1/` |
| Auth header | `X-API-Key: <your-api-key>` on **every** request |
| Content type | `application/json` (use `multipart/form-data` for file uploads) |
| Rate limit | 100 requests / minute / key → `429` with `{ "retry_after": 60 }` |
| API keys | Created in the dashboard: **Settings → API Keys** (wassist.app/settings) |

The key is a server-side secret. Never ship it in client-side code, commit it,
or log it. Read it from an env var (e.g. `WASSIST_API_KEY`).

> Auth note: the public docs and every example use the `X-API-Key` header — use
> that. The OpenAPI spec also lists a legacy `Authorization: Token <key>`
> scheme; only fall back to it if `X-API-Key` is rejected.

### Minimal request

```bash
curl -s https://backend.wassist.app/api/v1/agents/ \
  -H "X-API-Key: $WASSIST_API_KEY" \
  -H "Content-Type: application/json"
```

### Pagination

List endpoints return a page envelope. Page with `offset` and `limit`:

```json
{ "count": 42, "next": "...?offset=20", "previous": null, "results": [ ... ] }
```

```
GET /agents/?offset=20&limit=20
```

### Errors

Standard HTTP codes with a JSON body: `{ "error": "...", "code": "..." }`.
`200` ok · `201` created · `204` deleted · `400` validation · `401` bad key ·
`403` forbidden · `404` missing · `429` rate-limited · `500` server.

When integrating into an app that must stay up if Wassist is unreachable, treat
any non-2xx (and network errors) as a soft failure and fall back to a local
default rather than throwing — a missing/blocked key should degrade, not crash.

## The resource model

```
WhatsApp Business Account (WABA)
└── Phone Number ─ default routing → Agent | Webhook | (none)
        └── Conversation (one per contact) → Messages
Agent
├── systemPrompt, firstMessage, icebreakers, profilePicture, llmModel
├── tools / websiteTools / imageGenerateTools / handoffTools / mcpConfigs
├── documents (knowledge base) · memoryKeys · wakeUpConfigs · outboundTriggers
└── paywallConfig · creditSettings · adConfig · voiceCallConfig
Template (whatsapp-templates) → published to one or more WABAs
Webhook (created in dashboard) → signed deliveries of events
```

An **Agent** holds personality + capabilities. A **Phone Number** routes
inbound messages to an agent, a webhook, or nothing. A **Conversation** is the
running chat with one contact; you read its history and send messages into it.
A **Template** is a pre-approved message required to start/re-open a chat
outside WhatsApp's 24-hour service window.

## Core workflows

### 1. Create and configure an agent

The minimal create takes just a name; everything else is layered on with
`PATCH` (or `PUT`). Tool/config arrays are read-only on the `Agent` response —
you write them through the update body.

```bash
# Create
curl -s -X POST https://backend.wassist.app/api/v1/agents/ \
  -H "X-API-Key: $WASSIST_API_KEY" -H "Content-Type: application/json" \
  -d '{"name": "Coffee Shop Concierge"}'

# Configure (PATCH /agents/{id}/)
curl -s -X PATCH https://backend.wassist.app/api/v1/agents/$ID/ \
  -H "X-API-Key: $WASSIST_API_KEY" -H "Content-Type: application/json" \
  -d '{
    "systemPrompt": "You are a warm concierge for The Daily Grind...",
    "firstMessage": "Hi! ☕ How can I help today?",
    "icebreakers": ["Opening hours?", "Where are you?", "Do you have oat milk?"],
    "llmModel": "openai/gpt-4.1-mini"
  }'
```

To bootstrap an agent from existing content the dashboard exposes "from idea /
website / Shopify" flows; via the SDK these are `client.onboarding.createFrom*`.
The plain REST surface is the create + patch shown above.

**Adding an API tool.** Tools let the agent call your backend. Each parameter's
`input` says where its value comes from at call time — either `description`
(the LLM extracts it from the chat) or `value` (a literal or a built-in
template variable like `%PHONE_NUMBER%`, `%IMAGE_URL%`, `%CALLBACK_URL%`). See
[references/api-reference.md](references/api-reference.md#tools--apischema) for
the full `apiSchema` format and variable list.

```bash
curl -s -X PATCH https://backend.wassist.app/api/v1/agents/$ID/ \
  -H "X-API-Key: $WASSIST_API_KEY" -H "Content-Type: application/json" \
  -d '{
    "tools": [{
      "name": "check_order_status",
      "description": "Look up an order when the customer gives an order number.",
      "active": true, "creditCost": 0,
      "apiSchema": {
        "url": "https://api.yourstore.com/orders/{order_id}",
        "method": "GET",
        "path_params": {},
        "query_params": { "required": [], "properties": {} },
        "request_body": { "type": "object", "required": [], "properties": {} }
      }
    }]
  }'
```

### 2. Deploy an agent to a number

```bash
curl -s -X POST https://backend.wassist.app/api/v1/whatsapp-accounts/$WABA/deploy-agent/ \
  -H "X-API-Key: $WASSIST_API_KEY" -H "Content-Type: application/json" \
  -d '{"agentId": "'$ID'", "phoneNumberId": "'$PHONE_UUID'"}'
```

Or set the number's default routing to this agent (and drop any webhook):
`POST /phone-numbers/{number}/connect-agent/` with
`{"agentId": "...", "applyToExisting": true}`. Each number runs one agent.

### 3. Send a message

You send into an existing conversation: `POST /conversations/{id}/messages/`.
The body is tagged by `type`: `unified` (rich: text + media + buttons — prefer
this), `template`, `text`, or `cta` (the last two are deprecated).

> You can only send a *non-template* message while the conversation is **active**
> (inside the 24-hour service window). Check status with `GET /conversations/{id}/`
> first. Outside the window, you must send a pre-approved **template**.

```bash
# Rich "unified" message
curl -s -X POST https://backend.wassist.app/api/v1/conversations/$CONV/messages/ \
  -H "X-API-Key: $WASSIST_API_KEY" -H "Content-Type: application/json" \
  -d '{
    "type": "unified",
    "unified": {
      "text": "Your order shipped! 📦",
      "footer": "The Daily Grind",
      "media": { "url": "https://example.com/receipt.png" },
      "buttons": [
        { "type": "quick_reply", "text": "Track it", "quickReplyId": "track" },
        { "type": "url", "text": "Shop again", "url": "https://shop.example.com" }
      ]
    }
  }'
```

Rules: ≤ 3 buttons, all the same type (URL and quick-reply can't mix); text
≤ 1024 chars; media must be a public HTTPS URL.

```bash
# Template message (works outside the 24h window; billed by Meta)
curl -s -X POST https://backend.wassist.app/api/v1/conversations/$CONV/send-template/ \
  -H "X-API-Key: $WASSIST_API_KEY" -H "Content-Type: application/json" \
  -d '{"templateName": "order_update", "variables": {"body": ["12345", "Friday"]}}'
```

Other conversation actions: `POST .../read/` (blue ticks), `POST .../typing/`
(typing indicator), `POST .../prompt/` with `{"prompt": "..."}` (nudge the
agent with a custom instruction), `POST .../takeover/` and `.../handback/`
(human takeover). Full list in the reference.

### 4. Bring Your Own Agent (BYOA)

Run your own AI; let Wassist handle WhatsApp. Create a passthrough agent that
forwards every inbound message to your webhook:

```bash
curl -s -X POST https://backend.wassist.app/api/v1/agents/byoa/ \
  -H "X-API-Key: $WASSIST_API_KEY" -H "Content-Type: application/json" \
  -d '{"webhookUrl": "https://your-server.com/webhook"}'
```

Your endpoint receives `{ message, image, phone_number, reply_callback }`.
Reply synchronously with `{ "content": "..." }`, or POST more messages to the
one-time `reply_callback` URL (valid 24h) for follow-ups. Respond within ~5s.
Details and a Flask example are in
[references/webhooks-and-routing.md](references/webhooks-and-routing.md#bring-your-own-agent-byoa).

### 5. Webhooks & routing

Webhooks deliver signed, retried, idempotent events (`message.received`,
`subscription.*`). **Webhooks are created in the dashboard, not the API** — the
API only points conversations/numbers at existing webhooks. Always verify the
`X-Wassist-Signature` HMAC and dedupe on `X-Wassist-Delivery`. Routing resolves
per-conversation override → number default → none. The full event catalog,
signature-verification code (Node/Python/Go), and the routing precedence rules
live in
[references/webhooks-and-routing.md](references/webhooks-and-routing.md).

### 6. Connect a WhatsApp Business Account

For production numbers, create a link session and redirect the user through
Meta's signup: `POST /whatsapp-link-sessions/` with `{successUrl, returnUrl}`
returns a `linkUrl`; poll `GET /whatsapp-link-sessions/{id}/` until
`status === "SUCCESS"`. Then add numbers (`/whatsapp-accounts/{id}/add-number/`),
list them, and deploy.

## Helper script

[scripts/wassist_client.py](scripts/wassist_client.py) is a dependency-free
(`urllib` only) client. Reads `WASSIST_API_KEY` from the environment.

```bash
export WASSIST_API_KEY=sk_...
python scripts/wassist_client.py agents list
python scripts/wassist_client.py agents create --name "My Agent"
python scripts/wassist_client.py conversations send $CONV --text "Hello!"
python scripts/wassist_client.py raw GET /whatsapp-accounts/
```

```python
from wassist_client import WassistClient
wa = WassistClient()                       # or WassistClient(api_key=...)
agent = wa.create_agent(name="My Agent")
wa.send_unified(conversation_id, text="Hi!", buttons=[
    {"type": "quick_reply", "text": "Yes", "quickReplyId": "yes"},
])
```

## The WhatsApp Business API proxy

`/whatsapp-accounts/{id}/proxy/{path}` forwards any method straight to Meta's
Graph API, authenticated as your WABA — use it for native Business-API features
(e.g. listing Meta-side templates: `GET .../proxy/{waba_id}/message_templates`).
The `{path}` is everything after the Graph version. See the reference.

## Endpoint map (read the reference for schemas)

- **Agents** `/agents/` · `/agents/{id}/` · `/byoa/` · `/{id}/deploy/` ·
  `/{id}/share/` · `/{id}/unshare/` · `/{id}/duplicate/`
- **Conversations** `/conversations/` · `/{id}/` · `/{id}/messages/` ·
  `/{id}/send-template/` · `/{id}/prompt/` · `/{id}/read/` · `/{id}/typing/` ·
  `/{id}/subscribe/` · `/{id}/unsubscribe/` · `/{id}/takeover/` · `/{id}/handback/`
- **Phone numbers** `/phone-numbers/` · `/{number}/` · `/{number}/connect-agent/` ·
  `/{number}/subscribe/` · `/{number}/unsubscribe/` · `/{number}/business-profile/` ·
  `/{number}/icebreakers/` · `/{number}/display-name/` · `/{number}/blacklist/`
- **WhatsApp accounts** `/whatsapp-accounts/` · `/{id}/` · `/{id}/add-number/` ·
  `/{id}/deploy-agent/` · `/{id}/phone-numbers/` · `/{id}/proxy/{path}` ·
  `/available-numbers/`
- **Templates** `/whatsapp-templates/` · `/{id}/` · `/{id}/publish/` ·
  `/{id}/unpublish/` · `/{id}/sync/` · `/import/`
- **Linking** `/whatsapp-link-sessions/` · `/{id}/` · `/{id}/confirm/` · `/{id}/expire/`
- **Webhooks** `/webhooks/` · `/{id}/test/` · `/{id}/rotate-secret/` ·
  `/webhook-deliveries/` · `/{id}/replay/`
- **Contacts** `/contacts/` · `/contacts/bulk/`
- **Integrations** `/integrations/connectors/` (MCP) · `/integrations/elevenlabs/` (voice)
- **Other** `/simulations/`, `/test-personas/`, `/test-runs/`, `/api-keys/`

## CLI

There is also an official terminal CLI (`npm i -g @wassist/cli`, Node 22+) for
interactive testing: `wassist login`, `wassist messages send`,
`wassist messages listen` (live WebSocket stream). Useful for manual testing;
the REST API above is what you build against.
