# Wassist API — complete endpoint reference

Base URL `https://backend.wassist.app/api/v1/` · header `X-API-Key: <key>` on
every request · JSON in/out · pagination via `offset`/`limit` returning
`{count, next, previous, results}`.

A field marked `*` is required. Read-only fields are returned by the API but
ignored (or rejected) on write — write nested config through the dedicated
update bodies, not the read shape.

## Table of contents

- [Agents](#agents)
- [Tools & apiSchema](#tools--apischema)
- [Conversations](#conversations)
- [Messages](#messages)
- [Phone numbers](#phone-numbers)
- [WhatsApp accounts & Business-API proxy](#whatsapp-accounts--business-api-proxy)
- [WhatsApp templates](#whatsapp-templates)
- [Account link sessions](#account-link-sessions)
- [Webhooks](#webhooks)
- [Contacts](#contacts)
- [Integrations (MCP connectors, ElevenLabs)](#integrations)
- [Testing (simulations, personas, runs)](#testing)
- [Enums](#enums)

---

## Agents

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/agents/` | — | List agents (paginated) |
| POST | `/agents/` | `CreateAgentInput` | Create — only `name*` required |
| POST | `/agents/byoa/` | `CreateBYOAAgentInput` | Bring-Your-Own-Agent passthrough |
| GET | `/agents/{id}/` | — | Retrieve full agent |
| PUT | `/agents/{id}/` | `UpdateAgentInput` | Full update incl. sub-resources |
| PATCH | `/agents/{id}/` | `UpdateAgentInput` (partial) | Partial update |
| DELETE | `/agents/{id}/` | — | Soft delete → `204` |
| POST | `/agents/{id}/duplicate/` | — | Clone the agent |
| POST | `/agents/{id}/deploy/` | — | Deploy to a number |
| POST | `/agents/{id}/share/` | `ShareAgentInput` | Share with another user |
| POST | `/agents/{id}/unshare/` | `ShareAgentInput` | Revoke a share |

**CreateAgentInput** — `{ "name*": string }`

**CreateBYOAAgentInput** — `{ "webhookUrl*": string }`

**ShareAgentInput** — `{ "userPhoneNumber*": string }`

**UpdateAgentInput** (all optional) — write these to configure an agent:
```
name, description, systemPrompt, firstMessage, profilePicture, icebreakers,
llmModel,                  # see LlmModelEnum
tools[],                   # AgentToolInput
websiteTools[],            # AgentWebsiteToolInput
imageGenerateTools[],      # AgentImageGenerateToolInput
handoffTools[],            # AgentHandoffToolInput
mcpConfigs[],              # AgentMcpConfigInput
documents[],               # AgentDocumentInput (knowledge base)
wakeUpConfigs[],           # AgentWakeUpConfigInput (proactive outreach)
outboundTriggers[],        # AgentOutboundTriggerInput (webhook-driven sends)
paywallConfig,             # AgentPaywallConfigInput
creditSettings,            # AgentCreditSettingsInput
adConfig, voiceCallConfig
```

**Agent** (read shape, key fields): `id, name, description, systemPrompt,
firstMessage, profilePicture, icebreakers, tools[], websiteTools[],
imageGenerateTools[], handoffTools[], mcpConfigs[], documents[], memoryKeys[],
wakeUpConfigs[], outboundTriggers[], paywallConfig, creditSettings, adConfig,
voiceCallConfig, owner, sharings, phoneNumbers[], totalMessages, totalSessions,
connectUrl, ownerActive, createdAt, updatedAt`. `connectUrl` opens a sandbox
test chat for the agent.

### Sub-resource input shapes

```jsonc
// AgentToolInput  (REST API tool)
{ "name*": str, "description*": str, "apiSchema*": {…}, "active": bool, "creditCost": int }

// AgentWebsiteToolInput  (live page reading)
{ "url*": uri, "prompt*": str, "active": bool }

// AgentImageGenerateToolInput
{ "name*": str, "description*": str, "prompt*": str, "active": bool, "creditCost": int }

// AgentHandoffToolInput  (transfer to another agent)
{ "childAgentId*": uuid, "description*": str, "active": bool }

// AgentMcpConfigInput  (attach an MCP connector)
{ "connectorId*": uuid, "toolWhitelist": [str] }

// AgentMemoryKey  (persistent per-user memory)
{ "key*": str, "type*": str, "initialValue*": str, "whenToUpdate*": str }

// AgentWakeUpConfigInput  (proactive outreach trigger)
{ "description*": str, "enabled": bool, "forceMessage": bool }

// AgentPaywallConfigInput
{ "messageLimit": int|null, "paywallAction": PaywallActionEnum,
  "paywallUrl": str|null, "ctaButtonText": str, "terminalStateMessage": str,
  "subscriptionPricePerMonth": decimal|null }

// AgentCreditSettingsInput
{ "initialCredits": int, "creditGrantPassword": str|null, "creditGrantAmount": int }
```

---

## Tools & apiSchema

An API tool's `apiSchema` describes an HTTP call. Every parameter (in
`path_params`, `query_params`, `request_headers`, `request_body.properties`)
carries an `input` object telling the platform where the value comes from:

```jsonc
// LLM-extracted from the conversation
{ "type": "string", "input": { "type": "description", "description": "The order number the customer gave" } }

// Hard-coded literal or built-in template variable
{ "type": "string", "input": { "type": "value", "value": "%PHONE_NUMBER%" } }
{ "type": "string", "input": { "type": "value", "value": "Bearer sk-live-..." } }
```

Built-in template variables (substituted anywhere inside a string value at call
time):

| Variable | Replaced with |
|---|---|
| `%PHONE_NUMBER%` | The contact's WhatsApp number for this session |
| `%IMAGE_URL%` | URL of the most recent image the contact sent (omitted if the trigger wasn't an image) |
| `%CALLBACK_URL%` | One-time URL — POST to it to send a follow-up message into the conversation |

Full `apiSchema` example (a tool that forwards the message to your webhook):
```json
{
  "url": "https://your-app.example.com/webhooks/agent",
  "method": "POST",
  "path_params": {},
  "query_params": { "required": [], "properties": {} },
  "request_body": {
    "type": "object", "required": [],
    "properties": {
      "phone_number": { "type": "string", "input": { "type": "value", "value": "%PHONE_NUMBER%" } },
      "message":      { "type": "string", "input": { "type": "description", "description": "The exact customer message" } },
      "image":        { "type": "string", "input": { "type": "value", "value": "%IMAGE_URL%" } },
      "reply_callback":{ "type": "string", "input": { "type": "value", "value": "%CALLBACK_URL%" } }
    }
  }
}
```

---

## Conversations

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/conversations/` | — | List (paginated). Filter by agent/active etc. |
| POST | `/conversations/` | `CreateConversationInput` | Start a conversation |
| GET | `/conversations/{id}/` | — | Retrieve; check `active` before non-template send |
| PUT | `/conversations/{id}/` | — | Update |
| GET | `/conversations/{id}/messages/` | — | List messages (paginated) |
| POST | `/conversations/{id}/messages/` | `SendMessageInput` | Send a message |
| POST | `/conversations/{id}/send-template/` | `SendTemplateInput` | Send a template (works outside 24h window) |
| POST | `/conversations/{id}/prompt/` | `TriggerBotInput` | Nudge the agent with a custom instruction |
| POST | `/conversations/{id}/trigger/` | `TriggerBotInput` | Trigger the agent |
| POST | `/conversations/{id}/read/` | — | Send read receipt for latest inbound |
| POST | `/conversations/{id}/typing/` | — | Show typing indicator |
| POST | `/conversations/{id}/takeover/` | `TakeoverInput` | Human takeover (pauses agent) |
| POST | `/conversations/{id}/handback/` | — | Return control to the agent |
| POST | `/conversations/{id}/subscribe/` | `SubscribeConversationInput` | Route this conversation to a webhook |
| POST | `/conversations/{id}/unsubscribe/` | — | Clear override → number default |

```jsonc
// CreateConversationInput
{ "toNumber": str, "fromNumber": str, "agentId": uuid,
  "message": { "type": "template", "template": SendMessageTemplateInput },
  "phoneNumber": str }

// TriggerBotInput        { "prompt*": str }
// TakeoverInput          { "durationMinutes": int }
// SubscribeConversationInput { "webhookId*": uuid }
```

**Conversation routing** (subscribe / unsubscribe precedence, lifecycle events,
service-window events) is documented in
[webhooks-and-routing.md](webhooks-and-routing.md).

---

## Messages

`POST /conversations/{id}/messages/` body is `SendMessageInput`, tagged by
`type`:

```jsonc
{
  "type*": "unified" | "template" | "text" | "cta",  // SendMessageInputTypeEnum
  "unified":  UnifiedWhatsappMessageInput,  // when type=unified  (preferred, rich)
  "template": SendMessageTemplateInput,     // when type=template
  "text":     SendMessageTextInput,         // when type=text   (deprecated)
  "cta":      SendMessageCtaInput           // when type=cta    (deprecated)
}
```

```jsonc
// UnifiedWhatsappMessageInput  — rich message
{ "text": str,            // ≤ 1024 chars
  "footer": str,
  "media": { "url*": uri },          // public HTTPS; image/video/audio/doc
  "buttons": [ UnifiedWhatsappButtonInput ] }   // ≤ 3, all same type

// UnifiedWhatsappButtonInput
{ "type*": "url" | "quick_reply",
  "text*": str,                       // label, ≤ 20 chars
  "url": uri,                         // when type=url
  "quickReplyId": str }               // when type=quick_reply

// SendMessageTemplateInput
{ "name*": str, "variables": TemplateVariables }

// SendTemplateInput  (for /send-template/)
{ "templateName*": str, "variables*": { … } }

// TemplateVariables
{ "body": [str], "header": str, "buttons": [str], "cards": [Card] }
```

Constraints: a non-template message can only go to an **active** conversation
(inside WhatsApp's 24-hour service window). Outside it, send a template. URL and
quick-reply buttons cannot be mixed in one message. Supported media types:
JPEG, PNG, MP4, 3GPP, AAC, MP4 audio, MPEG, AMR, OGG, PDF, DOCX, XLSX, PPTX.

**Message** (read shape): `id, type` (text|image), plus body, media, buttons,
direction, timestamps.

---

## Phone numbers

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/phone-numbers/` | — | List numbers on the account |
| GET | `/phone-numbers/{number}/` | — | Retrieve one |
| POST | `/phone-numbers/{number}/connect-agent/` | `{agentId*, applyToExisting?}` | Set default routing → agent; drops any webhook |
| POST | `/phone-numbers/{number}/subscribe/` | `{webhookId*, applyToExisting?}` | Set default routing → webhook; drops the agent |
| POST | `/phone-numbers/{number}/unsubscribe/` | `{applyToExisting?}` | Clear routing entirely (drops both) |
| GET/PUT | `/phone-numbers/{number}/business-profile/` | profile | View/update WhatsApp business profile |
| GET/PUT | `/phone-numbers/{number}/display-name/` | — | View/update display name |
| GET/PUT | `/phone-numbers/{number}/icebreakers/` | — | View/update icebreakers |
| GET | `/phone-numbers/{number}/app-syncs/` | — | Sync status |
| GET | `/phone-numbers/{number}/blacklist/` | — | List blacklisted contacts |
| POST | `/phone-numbers/{number}/blacklist/` | — | Add to blacklist |
| POST | `/phone-numbers/{number}/blacklist/remove/` | — | Remove from blacklist |

`applyToExisting: true` rewrites every existing conversation on the number to
the new default and drops in-flight sessions. Number-level routing changes do
**not** fire `subscription.*` webhook events (those are per-conversation only).
`{number}` is the E.164 number without `+` (e.g. `447700900100`). Note the
auto-generated OpenAPI lists a generic `PhoneNumber` body for connect-agent /
subscribe; the real fields are `agentId`/`webhookId` + `applyToExisting` as
shown (confirmed by the routing guide).

---

## WhatsApp accounts & Business-API proxy

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/whatsapp-accounts/` | — | List linked WABAs |
| POST | `/whatsapp-accounts/` | — | Create/link a WABA |
| GET | `/whatsapp-accounts/{id}/` | — | Retrieve (includes `wabaId`) |
| PUT/PATCH/DELETE | `/whatsapp-accounts/{id}/` | — | Update / delete |
| POST | `/whatsapp-accounts/{id}/add-number/` | `AddNumberInput` | Add a number from `/available-numbers/` |
| POST | `/whatsapp-accounts/{id}/deploy-agent/` | `DeployAgentToAccountInput` | Deploy an agent to a number |
| POST | `/whatsapp-accounts/{id}/manage/` | `ManagePhoneNumberInput` | Manage a number |
| GET | `/whatsapp-accounts/{id}/phone-numbers/` | — | Numbers under this WABA |
| GET | `/whatsapp-accounts/{id}/meta-templates/` | — | Templates from Meta's side |
| GET | `/available-numbers/` | — | Numbers you can claim |
| `*` | `/whatsapp-accounts/{id}/proxy/{path}/` | passthrough | Proxy GET/POST/PUT/PATCH/DELETE to Meta Graph API |

```jsonc
// AddNumberInput            { "id*": str, "name*": str }
// DeployAgentToAccountInput { "agentId*": uuid, "phoneNumberId*": uuid }
// ManagePhoneNumberInput    { "phoneNumber*": str }
```

**Proxy** — authenticated as your WABA, `{path}` is appended to Meta's Graph
API. Common GETs:

| `{path}` | Returns |
|---|---|
| `{waba_id}/message_templates` | All message templates |
| `{waba_id}/phone_numbers` | Phone numbers in the account |
| `{phone_number_id}` | Phone number details |
| `{phone_number_id}/whatsapp_business_profile` | Business profile |

```bash
curl -s "https://backend.wassist.app/api/v1/whatsapp-accounts/$ACCOUNT/proxy/$WABA/message_templates" \
  -H "X-API-Key: $WASSIST_API_KEY"
```
`{account}` = Wassist account id (from `GET /whatsapp-accounts/{id}/`);
`{waba_id}` = Meta-side Business Account id (field `wabaId` on that account).
See Meta's WhatsApp Business Management API docs for available paths.

---

## WhatsApp templates

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/whatsapp-templates/` | — | List local templates |
| POST | `/whatsapp-templates/` | `CreateWhatsAppTemplateLocalInput` | Create |
| POST | `/whatsapp-templates/import/` | `ImportTemplatesInput` | Import from Meta |
| GET | `/whatsapp-templates/{id}/` | — | Retrieve |
| PUT/PATCH | `/whatsapp-templates/{id}/` | `UpdateWhatsAppTemplateLocalInput` | Update |
| DELETE | `/whatsapp-templates/{id}/` | — | Delete |
| POST | `/whatsapp-templates/{id}/publish/` | `PublishTemplateInput` | Publish to WABAs (submits to Meta for approval) |
| POST | `/whatsapp-templates/{id}/unpublish/` | `UnpublishTemplateInput` | Unpublish from WABAs |
| POST | `/whatsapp-templates/{id}/sync/` | — | Sync approval status from Meta |

```jsonc
// CreateWhatsAppTemplateLocalInput
{ "name*": str, "category*": "UTILITY"|"MARKETING"|"AUTHENTICATION",
  "language": str,                       // e.g. "en_US"
  "parameterFormat": "POSITIONAL"|"NAMED",
  "components": [ {…} ] }                 // Meta component objects (BODY/HEADER/BUTTONS)

// PublishTemplateInput / UnpublishTemplateInput
{ "accountIds*": [uuid] }
```

A template must be `APPROVED` by Meta before it can be sent. Publishing submits
it; use `/sync/` (or check `meta-templates`) to see the status.

---

## Account link sessions

Used to connect a new WABA via Meta's embedded signup.

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/whatsapp-link-sessions/` | — | List sessions |
| POST | `/whatsapp-link-sessions/` | `{successUrl, returnUrl}` | Create → returns `linkUrl` |
| GET | `/whatsapp-link-sessions/{id}/` | — | Poll `status` |
| PUT/PATCH/DELETE | `/whatsapp-link-sessions/{id}/` | — | Update / delete |
| POST | `/whatsapp-link-sessions/{id}/confirm/` | `ConfirmWhatsAppLinkSessionInput` | Confirm |
| POST | `/whatsapp-link-sessions/{id}/expire/` | — | Expire a session |

**WhatsAppLinkSession**: `{ id, successUrl, returnUrl, status, linkUrl }`.
`status` ∈ `PENDING | EXPIRED | SUCCESS | FAILED`. Redirect the user to
`linkUrl`, then poll until `SUCCESS`.

---

## Webhooks

Webhook **resources** are managed here, but in practice you create them in the
dashboard (the docs note there is no public create-from-scratch flow; routing
endpoints only attach existing webhooks). Verification + events:
[webhooks-and-routing.md](webhooks-and-routing.md).

| Method | Path | Notes |
|---|---|---|
| GET/POST | `/webhooks/` | List / create |
| GET/PUT/PATCH/DELETE | `/webhooks/{id}/` | Manage |
| POST | `/webhooks/{id}/test/` | Fire a `test.ping` |
| POST | `/webhooks/{id}/rotate-secret/` | New signing secret (old stops immediately) |
| GET | `/webhook-deliveries/` | List deliveries (paginated) |
| GET | `/webhook-deliveries/{id}/` | One delivery + attempts |
| POST | `/webhook-deliveries/{id}/replay/` | Re-send (new delivery id) |

**Webhook** (read): `{ id, name, url, secret, events[], active,
consecutiveFailures, disabledAt, disabledReason, createdAt }`.
`events` ∈ see [EventsEnum](#enums).

---

## Contacts

| Method | Path | Body |
|---|---|---|
| GET/POST | `/contacts/` | List / `CreateContactInput` |
| POST | `/contacts/bulk/` | `BulkCreateContactsInput` |
| GET | `/contacts/{id}/` | Retrieve |

```jsonc
// CreateContactInput      { "phoneNumber*": str, "name": str|null }
// BulkCreateContactsInput { "contacts*": [ CreateContactInput ] }
```

---

## Integrations

**MCP connectors** — reusable Model Context Protocol servers attached to agents
via `AgentMcpConfigInput`:

| Method | Path |
|---|---|
| GET/POST | `/integrations/connectors/` |
| GET | `/integrations/connectors/public/` |
| GET/PUT/PATCH/DELETE | `/integrations/connectors/{id}/` |

**ElevenLabs** (voice):

| Method | Path |
|---|---|
| GET/POST | `/integrations/elevenlabs/` |
| GET/PUT/PATCH/DELETE | `/integrations/elevenlabs/{id}/` |
| GET | `/integrations/elevenlabs/{id}/agents/` |

---

## Testing

For automated agent QA before going live.

| Resource | Paths |
|---|---|
| Simulations | `/simulations/`, `/{id}/`, `/{id}/messages/`, `/{id}/reset/` |
| Test personas | `/test-personas/`, `/{id}/` |
| Test runs | `/test-runs/`, `/{id}/` |
| API keys | `/api-keys/`, `/api-keys/{prefix}/revoke/` |

---

## Enums

| Enum | Values |
|---|---|
| `LlmModelEnum` | `openai/gpt-4.1`, `openai/gpt-4.1-mini`, `openai/gpt-5.4-nano`, `openai/gpt-5.4-mini`, `openai/gpt-5.4`, `openai/gpt-4.1-mini-2025-04-14` |
| `SendMessageInputTypeEnum` | `text`, `template`, `cta`, `unified` |
| `UnifiedWhatsappButtonInputTypeEnum` | `url`, `quick_reply` |
| `MessageTypeEnum` | `text`, `image` |
| `PaywallActionEnum` | `none`, `purchase_link`, `subscribe`, `terminal` |
| `Category822Enum` (template category) | `UTILITY`, `MARKETING`, `AUTHENTICATION` |
| `ParameterFormatEnum` | `POSITIONAL`, `NAMED` |
| `WhatsAppLinkSessionStatusEnum` | `PENDING`, `EXPIRED`, `SUCCESS`, `FAILED` |
| `EventsEnum` (webhooks) | `message.received`, `subscription.activated`, `subscription.message.received`, `subscription.revoked`, `subscription.service_window.expiring`, `subscription.service_window.closed` |

Routing modes (per number / per conversation): `agent`, `webhook`, `null`
(stored, no action), `sandbox` (system-only; rejected from the API).
