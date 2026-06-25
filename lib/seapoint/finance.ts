import type {
  CampaignState,
  PaymentRecord,
  SeapointBookkeepingEntry,
  SeapointFinanceSnapshot,
  SeapointInvoice,
} from '@/lib/types';

const DEFAULT_OPENING_CASH = 250_000;
const DEFAULT_BASELINE_BURN = 18_000;
const DEFAULT_APPROVAL_THRESHOLD = 1_000;
const DEFAULT_TIMEOUT_MS = 10_000;

export async function buildSeapointFinanceSnapshot(
  campaign: CampaignState
): Promise<SeapointFinanceSnapshot> {
  const openingCash = readPositiveNumber(process.env.SEAPOINT_OPENING_CASH, DEFAULT_OPENING_CASH);
  const baselineBurn = readPositiveNumber(
    process.env.SEAPOINT_MONTHLY_BASELINE_BURN,
    DEFAULT_BASELINE_BURN
  );
  const approvalThreshold = readPositiveNumber(
    process.env.SEAPOINT_APPROVAL_THRESHOLD,
    DEFAULT_APPROVAL_THRESHOLD
  );
  const transactions = latestPaymentStates(campaign.payments);
  const bookkeeping = transactions.map(toBookkeepingEntry);
  const invoices = transactions.filter(isOutflow).map((payment) =>
    toInvoice(payment, approvalThreshold)
  );

  const cashOutflows = transactions.filter(isOutflow).reduce((sum, item) => sum + item.amount, 0);
  const cashInflows = transactions
    .filter((item) => item.type === 'refund')
    .reduce((sum, item) => sum + item.amount, 0);
  const projectedRevenue = campaign.simulation?.projectedRevenue ?? 0;
  const currentCash = openingCash - cashOutflows + cashInflows;
  const monthlyBurn = baselineBurn + cashOutflows;
  const pendingApprovals = invoices.filter((invoice) => invoice.status === 'needs_approval').length;

  const snapshot: SeapointFinanceSnapshot = {
    provider: 'local',
    generatedAt: new Date().toISOString(),
    currency: transactions[0]?.currency ?? 'USD',
    openingCash: roundMoney(openingCash),
    currentCash: roundMoney(currentCash),
    projectedRevenue: roundMoney(projectedRevenue),
    campaignSpend: roundMoney(cashOutflows),
    netCashFlow: roundMoney(projectedRevenue + cashInflows - cashOutflows),
    monthlyBurn: roundMoney(monthlyBurn),
    runwayMonths: round(currentCash / Math.max(1, monthlyBurn), 1),
    approvalThreshold: roundMoney(approvalThreshold),
    pendingApprovals,
    bookkeeping,
    invoices,
    sync: {
      status: 'local',
      message: 'Seapoint finance controls calculated locally',
    },
  };

  if (
    process.env.SEAPOINT_WORKFLOW_ENABLED !== 'true' ||
    !process.env.SEAPOINT_WEBHOOK_URL
  ) {
    return snapshot;
  }

  return syncSeapointSnapshot(campaign, snapshot);
}

async function syncSeapointSnapshot(
  campaign: CampaignState,
  snapshot: SeapointFinanceSnapshot
): Promise<SeapointFinanceSnapshot> {
  const endpoint = process.env.SEAPOINT_WEBHOOK_URL;
  if (!endpoint) return snapshot;

  const controller = new AbortController();
  const timeoutMs = readPositiveNumber(process.env.SEAPOINT_REQUEST_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authorizationHeader(),
      },
      body: JSON.stringify({
        event: 'adautonomy.finance_snapshot.created',
        version: '1.0',
        campaign: {
          id: campaign.id,
          productName: campaign.brief.productName,
          goal: campaign.brief.campaignGoal,
        },
        finance: snapshot,
      }),
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 200);
      throw new Error(`Webhook returned ${response.status}${detail ? `: ${detail}` : ''}`);
    }

    const requestId =
      response.headers.get('x-request-id') ??
      response.headers.get('x-seapoint-request-id') ??
      undefined;

    return {
      ...snapshot,
      provider: 'seapoint-bridge',
      sync: {
        status: 'synced',
        requestId,
        message: 'Finance snapshot delivered to the configured Seapoint bridge',
      },
    };
  } catch (error) {
    const message =
      (error as Error).name === 'AbortError'
        ? `Seapoint bridge timed out after ${timeoutMs}ms`
        : (error as Error).message;

    return {
      ...snapshot,
      sync: {
        status: 'failed',
        message,
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

function latestPaymentStates(payments: PaymentRecord[]): PaymentRecord[] {
  const byId = new Map<string, PaymentRecord>();
  for (const payment of payments) {
    const existing = byId.get(payment.id);
    if (!existing || Date.parse(payment.timestamp) >= Date.parse(existing.timestamp)) {
      byId.set(payment.id, payment);
    }
  }
  return Array.from(byId.values()).filter((payment) =>
    ['completed', 'refunded'].includes(payment.status)
  );
}

function toBookkeepingEntry(payment: PaymentRecord): SeapointBookkeepingEntry {
  const categoryByType: Record<PaymentRecord['type'], string> = {
    checkout: 'Advertising & marketing',
    subscription: 'Software & subscriptions',
    payout: 'Contractors & creative services',
    refund: 'Refunds & credits',
  };

  return {
    id: `book-${payment.id}`,
    paymentId: payment.id,
    description: `${titleCase(payment.type)} transaction`,
    category: categoryByType[payment.type],
    direction: payment.type === 'refund' ? 'inflow' : 'outflow',
    amount: roundMoney(payment.amount),
    currency: payment.currency,
    confidence: 0.96,
    status: 'categorised',
  };
}

function toInvoice(payment: PaymentRecord, approvalThreshold: number): SeapointInvoice {
  const needsApproval = payment.amount >= approvalThreshold;
  return {
    id: `invoice-${payment.id}`,
    paymentId: payment.id,
    supplier: supplierFor(payment.type),
    description: descriptionFor(payment.type),
    amount: roundMoney(payment.amount),
    currency: payment.currency,
    dueDate: addDays(payment.timestamp, 7),
    status: needsApproval ? 'needs_approval' : 'approved',
    approvalReason: needsApproval
      ? `Amount exceeds the ${payment.currency} ${approvalThreshold.toFixed(2)} approval threshold`
      : 'Auto-approved within spend controls',
  };
}

function isOutflow(payment: PaymentRecord): boolean {
  return payment.type !== 'refund';
}

function supplierFor(type: PaymentRecord['type']): string {
  if (type === 'checkout') return 'Campaign Media Network';
  if (type === 'subscription') return 'Ad Technology Services';
  if (type === 'payout') return 'Creative Partner';
  return 'Customer Refund';
}

function descriptionFor(type: PaymentRecord['type']): string {
  if (type === 'checkout') return 'Paid media campaign spend';
  if (type === 'subscription') return 'Campaign software subscription';
  if (type === 'payout') return 'Creative production payout';
  return 'Refund';
}

function authorizationHeader(): Record<string, string> {
  const token = process.env.SEAPOINT_WEBHOOK_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function addDays(timestamp: string, days: number): string {
  const date = new Date(timestamp);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function readPositiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function roundMoney(value: number): number {
  return round(value, 2);
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
