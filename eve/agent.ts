/**
 * AdAutonomy Eve Agent Configuration
 * Vercel Eve offline mode — autonomous advertising orchestrator
 */

export const agentConfig = {
  name: 'adautonomy-orchestrator',
  model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  provider: process.env.LLM_PROVIDER || 'mock',
  offline: process.env.EVE_OFFLINE_MODE === 'true',
  temperature: 0.7,
  maxTokens: 2048,
  subagents: [
    'briefing',
    'creative',
    'audience',
    'simulation',
    'safety',
    'feedback',
    'payment',
    'investor',
    'deployment',
  ],
  schedules: {
    healthCheck: '*/5 * * * *',
    memoryCleanup: '0 0 * * *',
  },
  sandbox: {
    enabled: true,
    timeout: 30000,
  },
};

export default agentConfig;
