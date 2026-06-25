import { NextRequest, NextResponse } from 'next/server';
import { chat, chatStream } from '@/lib/assistant/provider';
import type { AssistantMessage } from '@/lib/types';
import { generateId } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const { message, history = [], stream = false } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

    if (stream) {
      const encoder = new TextEncoder();
      const generator = chatStream(history as AssistantMessage[], message.trim());

      const streamResponse = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of generator) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          } catch (err) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: (err as Error).message })}\n\n`));
          } finally {
            controller.close();
          }
        },
      });

      return new Response(streamResponse, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    const { reply, model } = await chat(history as AssistantMessage[], message.trim());

    const userMsg: AssistantMessage = {
      id: generateId(),
      role: 'user',
      content: message.trim(),
      timestamp: new Date().toISOString(),
    };

    const assistantMsg: AssistantMessage = {
      id: generateId(),
      role: 'assistant',
      content: reply,
      timestamp: new Date().toISOString(),
      model,
    };

    return NextResponse.json({
      messages: [userMsg, assistantMsg],
      model,
      openaiEnabled: process.env.LLM_PROVIDER === 'openai' && !!process.env.OPENAI_API_KEY,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
