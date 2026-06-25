import type { CampaignState } from '@/lib/types';

export function generateCampaignPack(campaign: CampaignState): string {
  const creatives = campaign.creatives
    .map(
      (c) => `
      <div class="creative-card">
        <span class="variant">Variant ${c.variant}</span>
        <h3>${escapeHtml(c.headline)}</h3>
        <p>${escapeHtml(c.body)}</p>
        <button class="cta">${escapeHtml(c.cta)}</button>
      </div>`
    )
    .join('');

  const channels = campaign.audiences
    .map((a) => `<tr><td>${escapeHtml(a.platform)}</td><td>${a.reach.toLocaleString()}</td><td>$${a.costPerClick}</td><td>${escapeHtml(a.rationale)}</td></tr>`)
    .join('');

  const flags = campaign.safetyFlags
    .map((f) => `<li class="severity-${f.severity}">[${f.severity.toUpperCase()}] ${escapeHtml(f.message)}</li>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>AdAutonomy Campaign Pack - ${escapeHtml(campaign.brief.productName)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; background: #0a0a0f; color: #e4e4e7; padding: 40px; }
    .header { text-align: center; margin-bottom: 40px; border-bottom: 1px solid #27272a; padding-bottom: 30px; }
    .header h1 { font-size: 2.5rem; background: linear-gradient(135deg, #818cf8, #c084fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .section { margin-bottom: 30px; background: rgba(255,255,255,0.03); border: 1px solid #27272a; border-radius: 12px; padding: 24px; }
    .section h2 { color: #a78bfa; margin-bottom: 16px; font-size: 1.25rem; }
    .creative-card { background: #18181b; border-radius: 8px; padding: 20px; margin-bottom: 16px; }
    .variant { background: #4f46e5; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; }
    .cta { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border: none; padding: 8px 20px; border-radius: 6px; margin-top: 12px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #27272a; }
    th { color: #a1a1aa; }
    .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    .metric { text-align: center; padding: 16px; background: #18181b; border-radius: 8px; }
    .metric .value { font-size: 1.5rem; font-weight: bold; color: #818cf8; }
    .metric .label { font-size: 0.75rem; color: #71717a; margin-top: 4px; }
    .severity-critical { color: #ef4444; }
    .severity-high { color: #f97316; }
    .severity-medium { color: #eab308; }
    .severity-low { color: #22c55e; }
    .footer { text-align: center; margin-top: 40px; color: #52525b; font-size: 0.8rem; }
    @media print { body { background: white; color: black; } .section { border-color: #ddd; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>AdAutonomy Campaign Pack</h1>
    <p>${escapeHtml(campaign.brief.productName)} — ${escapeHtml(campaign.brief.campaignGoal)}</p>
    <p style="color:#71717a;margin-top:8px;">Generated ${new Date().toLocaleDateString()}</p>
  </div>

  <div class="section">
    <h2>Campaign Brief</h2>
    <p><strong>Product:</strong> ${escapeHtml(campaign.brief.productName)}</p>
    <p><strong>Target Market:</strong> ${escapeHtml(campaign.brief.targetMarket)}</p>
    <p><strong>Goal:</strong> ${escapeHtml(campaign.brief.campaignGoal)}</p>
  </div>

  <div class="section">
    <h2>Creative Assets</h2>
    ${creatives}
  </div>

  <div class="section">
    <h2>Channel Strategy</h2>
    <table>
      <thead><tr><th>Platform</th><th>Reach</th><th>CPC</th><th>Rationale</th></tr></thead>
      <tbody>${channels}</tbody>
    </table>
  </div>

  ${
    campaign.simulation
      ? `<div class="section">
    <h2>Performance Projection</h2>
    <div class="metrics">
      <div class="metric"><div class="value">${campaign.simulation.impressions.toLocaleString()}</div><div class="label">Impressions</div></div>
      <div class="metric"><div class="value">${campaign.simulation.ctr}%</div><div class="label">CTR</div></div>
      <div class="metric"><div class="value">${campaign.simulation.roas}x</div><div class="label">ROAS</div></div>
      <div class="metric"><div class="value">$${campaign.simulation.projectedRevenue.toLocaleString()}</div><div class="label">Revenue</div></div>
    </div>
  </div>`
      : ''
  }

  <div class="section">
    <h2>Safety & Compliance</h2>
    <ul>${flags || '<li>All checks passed</li>'}</ul>
  </div>

  ${
    campaign.orchestration
      ? `<div class="section">
    <h2>Manus Orchestration Plan</h2>
    <p><strong>Provider:</strong> ${campaign.orchestration.provider === 'manus' ? 'Manus API v2' : 'Local supervisor fallback'}</p>
    <p><strong>Strategy:</strong> ${escapeHtml(campaign.orchestration.executionStrategy)}</p>
    <p><strong>Delegated agent steps:</strong> ${campaign.orchestration.steps.length}</p>
  </div>`
      : ''
  }

  ${
    campaign.finance
      ? `<div class="section">
    <h2>Seapoint Financial Control</h2>
    <div class="metrics">
      <div class="metric"><div class="value">$${campaign.finance.currentCash.toLocaleString()}</div><div class="label">Consolidated Cash</div></div>
      <div class="metric"><div class="value">$${campaign.finance.monthlyBurn.toLocaleString()}</div><div class="label">Monthly Burn</div></div>
      <div class="metric"><div class="value">${campaign.finance.runwayMonths} mo</div><div class="label">Cash Runway</div></div>
      <div class="metric"><div class="value">${campaign.finance.pendingApprovals}</div><div class="label">Pending Approvals</div></div>
    </div>
    <p style="margin-top:16px;"><strong>Net campaign cash flow:</strong> $${campaign.finance.netCashFlow.toLocaleString()}</p>
    <p><strong>Bookkeeping entries categorised:</strong> ${campaign.finance.bookkeeping.length}</p>
  </div>`
      : ''
  }

  ${
    campaign.investorSummary
      ? `<div class="section">
    <h2>Investor Summary</h2>
    <p><strong>Recommendation:</strong> ${escapeHtml(campaign.investorSummary.recommendation)}</p>
    <p><strong>Projected ROI:</strong> ${campaign.investorSummary.projectedROI}x</p>
    <p><strong>Risk Score:</strong> ${(campaign.investorSummary.riskScore * 100).toFixed(0)}%</p>
  </div>`
      : ''
  }

  <div class="footer">
    <p>AdAutonomy — Autonomous Advertising Platform</p>
    <p>Powered by Cursor · OpenAI · Supabase · Modal · Seapoint · PayPal Sandbox · Vercel Eve</p>
    <p>Halkin Offices — Venue Partner</p>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
