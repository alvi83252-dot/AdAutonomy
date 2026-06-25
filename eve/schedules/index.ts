export const schedules = {
  healthCheck: {
    cron: '*/5 * * * *',
    action: 'checkAgentHealth',
  },
  memoryCleanup: {
    cron: '0 0 * * *',
    action: 'cleanupAgentMemory',
  },
};
