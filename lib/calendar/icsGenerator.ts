import type { CampaignState } from '@/lib/types';

function formatDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

export function generateICS(campaign: CampaignState): string {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() + 1);
  const end = new Date(start);
  end.setDate(end.getDate() + 28);

  const events = [
    { title: 'Campaign Launch', offset: 0, duration: 1 },
    { title: 'Creative A/B Test Start', offset: 3, duration: 7 },
    { title: 'Mid-Campaign Review', offset: 14, duration: 1 },
    { title: 'Optimization Phase', offset: 15, duration: 7 },
    { title: 'Final Performance Report', offset: 28, duration: 1 },
  ];

  const icsEvents = events
    .map((evt) => {
      const evtStart = new Date(start);
      evtStart.setDate(evtStart.getDate() + evt.offset);
      const evtEnd = new Date(evtStart);
      evtEnd.setDate(evtEnd.getDate() + evt.duration);

      return [
        'BEGIN:VEVENT',
        `UID:${campaign.id}-${evt.offset}@adautonomy.local`,
        `DTSTAMP:${formatDate(now)}`,
        `DTSTART:${formatDate(evtStart)}`,
        `DTEND:${formatDate(evtEnd)}`,
        `SUMMARY:${campaign.brief.productName} - ${evt.title}`,
        `DESCRIPTION:AdAutonomy autonomous campaign milestone`,
        'END:VEVENT',
      ].join('\r\n');
    })
    .join('\r\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AdAutonomy//Campaign Timeline//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    icsEvents,
    'END:VCALENDAR',
  ].join('\r\n');
}
