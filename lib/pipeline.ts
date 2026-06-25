import type { PipelineStep } from '@/lib/types';

export const PIPELINE_STEPS: PipelineStep[] = [
  { id: 'brief', label: 'Brief Extraction', agent: 'BriefingAgent', path: '/brief', status: 'pending' },
  { id: 'creative', label: 'Creative Generation', agent: 'CreativeAgent', path: '/creative', status: 'pending' },
  { id: 'audience', label: 'Audience Selection', agent: 'AudienceAgent', path: '/audience', status: 'pending' },
  { id: 'simulation', label: 'Performance Simulation', agent: 'SimulationAgent', path: '/simulation', status: 'pending' },
  { id: 'safety', label: 'Safety Review', agent: 'SafetyAgent', path: '/safety', status: 'pending' },
  { id: 'feedback', label: 'Feedback Loop', agent: 'FeedbackAgent', path: '/brief', status: 'pending' },
  { id: 'payment', label: 'Payment Processing', agent: 'PaymentAgent', path: '/investor', status: 'pending' },
  { id: 'investor', label: 'Investor Summary', agent: 'InvestorAgent', path: '/investor', status: 'pending' },
  { id: 'deploy', label: 'Deployment & Export', agent: 'DeploymentAgent', path: '/deploy', status: 'pending' },
];

export function getStepStatus(currentStep: number, status: string): PipelineStep[] {
  return PIPELINE_STEPS.map((step, i) => ({
    ...step,
    status:
      i < currentStep
        ? 'complete'
        : i === currentStep
          ? status === 'failed'
            ? 'error'
            : 'active'
          : 'pending',
  }));
}
