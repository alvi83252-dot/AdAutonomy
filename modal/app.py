"""Modal serverless campaign simulation for AdAutonomy.

Develop locally:
    modal serve modal/app.py

Deploy:
    modal deploy modal/app.py
"""

from __future__ import annotations

import hashlib
import random
import time
import uuid

import modal

APP_NAME = "adautonomy-simulation"
MAX_RUNS = 100_000

image = modal.Image.debian_slim(python_version="3.12").pip_install(
    "fastapi[standard]==0.115.12",
    "pydantic==2.11.5",
)
app = modal.App(APP_NAME, image=image)


def _clamp(value: float, minimum: float, maximum: float) -> float:
    return min(maximum, max(minimum, value))


def _simulate(payload: dict) -> dict:
    campaign_id = str(payload.get("campaignId", "campaign"))
    product_name = str(payload.get("productName", "product"))
    total_reach = max(1, int(payload.get("totalReach", 1)))
    average_cpc = max(0.01, float(payload.get("averageCpc", 1.5)))
    budget = max(1.0, float(payload.get("budget", 5000)))
    creative_count = max(1, int(payload.get("creativeCount", 1)))
    channel_count = max(1, int(payload.get("channelCount", 1)))
    runs = min(MAX_RUNS, max(1, int(payload.get("runs", 5000))))

    seed_bytes = hashlib.sha256(
        f"{campaign_id}:{product_name}".encode("utf-8")
    ).digest()[:8]
    rng = random.Random(int.from_bytes(seed_bytes, "big"))

    creative_lift = min(0.3, max(0, creative_count - 1) * 0.045)
    channel_lift = min(0.22, max(0, channel_count - 1) * 0.035)
    base_ctr = 0.018 * (1 + creative_lift + channel_lift)
    base_conversion_rate = 0.045 * (1 + creative_lift * 0.5)
    average_order_value = max(35.0, average_cpc * 28)

    impressions_total = 0.0
    clicks_total = 0.0
    conversions_total = 0.0
    revenue_total = 0.0

    for _ in range(runs):
        ctr = _clamp(base_ctr * (1 + rng.gauss(0, 0.18)), 0.003, 0.12)
        conversion_rate = _clamp(
            base_conversion_rate * (1 + rng.gauss(0, 0.22)), 0.005, 0.25
        )
        cpc = max(0.05, average_cpc * (1 + rng.gauss(0, 0.12)))
        affordable_clicks = budget / cpc
        available_impressions = total_reach * (1.65 + rng.random() * 0.7)
        impressions = min(available_impressions, affordable_clicks / ctr)
        clicks = impressions * ctr
        conversions = clicks * conversion_rate

        impressions_total += impressions
        clicks_total += clicks
        conversions_total += conversions
        revenue_total += conversions * average_order_value * (0.9 + rng.random() * 0.2)

    impressions = max(1, round(impressions_total / runs))
    clicks = max(0, round(clicks_total / runs))
    conversions = max(0, round(conversions_total / runs))
    projected_revenue = max(0, round(revenue_total / runs))
    spend = min(budget, clicks * average_cpc)

    return {
        "impressions": impressions,
        "clicks": clicks,
        "conversions": conversions,
        "ctr": round((clicks / impressions) * 100, 2),
        "cpc": round(spend / max(1, clicks), 2),
        "roas": round(projected_revenue / max(1, spend), 2),
        "projectedRevenue": projected_revenue,
        "requestId": str(uuid.uuid4()),
        "runs": runs,
    }


@app.function(cpu=1.0, memory=512, timeout=120, scaledown_window=60)
@modal.fastapi_endpoint(method="POST", docs=True)
def simulate(payload: dict) -> dict:
    started_at = time.perf_counter()
    result = _simulate(payload)
    result["computeDurationMs"] = round((time.perf_counter() - started_at) * 1000, 2)
    return result


@app.local_entrypoint()
def main() -> None:
    sample = {
        "campaignId": "local-test",
        "productName": "AdAutonomy",
        "totalReach": 250000,
        "averageCpc": 1.4,
        "budget": 5000,
        "creativeCount": 3,
        "channelCount": 3,
        "runs": 5000,
    }
    print(simulate.remote(sample))
