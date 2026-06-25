'use client';

import { useEffect, useRef, useState } from 'react';
import type { PaymentRecord } from '@/lib/types';
import { Loader2 } from 'lucide-react';

type PayPalButtons = {
  render: (container: HTMLElement) => Promise<void>;
  close: () => void;
  isEligible?: () => boolean;
};

type PayPalSDK = {
  Buttons: (config: {
    style?: Record<string, string>;
    createOrder: () => Promise<string>;
    onApprove: (data: { orderID: string }) => Promise<void>;
    onError?: (err: unknown) => void;
    onCancel?: () => void;
  }) => PayPalButtons;
};

declare global {
  interface Window {
    paypal?: PayPalSDK;
  }
}

interface PayPalCheckoutProps {
  amount: number;
  currency?: string;
  label?: string;
  onSuccess?: (payment: PaymentRecord) => void;
}

function waitForPayPal(timeoutMs = 15000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.paypal) {
      resolve();
      return;
    }

    const started = Date.now();
    const tick = () => {
      if (window.paypal) {
        resolve();
        return;
      }
      if (Date.now() - started > timeoutMs) {
        reject(new Error('PayPal SDK timed out'));
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

function loadPayPalSdk(clientId: string, currency: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.paypal) return Promise.resolve();

  const url = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${currency}&intent=capture&components=buttons&disable-funding=card,credit,paylater`;

  return new Promise((resolve, reject) => {
    const existing = document.getElementById('paypal-sdk') as HTMLScriptElement | null;

    if (existing) {
      waitForPayPal().then(resolve).catch(reject);
      return;
    }

    const script = document.createElement('script');
    script.id = 'paypal-sdk';
    script.src = url;
    script.async = true;
    script.setAttribute('data-sdk-integration-source', 'integrationbuilder_ac');
    script.onload = () => {
      waitForPayPal().then(resolve).catch(reject);
    };
    script.onerror = () => reject(new Error('Failed to load PayPal SDK'));
    document.body.appendChild(script);
  });
}

export function PayPalCheckout({
  amount,
  currency = 'USD',
  label,
  onSuccess,
}: PayPalCheckoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<PayPalButtons | null>(null);
  const onSuccessRef = useRef(onSuccess);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState<PaymentRecord | null>(null);

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const safeAmount = Math.max(1, Number(amount.toFixed(2)));

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    if (!clientId) {
      setError('Set NEXT_PUBLIC_PAYPAL_CLIENT_ID in .env.local and restart npm run dev');
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function setup() {
      setLoading(true);
      setError(null);

      try {
        await loadPayPalSdk(clientId!, currency);
        if (cancelled || !containerRef.current || !window.paypal) return;

        buttonsRef.current?.close?.();
        containerRef.current.innerHTML = '';

        const buttons = window.paypal.Buttons({
          style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' },
          createOrder: async () => {
            setProcessing(true);
            setError(null);
            try {
              const res = await fetch('/api/payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'checkout', amount: safeAmount, currency }),
              });
              const data = await res.json();
              if (!res.ok) {
                throw new Error(data.error || 'Failed to create PayPal order');
              }
              return data.payment.id as string;
            } catch (err) {
              const message = (err as Error).message;
              setError(message);
              throw err;
            } finally {
              setProcessing(false);
            }
          },
          onApprove: async (data) => {
            setProcessing(true);
            setError(null);
            try {
              const res = await fetch('/api/payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'approve',
                  paymentId: data.orderID,
                  amount: safeAmount,
                  allowMock: false,
                }),
              });
              const result = await res.json();
              if (!res.ok) {
                throw new Error(result.error || 'Payment capture failed');
              }

              setCompleted(result.payment);
              onSuccessRef.current?.(result.payment);
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setProcessing(false);
            }
          },
          onError: (err) => {
            setProcessing(false);
            const message =
              err && typeof err === 'object' && 'message' in err
                ? String((err as { message: string }).message)
                : 'PayPal checkout error';
            setError(message);
          },
          onCancel: () => {
            setProcessing(false);
            setError(null);
          },
        });

        if (buttons.isEligible && !buttons.isEligible()) {
          setError('PayPal is not available in this browser. Try Chrome and allow popups.');
          setLoading(false);
          return;
        }

        buttonsRef.current = buttons;
        if (!cancelled) setLoading(false);
        await buttons.render(containerRef.current);
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message);
          setLoading(false);
        }
      }
    }

    setup();

    return () => {
      cancelled = true;
      buttonsRef.current?.close?.();
      buttonsRef.current = null;
    };
  }, [clientId, currency, safeAmount]);

  if (completed) {
    return (
      <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-sm">
        <p className="font-semibold text-green-400">Payment captured via PayPal Sandbox</p>
        <p className="text-muted-foreground mt-1">
          ${completed.amount.toFixed(2)} {completed.currency} · {completed.id}
        </p>
        {completed.receipt && (
          <p className="text-xs text-muted-foreground mt-1">Receipt: {completed.receipt}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 isolate">
      {label && <p className="text-sm text-muted-foreground">{label}</p>}
      <p className="text-lg font-semibold">
        ${safeAmount.toFixed(2)}{' '}
        <span className="text-sm font-normal text-muted-foreground">{currency}</span>
      </p>

      <div className="relative min-h-[55px] w-full pointer-events-auto">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading PayPal…
          </div>
        )}
        {processing && !loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2 mb-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing payment…
          </div>
        )}
        <div ref={containerRef} className="min-h-[55px] w-full" />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <p className="text-xs text-muted-foreground">
        Log in with a <strong>sandbox Personal (buyer)</strong> account from{' '}
        <a
          href="https://developer.paypal.com/dashboard/accounts"
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-400 hover:underline"
        >
          PayPal Sandbox Accounts
        </a>
        . Allow popups for localhost.
      </p>
    </div>
  );
}
