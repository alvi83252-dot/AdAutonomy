import { NextRequest, NextResponse } from 'next/server';
import { createCheckout, approvePayment, refundPayment } from '@/lib/agents/paymentAgent';

export async function POST(req: NextRequest) {
  try {
    const { action, amount, paymentId } = await req.json();

    switch (action) {
      case 'checkout': {
        const payment = await createCheckout(amount || 100);
        return NextResponse.json({ payment });
      }
      case 'approve': {
        const payment = await approvePayment(paymentId, amount || 100);
        return NextResponse.json({ payment });
      }
      case 'refund': {
        const payment = await refundPayment(paymentId, amount || 50);
        return NextResponse.json({ payment });
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
