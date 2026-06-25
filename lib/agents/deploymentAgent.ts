import { sendMessage } from '@/lib/agents/messaging';
import { updateAgentMemory } from '@/lib/storage/db';
import { generateICS } from '@/lib/calendar/icsGenerator';
import { generateCampaignPack } from '@/lib/pdf/exportPack';
import type { CampaignState } from '@/lib/types';

export async function runDeploymentAgent(campaign: CampaignState): Promise<CampaignState> {
  const icsContent = generateICS(campaign);
  const packHtml = generateCampaignPack(campaign);

  await sendMessage('DeploymentAgent', 'Orchestrator', 'response', {
    icsGenerated: true,
    packGenerated: true,
    autonomyScore: calculateAutonomyScore(campaign),
  });

  updateAgentMemory('DeploymentAgent', {
    confidence: 0.95,
    notes: ['Campaign pack exported', 'ICS timeline generated'],
  });

  return {
    ...campaign,
    status: 'deployed',
    currentStep: 9,
    updatedAt: new Date().toISOString(),
    extractedBrief: {
      ...campaign.extractedBrief,
      icsContent,
      packHtml,
    },
  };
}

function calculateAutonomyScore(campaign: CampaignState): number {
  let score = 0.7;
  if (campaign.creatives.length >= 3) score += 0.05;
  if (campaign.audiences.length >= 3) score += 0.05;
  if (campaign.simulation && campaign.simulation.roas > 2) score += 0.1;
  if (!campaign.safetyFlags.some((f) => f.severity === 'critical')) score += 0.05;
  if (campaign.payments.length > 0) score += 0.05;
  return Math.min(score, 1.0);
}
