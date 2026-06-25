import { complete } from '@/lib/llm/provider';
import { SYSTEM_PROMPTS } from '@/lib/llm/prompts';
import type { AssistantMessage } from '@/lib/types';

const MOCK_RESPONSES: Record<string, string> = {
  campaign: "To launch a campaign, go to **Home**, enter your product name, target market, and goal, then click **Launch Autonomous Campaign**. Our 10 AI agents will handle the rest!",
  video: "Head to **Videos** in the navbar. Upload a product image, add a description and target audience, then click **Generate Ad Video**. You'll get a voiced HD ad you can download or share.",
  social: "After generating your video, use **Publish to Social** to auto-schedule posts to Instagram, TikTok, LinkedIn, X, and YouTube. Add API keys in `.env.local` later for live publishing.",
  download: "On the **Videos** page, after your ad is generated, click **Download Video** to save the `.webm` file. You can also use **Share** for native device sharing.",
  openai: "When you're ready, add your OpenAI API key to `.env.local`:\n```\nLLM_PROVIDER=openai\nOPENAI_API_KEY=sk-your-key\n```\nRestart the dev server — I'll use GPT-4o-mini for smarter responses, video scripts, TTS voiceover, and campaign copy.",
  hello: "Hello! I'm your AdAutonomy Personal Assistant. I can help you launch campaigns, create ad videos, publish to social media, and more. What would you like to do today?",
};

function mockAssistantReply(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('video') || lower.includes('ad')) return MOCK_RESPONSES.video;
  if (lower.includes('social') || lower.includes('instagram') || lower.includes('tiktok') || lower.includes('post')) return MOCK_RESPONSES.social;
  if (lower.includes('download') || lower.includes('export')) return MOCK_RESPONSES.download;
  if (lower.includes('openai') || lower.includes('api key') || lower.includes('api')) return MOCK_RESPONSES.openai;
  if (lower.includes('campaign') || lower.includes('launch')) return MOCK_RESPONSES.campaign;
  if (lower.match(/^(hi|hello|hey)\b/)) return MOCK_RESPONSES.hello;

  return `I can help with campaigns, ad videos, social publishing, and downloads. Try asking:\n\n• "How do I create an ad video?"\n• "Publish to Instagram and TikTok"\n• "How do I add my OpenAI API key?"\n\n_Add your OpenAI API key later for smarter, contextual replies._`;
}

export async function chat(
  messages: AssistantMessage[],
  userMessage: string
): Promise<{ reply: string; model: string }> {
  const hasOpenAI = process.env.LLM_PROVIDER === 'openai' && !!process.env.OPENAI_API_KEY;

  if (hasOpenAI) {
    try {
      const history = messages.slice(-10).map((m) => `${m.role}: ${m.content}`).join('\n');
      const prompt = `Previous conversation:\n${history}\n\nUser: ${userMessage}\n\nRespond as the AdAutonomy Personal Assistant. Be concise and action-oriented.`;

      const response = await complete(prompt, {
        task: 'assistant',
        temperature: 0.7,
        maxTokens: 800,
      });

      return {
        reply: response.content || 'Sorry, I could not generate a response.',
        model: response.model,
      };
    } catch {
      return {
        reply: mockAssistantReply(userMessage),
        model: 'adautonomy-assistant-fallback',
      };
    }
  }

  return {
    reply: mockAssistantReply(userMessage),
    model: 'adautonomy-assistant-mock',
  };
}

export async function* chatStream(
  messages: AssistantMessage[],
  userMessage: string
): AsyncGenerator<string> {
  const hasOpenAI = process.env.LLM_PROVIDER === 'openai' && !!process.env.OPENAI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (hasOpenAI && openaiKey) {
    try {
      const history = messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: SYSTEM_PROMPTS.assistant },
            ...history,
            { role: 'user', content: userMessage },
          ],
          temperature: 0.7,
          max_tokens: 800,
          stream: true,
        }),
      });

      if (!response.ok) {
        yield mockAssistantReply(userMessage);
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const data = trimmed.slice(6);
            if (data === '[DONE]') return;

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) yield delta;
            } catch {
              /* skip malformed chunks */
            }
          }
        }
      }
      return;
    } catch {
      yield mockAssistantReply(userMessage);
      return;
    }
  }

  yield mockAssistantReply(userMessage);
}
