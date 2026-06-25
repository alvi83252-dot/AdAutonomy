import { mockComplete } from './mockProvider';

export type LLMResponse = {
  content: string;
  model: string;
  tokensUsed: number;
  confidence: number;
};

export type LLMOptions = {
  task?: string;
  temperature?: number;
  maxTokens?: number;
};

export async function complete(prompt: string, options: LLMOptions = {}): Promise<LLMResponse> {
  const provider = process.env.LLM_PROVIDER || 'mock';

  if (provider === 'openai' && process.env.OPENAI_API_KEY) {
    try {
      return await openaiComplete(prompt, options);
    } catch {
      console.warn('[LLM] OpenAI failed, falling back to mock');
      return mockComplete(prompt, options.task);
    }
  }

  return mockComplete(prompt, options.task);
}

async function openaiComplete(prompt: string, options: LLMOptions): Promise<LLMResponse> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 1024,
    }),
  });

  if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  return {
    content,
    model: data.model || 'gpt-4o-mini',
    tokensUsed: data.usage?.total_tokens || 0,
    confidence: 0.9,
  };
}

export function parseJSON<T>(content: string): T {
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  const jsonStr = jsonMatch ? jsonMatch[1] : content;
  return JSON.parse(jsonStr) as T;
}
