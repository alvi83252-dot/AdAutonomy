export const sandboxConfig = {
  enabled: true,
  timeout: 30000,
  isolated: true,
  allowedModules: ['@/lib/agents', '@/lib/llm', '@/lib/storage'],
};
