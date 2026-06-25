# Webhooks, routing & BYOA

Three closely related topics: receiving signed webhook events, deciding what
happens to an inbound message (routing), and running your own agent (BYOA).

## Table of contents

- [Webhook delivery model](#webhook-delivery-model)
- [Verifying signatures](#verifying-signatures)
- [Event catalog](#event-catalog)
- [Conversation routing](#conversation-routing)
- [Bring Your Own Agent (BYOA)](#bring-your-own-agent-byoa)

---

## Webhook delivery model

Webhooks are **created in the dashboard** (wassist.app/developers/webhooks) —
copy the signing secret there. The API can list/manage them and point
conversations at them, but the canonical creation flow is the dashboard.

Each delivery:

1. The event is written to an outbox as a `WebhookDelivery` with a stable UUID.
2. A worker POSTs the JSON body to your URL.
3. The attempt (status code, duration, response body) is recorded.
4. On `5xx`/network error, retried up to **3 times** with backoff (10s, 30s, 90s).
5. After **20 consecutive failures** the webhook auto-disables (dashboard banner).

Respond `2xx` within ~10s and do real work asynchronously; slow responses are
treated as failures and retried.

### Headers on every delivery

| Header | Purpose |
|---|---|
| `Content-Type` | always `application/json` |
| `User-Agent` | `Wassist-Webhook/1.0` |
| `X-Wassist-Event` | event name, e.g. `message.received` |
| `X-Wassist-Delivery` | stable UUID — **use as idempotency key**; constant across retries |
| `X-Wassist-Timestamp` | unix seconds when signed |
| `X-Wassist-Signature` | `t=<ts>,v1=<hex hmac sha256>` (Stripe-style) |

---

## Verifying signatures

Compute `HMAC-SHA256` over the string `<timestamp>.<raw body>` using the
webhook's signing secret, and compare in constant time to the `v1` component.
**Verify against the raw request body**, before any JSON parsing/re-encoding.

```ts
// Node.js / Express
import crypto from "node:crypto";

app.post("/webhooks/wassist", express.raw({ type: "application/json" }), (req, res) => {
  const header = req.header("x-wassist-signature") ?? "";
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=")));
  const signedPayload = `${parts.t}.${req.body.toString("utf-8")}`;
  const expected = crypto
    .createHmac("sha256", process.env.WASSIST_WEBHOOK_SECRET!)
    .update(signedPayload)
    .digest("hex");

  const ok = crypto.timingSafeEqual(Buffer.from(parts.v1, "hex"), Buffer.from(expected, "hex"));
  if (!ok) return res.status(400).send("bad signature");

  // Replay protection: reject events older than 5 minutes.
  if (Math.abs(Date.now() / 1000 - Number(parts.t)) > 300) return res.status(400).send("stale");

  // Idempotency: drop duplicate deliveries.
  const deliveryId = req.header("x-wassist-delivery")!;
  if (await alreadyProcessed(deliveryId)) return res.status(200).send("ok");

  await handle(JSON.parse(req.body.toString("utf-8")));
  await markProcessed(deliveryId);
  res.status(200).send("ok");
});
```

```python
# Python
import hmac, hashlib, time

def verify(request, secret: str) -> bool:
    header = request.headers.get("X-Wassist-Signature", "")
    parts = dict(p.split("=", 1) for p in header.split(","))
    ts, received = parts.get("t", ""), parts.get("v1", "")
    signed = f"{ts}.".encode() + request.body          # request.body = raw bytes
    expected = hmac.new(secret.encode(), signed, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(received, expected):
        return False
    return abs(time.time() - int(ts)) <= 300
```

```go
// Go
func verify(r *http.Request, secret string) bool {
    body, _ := io.ReadAll(r.Body)
    header := r.Header.Get("X-Wassist-Signature")
    var ts, sig string
    for _, p := range strings.Split(header, ",") {
        if kv := strings.SplitN(p, "=", 2); len(kv) == 2 {
            if kv[0] == "t" { ts = kv[1] }
            if kv[0] == "v1" { sig = kv[1] }
        }
    }
    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write([]byte(ts + "."))
    mac.Write(body)
    expected := hex.EncodeToString(mac.Sum(nil))
    if !hmac.Equal([]byte(sig), []byte(expected)) { return false }
    epoch, _ := strconv.ParseInt(ts, 10, 64)
    return time.Now().Unix()-epoch <= 300
}
```

Best practices: store `X-Wassist-Delivery` and reject duplicates; reject events
where the timestamp is > 5 min old; rotate the secret from the dashboard
(`POST /webhooks/{id}/rotate-secret/` — old secret stops immediately); locally,
use the CLI `wassist messages listen` to tunnel real events to localhost.

---

## Event catalog

### `message.received`
Fired when a contact messages one of your numbers (fan-out to all subscribed webhooks).
```json
{
  "event": "message.received",
  "timestamp": "2026-06-23T16:48:00.000Z",
  "phoneNumber": "+447700900100",
  "from": "+447700900200",
  "contact": { "name": "Alex", "phoneNumber": "+447700900200" },
  "message": { "id": "01HXYZ...", "waId": "wamid.HBgL...", "body": "Hi", "media": [], "buttons": [] },
  "conversationId": "5a3f...e2"
}
```

### `subscription.*` (per-conversation webhook routing)
Same envelope plus `routing` and `webhookId`. For `subscription.message.received`
the `message` field is populated; for lifecycle events it is `null`.
```json
{
  "event": "subscription.message.received",
  "timestamp": "2026-06-23T16:48:00.000Z",
  "phoneNumber": "+447700900100", "from": "+447700900200",
  "contact": { "name": "Alex", "phoneNumber": "+447700900200" },
  "message": { "...": "same shape as message.received" },
  "conversationId": "5a3f...e2",
  "routing": "webhook", "webhookId": "9c1c...a0"
}
```

Lifecycle: `subscription.activated`, `subscription.revoked`,
`subscription.service_window.expiring` (~1h before the 24h window closes, once
per window), `subscription.service_window.closed`.

### `test.ping`
Sent by the dashboard "Send test event" button (or `POST /webhooks/{id}/test/`).
Same envelope, stub payload — use it to validate signature verification in CI.

---

## Conversation routing

Every number has a **default routing mode**; every conversation can override it.
The resolved mode (the *effective routing*) decides what happens on inbound.

| Mode | On inbound | Use when |
|---|---|---|
| `agent` | The connected agent replies | Number wired to an agent (the default) |
| `webhook` | Forward to one webhook; the agent pipeline is **skipped** | You handle replies in your own service |
| `null` | Message is stored, nothing else | Pause without disconnecting agent/webhook |
| `sandbox` | Internal shared-test-number flow | System-managed only; cannot be set via API |

> "No routing" is `null` on the wire — there is no `"none"` string. Setting
> `mode: "sandbox"` (or any routing change on a sandbox number) returns `400`.

### Resolution order
1. If the number is a sandbox number → `sandbox`, full stop.
2. Else if the conversation has a non-null `routing` → use it.
3. Else fall back to the number's `defaultRouting` (which may itself be `null`).

The same precedence applies to the webhook: `conversation.webhookOverride` wins
over `whatsappNumber.defaultWebhook`.

### Who fires lifecycle events

| Transition | Event(s) |
|---|---|
| not-webhook → webhook W | `subscription.activated` on W |
| webhook W → not-webhook | `subscription.revoked` on W |
| webhook W1 → webhook W2 | `subscription.revoked` on W1, `subscription.activated` on W2 |
| same → same | none |

Triggered only by the **per-conversation** endpoints:
`POST /conversations/{id}/subscribe/` and `/unsubscribe/`.
**Number-level** changes (`/phone-numbers/{n}/subscribe`, `/connect-agent`,
`/unsubscribe`) do **not** fire lifecycle events, even with
`applyToExisting: true` — they are bulk admin actions. If your service needs to
know about every conversation, subscribe to each one individually.

When a conversation is in `webhook` mode, `subscription.message.received` goes
**only** to the assigned webhook (no fan-out) and the agent is skipped — but the
legacy `message.received` still fans out to every webhook subscribed to it.

### Setting routing

```ts
import { WassistClient } from "@wassist/sdk";
const client = new WassistClient({ apiKey: process.env.WASSIST_API_KEY! });

// Per-conversation
await client.conversations.subscribe(conversationId, { webhookId });   // → webhook
await client.conversations.unsubscribe(conversationId);                // → number default

// Number-wide (atomically sets the mode and clears the unrelated FK)
await client.phoneNumbers.subscribe("447700900100",   { webhookId, applyToExisting: true });
await client.phoneNumbers.connectAgent("447700900100", { agentId,  applyToExisting: true });
await client.phoneNumbers.unsubscribe("447700900100",  { applyToExisting: true });
```

Validation: `webhookId` is required iff `mode === 'webhook'` and must reference a
webhook you own; `mode='sandbox'` is rejected everywhere; any routing change on a
sandbox number is rejected. **Webhooks must already exist (dashboard-created).**

---

## Bring Your Own Agent (BYOA)

Run your own AI; Wassist manages WhatsApp (typing indicators, read receipts,
media hosting, delivery status, rate limits, retries, the 24h window).

### 1. Create a passthrough agent
```bash
curl -X POST https://backend.wassist.app/api/v1/agents/byoa/ \
  -H "X-API-Key: $WASSIST_API_KEY" -H "Content-Type: application/json" \
  -d '{"webhookUrl": "https://your-server.com/webhook"}'
```
The response includes `connectUrl` — open it to test against the Wassist sandbox.

### 2. Receive each inbound message
Your webhook gets a POST:
```json
{
  "message": "Hello, I need help with my order",
  "image": "https://media.wassist.app/...",   // null if no image
  "phone_number": "+1234567890",
  "reply_callback": "https://wassist.app/api/callback/xyz789"
}
```

### 3. Respond — two options
- **Synchronously**, return the reply as the webhook response body. Any JSON
  works; the simplest is `{ "content": "..." }`. Wassist delivers it to WhatsApp.
  To deliberately not reply, return `{ "content": "No CUSTOMER message reply" }`.
- **Later**, POST to the one-time `reply_callback` URL (valid 24h) — good when
  processing is slow. Send an interim message synchronously to keep the contact
  engaged, then push more via the callback.

```bash
curl -X POST "https://wassist.app/api/callback/xyz789" \
  -H "Content-Type: application/json" \
  -d '{"content": "Found order #12345 — it shipped yesterday."}'
```

Aim to respond within ~5s. Rich content (image/video/audio/document/contact/
location) is auto-formatted for WhatsApp when you return the appropriate URL or
fields. Pull full history any time via `GET /conversations/{id}/messages/`.

### Minimal Flask handler
```python
from flask import Flask, request, jsonify
from your_agent import process_message

app = Flask(__name__)

@app.route("/webhook", methods=["POST"])
def handle_webhook():
    data = request.json
    reply = process_message(message=data["message"], customer=data["phone_number"])
    return jsonify({"content": reply})

if __name__ == "__main__":
    app.run(port=8000)
```
