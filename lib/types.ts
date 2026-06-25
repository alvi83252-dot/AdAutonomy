export type CampaignBrief = {
  productName: string;
  targetMarket: string;
  campaignGoal: string;
  budget?: number;
  timeline?: string;
};

export type AgentName =
  | 'BriefingAgent'
  | 'CreativeAgent'
  | 'AudienceAgent'
  | 'SimulationAgent'
  | 'SafetyAgent'
  | 'FeedbackAgent'
  | 'InvestorAgent'
  | 'PaymentAgent'
  | 'DeploymentAgent'
  | 'VideoAgent'
  | 'Orchestrator';

export type AgentMessage = {
  id: string;
  from: AgentName;
  to: AgentName | 'broadcast';
  type: 'request' | 'response' | 'approval' | 'veto' | 'escalation' | 'info';
  payload: Record<string, unknown>;
  timestamp: string;
  confidence?: number;
};

export type ApprovalVote = {
  agent: AgentName;
  approved: boolean;
  reason?: string;
  timestamp: string;
};

export type CreativeAsset = {
  headline: string;
  body: string;
  cta: string;
  variant: string;
  imagePrompt: string;
};

export type AudienceChannel = {
  name: string;
  platform: string;
  reach: number;
  costPerClick: number;
  rationale: string;
};

export type SimulationResult = {
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  roas: number;
  projectedRevenue: number;
  compute?: {
    provider: 'modal' | 'local';
    runs: number;
    latencyMs: number;
    requestId?: string;
    fallbackReason?: string;
  };
};

export type SafetyFlag = {
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  message: string;
  resolved: boolean;
};

export type FeedbackItem = {
  sentiment: 'positive' | 'neutral' | 'negative';
  comment: string;
  source: string;
};

export type PaymentRecord = {
  id: string;
  type: 'checkout' | 'subscription' | 'payout' | 'refund';
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'completed' | 'refunded';
  receipt?: string;
  timestamp: string;
};

export type SeapointBookkeepingEntry = {
  id: string;
  paymentId: string;
  description: string;
  category: string;
  direction: 'inflow' | 'outflow';
  amount: number;
  currency: string;
  confidence: number;
  status: 'categorised' | 'review';
};

export type SeapointInvoice = {
  id: string;
  paymentId: string;
  supplier: string;
  description: string;
  amount: number;
  currency: string;
  dueDate: string;
  status: 'approved' | 'needs_approval' | 'paid';
  approvalReason: string;
};

export type SeapointFinanceSnapshot = {
  provider: 'seapoint-bridge' | 'local';
  generatedAt: string;
  currency: string;
  openingCash: number;
  currentCash: number;
  projectedRevenue: number;
  campaignSpend: number;
  netCashFlow: number;
  monthlyBurn: number;
  runwayMonths: number;
  approvalThreshold: number;
  pendingApprovals: number;
  bookkeeping: SeapointBookkeepingEntry[];
  invoices: SeapointInvoice[];
  sync: {
    status: 'synced' | 'local' | 'failed';
    requestId?: string;
    message: string;
  };
};

export type ManusPlanStep = {
  stepId: string;
  agent: AgentName;
  objective: string;
  validation: string;
  priority: 'high' | 'medium' | 'low';
};

export type ManusStructuredPlan = {
  summary: string;
  executionStrategy: string;
  riskCheckpoints: string[];
  steps: ManusPlanStep[];
};

export type ManusOrchestration = ManusStructuredPlan & {
  provider: 'manus' | 'local';
  status: 'completed' | 'fallback';
  taskId?: string;
  taskUrl?: string;
  requestId?: string;
  createdAt: string;
  latencyMs: number;
  toolsObserved: string[];
  fallbackReason?: string;
};

export type InvestorSummary = {
  totalSpend: number;
  projectedROI: number;
  breakEvenDays: number;
  riskScore: number;
  recommendation: string;
  highlights: string[];
};

export type CampaignState = {
  id: string;
  brief: CampaignBrief;
  extractedBrief?: Record<string, unknown>;
  creatives: CreativeAsset[];
  audiences: AudienceChannel[];
  simulation?: SimulationResult;
  safetyFlags: SafetyFlag[];
  feedback: FeedbackItem[];
  payments: PaymentRecord[];
  finance?: SeapointFinanceSnapshot;
  orchestration?: ManusOrchestration;
  investorSummary?: InvestorSummary;
  approvals: ApprovalVote[];
  status: 'pending' | 'running' | 'review' | 'approved' | 'deployed' | 'failed';
  currentStep: number;
  createdAt: string;
  updatedAt: string;
};

export type AgentMemory = {
  agent: AgentName;
  lastRun: string;
  confidence: number;
  retries: number;
  notes: string[];
};

export type PipelineStep = {
  id: string;
  label: string;
  agent: AgentName;
  path: string;
  status: 'pending' | 'active' | 'complete' | 'error' | 'skipped';
};

export type VideoScene = {
  id: string;
  type: 'intro' | 'product' | 'feature' | 'cta' | 'outro';
  headline: string;
  subtext: string;
  narration: string;
  duration: number;
  animation: 'fade' | 'slide' | 'zoom' | 'kenburns';
};

export type VideoAdScript = {
  id: string;
  productName: string;
  productText: string;
  targetMarket?: string;
  tagline: string;
  scenes: VideoScene[];
  totalDuration: number;
  musicStyle: string;
  createdAt: string;
};

export type VideoAdProject = {
  script: VideoAdScript;
  imageDataUrl?: string;
  videoBlobUrl?: string;
  status: 'idle' | 'scripting' | 'rendering' | 'ready' | 'error';
};

export type AssistantMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  model?: string;
};

export type SocialPlatform = 'instagram' | 'tiktok' | 'linkedin' | 'twitter' | 'youtube' | 'facebook';
