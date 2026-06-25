'use client';

import { useEffect, useState } from 'react';
import type { CampaignState } from '@/lib/types';

export function useCampaign() {
  const [campaign, setCampaign] = useState<CampaignState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      const stored = localStorage.getItem('currentCampaign');
      if (stored) {
        try {
          setCampaign(JSON.parse(stored));
        } catch {
          setCampaign(null);
        }
      }
      setLoading(false);
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  return { campaign, loading };
}
