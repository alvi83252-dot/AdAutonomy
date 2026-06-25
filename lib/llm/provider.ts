import { mockComplete } from './mockProvider';
import { SYSTEM_PROMPTS } from './prompts';

export type LLMResponse = {
  content: string;
  model: string;
  tokensUsed: number;
  confidence: number;
  latencyMs: number;
};

export type LLMOptions = {
  task?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
};

type RetryConfig = {
  maxRetries: number;
  baseDelayMs: number;
};

const RETRY: RetryConfig = {
  maxRetries: 2,
  baseDelayMs: 1000,
};

const RATE_LIMIT_CODES = new Set([429, 500, 502, 503, 504]);

function getSystemPrompt(task?: string): string {
  if (task && SYSTEM_PROMPTS[task]) return SYSTEM_PROMPTS[task];
  return 'You are an AI assistant for the AdAutonomy autonomous advertising platform. Output valid JSON when requested.';
}

function usesJSONMode(task?: string): boolean {
  if (!task) return false;
  return ['brief', 'creative', 'audience', 'simulation', 'safety', 'feedback', 'investor', 'video'].includes(task);
}

function estimateConfidence(content: string, task?: string): number {
  if (!content) return 0.3;
  if (!task) return 0.85;
  try {
    JSON.parse(content);
    return 0.92;
  } catch {
    try {
      const cleaned = content.replace(/```json\s*/g, '').replace(/\s*```/g, '').trim();
      JSON.parse(cleaned);
      return 0.88;
    } catch {
      return 0.6;
    }
  }
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function complete(prompt: string, options: LLMOptions = {}): Promise<LLMResponse> {
  const provider = process.env.LLM_PROVIDER || 'mock';

  if (provider === 'openai' && process.env.OPENAI_API_KEY) {
    const start = Date.now();
    try {
      const result = await openaiComplete(prompt, options);
      return { ...result, latencyMs: Date.now() - start };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[LLM] OpenAI failed (${msg}), falling back to mock`);
      const mock = await mockComplete(prompt, options.task);
      return { ...mock, latencyMs: Date.now() - start };
    }
  }

  const start = Date.now();
  const mock = await mockComplete(prompt, options.task);
  return { ...mock, latencyMs: Date.now() - start };
}

async function openaiComplete(prompt: string, options: LLMOptions): Promise<LLMResponse> {
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const systemPrompt = options.systemPrompt || getSystemPrompt(options.task);
  const jsonMode = usesJSONMode(options.task);

  const messages: { role: string; content: string }[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt },
  ];

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 2048,
  };

  if (jsonMode) {
    body.response_format = { type: 'json_object' };
    if (!systemPrompt.toLowerCase().includes('json')) {
      messages[0].content += '\nAlways output valid JSON.';
    }
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= RETRY.maxRetries; attempt++) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        const errorMsg = `OpenAI API error ${response.status}: ${errorText.slice(0, 200)}`;

        if (RATE_LIMIT_CODES.has(response.status) && attempt < RETRY.maxRetries) {
          const backoff = RETRY.baseDelayMs * Math.pow(2, attempt);
          console.warn(`[LLM] Rate limited (${response.status}), retrying in ${backoff}ms (attempt ${attempt + 1}/${RETRY.maxRetries})`);
          await delay(backoff);
          lastError = new Error(errorMsg);
          continue;
        }

        throw new Error(errorMsg);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      const confidence = estimateConfidence(content, options.task);

      return {
        content,
        model: data.model || model,
        tokensUsed: data.usage?.total_tokens || 0,
        confidence,
        latencyMs: 0,
      };
    } catch (err) {
      if (err instanceof Error && RATE_LIMIT_CODES.has(parseStatus(err))) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error('OpenAI request failed after retries');
}

function parseStatus(err: Error): number {
  const match = err.message.match(/OpenAI API error (\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

export function parseJSON<T>(content: string): T {
  if (!content) throw new Error('Empty content');
  try {
    return JSON.parse(content) as T;
  } catch {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]) as T;
    }
    const arrayMatch = content.match(/\[[\s\S]*\]/);
    const objectMatch = content.match(/\{[\s\S]*\}/);
    const fallback = arrayMatch || objectMatch;
    if (fallback) {
      return JSON.parse(fallback[0]) as T;
    }
    throw new Error('Could not parse JSON from content');
  }
}
