#!/usr/bin/env python3
"""Zero-dependency client + CLI for the Wassist WhatsApp agent API.

Only the Python standard library is used (urllib), so this runs anywhere with
no `pip install`. The API key is read from the WASSIST_API_KEY environment
variable unless passed explicitly.

Library use:
    from wassist_client import WassistClient
    wa = WassistClient()                       # reads $WASSIST_API_KEY
    agents = wa.list_agents()
    agent = wa.create_agent(name="My Agent")
    wa.send_unified(conv_id, text="Hi!", buttons=[
        {"type": "quick_reply", "text": "Yes", "quickReplyId": "yes"},
    ])

CLI use:
    export WASSIST_API_KEY=sk_...
    python wassist_client.py agents list
    python wassist_client.py agents create --name "My Agent"
    python wassist_client.py agents get <id>
    python wassist_client.py conversations list
    python wassist_client.py conversations send <conv_id> --text "Hello"
    python wassist_client.py conversations send-template <conv_id> --name order_update --body 12345 Friday
    python wassist_client.py templates list
    python wassist_client.py accounts list
    python wassist_client.py raw GET /agents/?limit=5
    python wassist_client.py raw POST /agents/ --json '{"name":"X"}'

Every non-2xx response raises WassistError carrying the status and parsed body,
so callers can decide whether to fall back to a local default.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Optional

DEFAULT_BASE_URL = "https://backend.wassist.app/api/v1"


class WassistError(RuntimeError):
    """Raised for any non-2xx response or transport failure."""

    def __init__(self, message: str, *, status: Optional[int] = None, body: Any = None):
        super().__init__(message)
        self.status = status
        self.body = body


class WassistClient:
    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = 30.0,
    ):
        self.api_key = api_key or os.environ.get("WASSIST_API_KEY")
        if not self.api_key:
            raise WassistError(
                "No API key. Pass api_key= or set WASSIST_API_KEY "
                "(create one at wassist.app -> Settings -> API Keys)."
            )
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    # --- core transport -------------------------------------------------
    def request(
        self,
        method: str,
        path: str,
        *,
        body: Optional[dict] = None,
        params: Optional[dict] = None,
    ) -> Any:
        """Make a request. `path` may be a full URL (e.g. a pagination `next`)
        or a path relative to the API base, with or without a leading slash."""
        if path.startswith("http://") or path.startswith("https://"):
            url = path
        else:
            url = f"{self.base_url}/{path.lstrip('/')}"
        if params:
            clean = {k: v for k, v in params.items() if v is not None}
            if clean:
                sep = "&" if "?" in url else "?"
                url = f"{url}{sep}{urllib.parse.urlencode(clean)}"

        data = json.dumps(body).encode("utf-8") if body is not None else None
        req = urllib.request.Request(url, data=data, method=method.upper())
        req.add_header("X-API-Key", self.api_key)
        req.add_header("Content-Type", "application/json")
        req.add_header("Accept", "application/json")

        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                raw = resp.read().decode("utf-8") or "null"
                return json.loads(raw)
        except urllib.error.HTTPError as e:
            raw = e.read().decode("utf-8", "replace")
            try:
                parsed = json.loads(raw)
            except json.JSONDecodeError:
                parsed = raw
            hint = ""
            if e.code == 429:
                hint = " (rate limited — 100 req/min/key; back off and retry)"
            elif e.code == 401:
                hint = " (check WASSIST_API_KEY)"
            raise WassistError(
                f"HTTP {e.code} on {method} {url}{hint}: {parsed}",
                status=e.code,
                body=parsed,
            ) from None
        except urllib.error.URLError as e:
            raise WassistError(f"network error on {method} {url}: {e.reason}") from None

    def get(self, path, **params):
        return self.request("GET", path, params=params or None)

    def post(self, path, body=None):
        return self.request("POST", path, body=body or {})

    def patch(self, path, body=None):
        return self.request("PATCH", path, body=body or {})

    def delete(self, path):
        return self.request("DELETE", path)

    def paginate(self, path, **params):
        """Yield every item across all pages of a list endpoint."""
        page = self.get(path, **params)
        while True:
            if isinstance(page, dict) and "results" in page:
                for item in page["results"]:
                    yield item
                nxt = page.get("next")
                if not nxt:
                    return
                page = self.request("GET", nxt)
            else:  # non-paginated list
                for item in page or []:
                    yield item
                return

    # --- agents ---------------------------------------------------------
    def list_agents(self, **params):
        return self.get("/agents/", **params)

    def create_agent(self, name: str):
        return self.post("/agents/", {"name": name})

    def create_byoa_agent(self, webhook_url: str):
        return self.post("/agents/byoa/", {"webhookUrl": webhook_url})

    def get_agent(self, agent_id: str):
        return self.get(f"/agents/{agent_id}/")

    def update_agent(self, agent_id: str, **fields):
        return self.patch(f"/agents/{agent_id}/", fields)

    def delete_agent(self, agent_id: str):
        return self.delete(f"/agents/{agent_id}/")

    def share_agent(self, agent_id: str, user_phone_number: str):
        return self.post(f"/agents/{agent_id}/share/", {"userPhoneNumber": user_phone_number})

    # --- conversations & messages --------------------------------------
    def list_conversations(self, **params):
        return self.get("/conversations/", **params)

    def get_conversation(self, conv_id: str):
        return self.get(f"/conversations/{conv_id}/")

    def list_messages(self, conv_id: str, **params):
        return self.get(f"/conversations/{conv_id}/messages/", **params)

    def send_unified(self, conv_id, *, text=None, footer=None, media_url=None, buttons=None):
        """Send a rich 'unified' message. buttons: list of dicts with type
        'url'|'quick_reply'. ≤3 buttons, all the same type; text ≤1024 chars."""
        unified: dict[str, Any] = {}
        if text is not None:
            unified["text"] = text
        if footer is not None:
            unified["footer"] = footer
        if media_url is not None:
            unified["media"] = {"url": media_url}
        if buttons:
            unified["buttons"] = buttons
        return self.post(f"/conversations/{conv_id}/messages/", {"type": "unified", "unified": unified})

    def send_text(self, conv_id, text):
        """Convenience wrapper around a unified text-only message."""
        return self.send_unified(conv_id, text=text)

    def send_template(self, conv_id, template_name, variables=None):
        body = {"templateName": template_name, "variables": variables or {}}
        return self.post(f"/conversations/{conv_id}/send-template/", body)

    def prompt_agent(self, conv_id, prompt):
        return self.post(f"/conversations/{conv_id}/prompt/", {"prompt": prompt})

    def mark_read(self, conv_id):
        return self.post(f"/conversations/{conv_id}/read/")

    def mark_typing(self, conv_id):
        return self.post(f"/conversations/{conv_id}/typing/")

    def subscribe_conversation(self, conv_id, webhook_id):
        return self.post(f"/conversations/{conv_id}/subscribe/", {"webhookId": webhook_id})

    def unsubscribe_conversation(self, conv_id):
        return self.post(f"/conversations/{conv_id}/unsubscribe/")

    # --- phone numbers --------------------------------------------------
    def list_phone_numbers(self, **params):
        return self.get("/phone-numbers/", **params)

    def connect_agent(self, number, agent_id, apply_to_existing=False):
        return self.post(
            f"/phone-numbers/{number}/connect-agent/",
            {"agentId": agent_id, "applyToExisting": apply_to_existing},
        )

    # --- whatsapp accounts & templates ---------------------------------
    def list_accounts(self, **params):
        return self.get("/whatsapp-accounts/", **params)

    def deploy_agent(self, account_id, agent_id, phone_number_id):
        return self.post(
            f"/whatsapp-accounts/{account_id}/deploy-agent/",
            {"agentId": agent_id, "phoneNumberId": phone_number_id},
        )

    def proxy(self, account_id, path, method="GET", body=None):
        """Proxy a request to Meta's WhatsApp Business (Graph) API as your WABA."""
        return self.request(method, f"/whatsapp-accounts/{account_id}/proxy/{path.lstrip('/')}/", body=body)

    def list_templates(self, **params):
        return self.get("/whatsapp-templates/", **params)

    def publish_template(self, template_id, account_ids):
        return self.post(f"/whatsapp-templates/{template_id}/publish/", {"accountIds": account_ids})

    # --- link sessions & webhooks --------------------------------------
    def create_link_session(self, success_url, return_url):
        return self.post("/whatsapp-link-sessions/", {"successUrl": success_url, "returnUrl": return_url})

    def get_link_session(self, session_id):
        return self.get(f"/whatsapp-link-sessions/{session_id}/")

    def list_webhooks(self, **params):
        return self.get("/webhooks/", **params)

    def test_webhook(self, webhook_id):
        return self.post(f"/webhooks/{webhook_id}/test/")


