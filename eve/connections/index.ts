export const connections = {
  paypal: {
    type: 'oauth2',
    sandbox: process.env.PAYPAL_SANDBOX_MODE === 'true',
    baseUrl: process.env.PAYPAL_API_BASE,
  },
  supabase: {
    type: 'database',
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  },
  openai: {
    type: 'llm',
    model: process.env.OPENAI_MODEL,
  },
};
