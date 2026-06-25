import { NextRequest, NextResponse } from 'next/server';
import { chat } from '@/lib/assistant/provider';
import type { AssistantMessage } from '@/lib/types';
import { generateId } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const { message, history = [] } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
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