# ----------------------------------------------------------------------
# CLI
# ----------------------------------------------------------------------
def _print(obj):
    print(json.dumps(obj, indent=2, ensure_ascii=False))


def main(argv=None):
    p = argparse.ArgumentParser(prog="wassist_client", description="Wassist API CLI")
    p.add_argument("--api-key", help="overrides $WASSIST_API_KEY")
    p.add_argument("--base-url", default=DEFAULT_BASE_URL)
    sub = p.add_subparsers(dest="resource", required=True)

    ag = sub.add_parser("agents").add_subparsers(dest="action", required=True)
    ag.add_parser("list")
    c = ag.add_parser("create"); c.add_argument("--name", required=True)
    g = ag.add_parser("get"); g.add_argument("id")
    d = ag.add_parser("delete"); d.add_argument("id")

    cv = sub.add_parser("conversations").add_subparsers(dest="action", required=True)
    cv.add_parser("list")
    cg = cv.add_parser("get"); cg.add_argument("id")
    cm = cv.add_parser("messages"); cm.add_argument("id")
    cs = cv.add_parser("send"); cs.add_argument("id"); cs.add_argument("--text", required=True)
    cs.add_argument("--footer"); cs.add_argument("--media")
    ct = cv.add_parser("send-template"); ct.add_argument("id")
    ct.add_argument("--name", required=True); ct.add_argument("--body", nargs="*", default=[])

    sub.add_parser("templates").add_subparsers(dest="action", required=True).add_parser("list")
    sub.add_parser("accounts").add_subparsers(dest="action", required=True).add_parser("list")
    sub.add_parser("numbers").add_subparsers(dest="action", required=True).add_parser("list")

    rw = sub.add_parser("raw")
    rw.add_argument("method"); rw.add_argument("path")
    rw.add_argument("--json", dest="json_body", help="JSON request body")

    args = p.parse_args(argv)

    try:
        wa = WassistClient(api_key=args.api_key, base_url=args.base_url)
        res = _dispatch(wa, args)
        _print(res)
    except WassistError as e:
        print(f"error: {e}", file=sys.stderr)
        return 1
    return 0


def _dispatch(wa: WassistClient, args):
    r, a = args.resource, getattr(args, "action", None)
    if r == "agents":
        if a == "list":   return wa.list_agents()
        if a == "create": return wa.create_agent(args.name)
        if a == "get":    return wa.get_agent(args.id)
        if a == "delete": return wa.delete_agent(args.id)
    if r == "conversations":
        if a == "list":          return wa.list_conversations()
        if a == "get":           return wa.get_conversation(args.id)
        if a == "messages":      return wa.list_messages(args.id)
        if a == "send":          return wa.send_unified(args.id, text=args.text, footer=args.footer, media_url=args.media)
        if a == "send-template": return wa.send_template(args.id, args.name, {"body": args.body} if args.body else {})
    if r == "templates" and a == "list": return wa.list_templates()
    if r == "accounts" and a == "list":  return wa.list_accounts()
    if r == "numbers" and a == "list":   return wa.list_phone_numbers()
    if r == "raw":
        body = json.loads(args.json_body) if args.json_body else None
        return wa.request(args.method, args.path, body=body)
    raise WassistError(f"unknown command: {r} {a}")


if __name__ == "__main__":
    raise SystemExit(main())
