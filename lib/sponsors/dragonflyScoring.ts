import type { CampaignState, DragonflyScore, DragonflyBreakdown } from '@/lib/types';

type DimensionWeight = {
  dimension: keyof DragonflyBreakdown;
  weight: number;
};

const WEIGHTS: DimensionWeight[] = [
  { dimension: 'creativeQuality', weight: 0.15 },
  { dimension: 'audienceDiversity', weight: 0.15 },
  { dimension: 'simulationConsistency', weight: 0.15 },
  { dimension: 'safetyCompliance', weight: 0.20 },
  { dimension: 'pipelineEfficiency', weight: 0.15 },
  { dimension: 'agentConfidence', weight: 0.10 },
  { dimension: 'paymentIntegrity', weight: 0.10 },
];

function scoreCreativeQuality(campaign: CampaignState): number {
  if (campaign.creatives.length === 0) return 0;
  const countScore = Math.min(campaign.creatives.length / 5, 1);
  const fieldScore = campaign.creatives.filter(
    (c) => c.headline && c.body && c.cta && c.imagePrompt
  ).length / campaign.creatives.length;
  const variantScore = new Set(campaign.creatives.map((c) => c.variant)).size >= 2 ? 1 : 0.5;
  return (countScore * 0.4 + fieldScore * 0.4 + variantScore * 0.2);
}

function scoreAudienceDiversity(campaign: CampaignState): number {
  if (campaign.audiences.length === 0) return 0;
  const countScore = Math.min(campaign.audiences.length / 5, 1);
  const platformScore = new Set(campaign.audiences.map((a) => a.platform)).size >= 3 ? 1 : 0.5;
  const reachScore = Math.min(
    campaign.audiences.reduce((s, a) => s + a.reach, 0) / 500000,
    1
  );
  return (countScore * 0.4 + platformScore * 0.3 + reachScore * 0.3);
}

function scoreSimulationConsistency(campaign: CampaignState): number {
  if (!campaign.simulation) return 0;
  const s = campaign.simulation;
  let score = 0.7;
  if (s.ctr > 0.5 && s.ctr < 20) score += 0.1;
  else score -= 0.1;
  if (s.cpc > 0.1 && s.cpc < 50) score += 0.05;
  if (s.roas > 1) score += 0.1;
  if (s.roas > 5) score += 0.05;
  if (s.impressions > 0 && s.clicks <= s.impressions) score += 0.05;
  else score -= 0.1;
  if (s.conversions > 0 && s.conversions <= s.clicks) score += 0.05;
  return Math.max(0, Math.min(1, score));
}

function scoreSafetyCompliance(campaign: CampaignState): number {
  if (campaign.safetyFlags.length === 0) return 1;
  const criticalCount = campaign.safetyFlags.filter((f) => f.severity === 'critical').length;
  const highCount = campaign.safetyFlags.filter((f) => f.severity === 'high').length;
  const resolvedCount = campaign.safetyFlags.filter((f) => f.resolved).length;
  let score = 1;
  score -= criticalCount * 0.4;
  score -= highCount * 0.2;
  score -= (campaign.safetyFlags.length - resolvedCount) * 0.05;
  return Math.max(0, score);
}

function scorePipelineEfficiency(campaign: CampaignState): number {
  const totalSteps = 9;
  const approvals = campaign.approvals.length;
  const vetoes = campaign.approvals.filter((a) => !a.approved).length;
  let score = 0.6;
  score += (approvals / totalSteps) * 0.2;
  score -= vetoes * 0.15;
  if (campaign.status === 'deployed') score += 0.1;
  return Math.max(0, Math.min(1, score));
}

function scoreAgentConfidence(campaign: CampaignState): number {
  const confidences = campaign.approvals
    .filter((a) => a.agent !== 'Orchestrator')
    .map((a) => {
      if (a.approved) return 0.85;
      return 0.3;
    });
  if (confidences.length === 0) return 0.5;
  return confidences.reduce((s, c) => s + c, 0) / confidences.length;
}

function scorePaymentIntegrity(campaign: CampaignState): number {
  if (campaign.payments.length === 0) return 0;
  const completed = campaign.payments.filter((p) => p.status === 'completed').length;
  const refunded = campaign.payments.filter((p) => p.status === 'refunded').length;
  const total = campaign.payments.length;
  return (completed / total) * 0.8 + (refunded === 0 ? 0.2 : 0);
}

function generateDetail(campaign: CampaignState, scores: DragonflyBreakdown): string {
  const parts: string[] = [];
  if (scores.creativeQuality > 0.8) parts.push('Strong creative diversity with well-formed assets');
  else if (scores.creativeQuality < 0.4) parts.push('Creative assets need improvement in variety and completeness');

  if (scores.audienceDiversity > 0.8) parts.push('Excellent multi-platform audience targeting');
  else if (scores.audienceDiversity < 0.4) parts.push('Audience targeting is narrow — consider more channels');

  if (scores.safetyCompliance > 0.8) parts.push('Clean compliance pass with minimal safety flags');
  else if (scores.safetyCompliance < 0.5) parts.push('Safety concerns detected — review flagged items');

  if (scores.simulationConsistency > 0.8) parts.push('Simulation metrics are internally consistent and realistic');
  if (scores.pipelineEfficiency > 0.8) parts.push('Pipeline ran efficiently with strong agent consensus');
  if (scores.paymentIntegrity > 0.8) parts.push('All payment transactions completed successfully');

  if (parts.length === 0) parts.push('Campaign completed with baseline metrics');
  const details = `Dragonfly Assessment (dragonfly.xyz): ${parts.join('. ')}.`;
  return details;
}

export function calculateDragonflyScore(campaign: CampaignState): DragonflyScore {
  const breakdown = {
    creativeQuality: scoreCreativeQuality(campaign),
    audienceDiversity: scoreAudienceDiversity(campaign),
    simulationConsistency: scoreSimulationConsistency(campaign),
    safetyCompliance: scoreSafetyCompliance(campaign),
    pipelineEfficiency: scorePipelineEfficiency(campaign),
    agentConfidence: scoreAgentConfidence(campaign),
    paymentIntegrity: scorePaymentIntegrity(campaign),
  };

  const technicalExcellence =
    breakdown.creativeQuality * 0.25 +
    breakdown.audienceDiversity * 0.25 +
    breakdown.simulationConsistency * 0.25 +
    breakdown.safetyCompliance * 0.25;

  const autonomy =
    breakdown.pipelineEfficiency * 0.40 +
    breakdown.agentConfidence * 0.30 +
    breakdown.paymentIntegrity * 0.30;

  const overall = WEIGHTS.reduce(
    (sum, w) => sum + breakdown[w.dimension] * w.weight,
    0
  );

  const detail = generateDetail(campaign, breakdown);

  return {
    overall: Math.round(overall * 1000) / 1000,
    technicalExcellence: Math.round(technicalExcellence * 1000) / 1000,
    autonomy: Math.round(autonomy * 1000) / 1000,
    breakdown,
    detail,
    timestamp: new Date().toISOString(),
  };
}
