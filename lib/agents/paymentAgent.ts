import { sendMessage } from '@/lib/agents/messaging';
import { updateAgentMemory } from '@/lib/storage/db';
import { buildSeapointFinanceSnapshot } from '@/lib/seapoint/finance';
import type { CampaignState, PaymentRecord } from '@/lib/types';
import { generateId } from '@/lib/utils';

const PAYPAL_BASE = process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com';

async function getPayPalToken(): Promise<string | null> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) return null;

  try {
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.access_token;
  } catch {
    return null;
  }
}

export async function createCheckout(amount: number, currency = 'USD'): Promise<PaymentRecord> {
  const token = await getPayPalToken();

  if (token) {
    try {
      const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [{ amount: { currency_code: currency, value: amount.toFixed(2) } }],
        }),
      });

      if (res.ok) {
        const order = await res.json();
        return {
          id: order.id,
          type: 'checkout',
          amount,
          currency,
          status: 'pending',
          timestamp: new Date().toISOString(),
        };
      }
    } catch {
      /* fall through to mock */
    }
  }

  return mockPayment('checkout', amount, currency);
}

type ApprovePaymentOptions = {
  allowMock?: boolean;
  fallbackAmount?: number;
};

export async function approvePayment(
  paymentId: string,
  options?: number | ApprovePaymentOptions
): Promise<PaymentRecord> {
  const opts: ApprovePaymentOptions =
    typeof options === 'number' ? { fallbackAmount: options } : (options ?? {});
  const allowMock = opts.allowMock ?? process.env.ENABLE_PAYPAL_MOCK_FALLBACK !== 'false';
  const fallbackAmount = opts.fallbackAmount ?? 100;
  const token = await getPayPalToken();

  if (token && !paymentId.startsWith('mock-')) {
    try {
      const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${paymentId}/capture`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (res.ok) {
        return {
          id: paymentId,
          type: 'checkout',
          amount: parseFloat(data.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || '0'),
          currency: data.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.currency_code || 'USD',
          status: 'completed',
          receipt: generateReceipt(paymentId, 'checkout'),
          timestamp: new Date().toISOString(),
        };
      }

      const issue = data.details?.[0]?.issue || data.message || 'Capture failed';
      if (!allowMock) {
        throw new Error(issue);
      }
    } catch (err) {
      if (!allowMock) throw err;
    }
  }

  if (!allowMock) {
    throw new Error('PayPal credentials missing or invalid order');
  }

  return {
    ...mockPayment('checkout', fallbackAmount, 'USD'),
    id: paymentId,
    status: 'completed',
  };
}

export async function refundPayment(paymentId: string, amount: number): Promise<PaymentRecord> {
  if (process.env.ENABLE_PAYPAL_MOCK_FALLBACK !== 'false') {
    return {
      id: generateId(),
      type: 'refund',
      amount,
      currency: 'USD',
      status: 'refunded',
      receipt: `REFUND-${paymentId}`,
      timestamp: new Date().toISOString(),
    };
  }
  return mockPayment('refund', amount, 'USD');
}

export function generateReceipt(paymentId: string, type: string): string {
  return `RCPT-${type.toUpperCase()}-${paymentId.slice(0, 8)}-${Date.now()}`;
}

export async function simulateSubscription(amount: number): Promise<PaymentRecord> {
  return mockPayment('subscription', amount, 'USD');
}

export async function simulatePayout(amount: number): Promise<PaymentRecord> {
  return mockPayment('payout', amount, 'USD');
}

function mockPayment(type: PaymentRecord['type'], amount: number, currency: string): PaymentRecord {
  const id = `mock-${generateId()}`;
  return {
    id,
    type,
    amount,
    currency,
    status: 'completed',
    receipt: generateReceipt(id, type),
    timestamp: new Date().toISOString(),
  };
}

export async function runPaymentAgent(campaign: CampaignState): Promise<CampaignState> {
  const budget = (campaign.extractedBrief?.budget as number) || 5000;
  const adSpend = budget * 0.6;
  const subscription = budget * 0.2;
  const payout = budget * 0.1;

  const payments: PaymentRecord[] = [];

  const checkout = await createCheckout(adSpend);
  payments.push(checkout);

  const approved = await approvePayment(checkout.id, checkout.amount);
  payments.push(approved);

  const sub = await simulateSubscription(subscription);
  payments.push(sub);

  const pay = await simulatePayout(payout);
  payments.push(pay);

  const campaignWithPayments: CampaignState = {
    ...campaign,
    payments,
    currentStep: 7,
    updatedAt: new Date().toISOString(),
  };
  const finance = await buildSeapointFinanceSnapshot(campaignWithPayments);

  await sendMessage('PaymentAgent', 'InvestorAgent', 'response', {
    totalPayments: payments.length,
    adSpend,
    currentCash: finance.currentCash,
    monthlyBurn: finance.monthlyBurn,
    runwayMonths: finance.runwayMonths,
    pendingApprovals: finance.pendingApprovals,
    seapointSync: finance.sync.status,
  });

  updateAgentMemory('PaymentAgent', {
    confidence: finance.sync.status === 'failed' ? 0.75 : 0.9,
    notes: [
      `Processed ${payments.length} transactions`,
      `Seapoint finance controls: ${finance.sync.status}`,
    ],
  });

  return { ...campaignWithPayments, finance };
}
