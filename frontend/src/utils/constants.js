// ── Community Intelligence Feed Pool ───────────────────────────────────────
export const THREAT_FEED_POOL = [
  { id: 1, type: 'danger',  message: 'Unsafe activity reported near Nehru Place underpass', time: 'Just now' },
  { id: 2, type: 'warning', message: 'Poor street lighting detected on Ring Road stretch', time: '2 mins ago' },
  { id: 3, type: 'info',    message: 'Crowded safe area — Connaught Place Inner Circle', time: '4 mins ago' },
  { id: 4, type: 'warning', message: 'Isolated stretch reported near Tughlaqabad forests', time: '6 mins ago' },
  { id: 5, type: 'danger',  message: 'Multiple unsafe reports on Wazirabad Bridge night route', time: '9 mins ago' },
  { id: 6, type: 'info',    message: 'Community patrol active in Saket District Centre', time: '11 mins ago' },
  { id: 7, type: 'warning', message: 'Caution: Auto-rickshaw dispute reported near Lajpat Nagar', time: '14 mins ago' },
  { id: 8, type: 'info',    message: 'Police PCR van spotted near GTB Nagar metro', time: '17 mins ago' },
];

// ── Community Alerts Pool ──────────────────────────────────────────────────
export const COMMUNITY_ALERTS_POOL = [
  { id: 1,  area: 'Nehru Place',         issue: 'Suspicious vehicle parked near ATM',       time: '3 mins ago' },
  { id: 2,  area: 'Lajpat Nagar',        issue: 'Street lights out on Block C road',        time: '8 mins ago' },
  { id: 3,  area: 'Saket Market',         issue: 'Crowded — high foot traffic, safe zone',   time: '11 mins ago' },
  { id: 4,  area: 'Tughlaqabad Road',     issue: 'Isolated stretch — avoid after 9 PM',      time: '15 mins ago' },
  { id: 5,  area: 'CP Inner Circle',      issue: 'Police patrolling — area is safe',         time: '20 mins ago' },
  { id: 6,  area: 'Wazirabad Bridge',     issue: 'Unsafe incident reported — avoid route',   time: '22 mins ago' },
  { id: 7,  area: 'GTB Nagar Metro',      issue: 'Well-lit, CCTV active, safe for night',    time: '28 mins ago' },
  { id: 8,  area: 'Dwarka Sector 10',     issue: 'Community complaint: broken CCTV camera',  time: '33 mins ago' },
  { id: 9,  area: 'Hauz Khas Village',    issue: 'Late night crowd — stay with groups',       time: '38 mins ago' },
  { id: 10, area: 'Rohini Sector 3',      issue: 'Safe zone confirmed by 4 community users', time: '42 mins ago' },
  { id: 11, area: 'Shahdara Flyover',     issue: 'High risk — multiple reports this week',   time: '47 mins ago' },
  { id: 12, area: 'AIIMS Flyover',        issue: 'Well-monitored — hospital vicinity',        time: '52 mins ago' },
];

export const THREAT_FEED = THREAT_FEED_POOL.slice(0, 3);
export const COMMUNITY_ALERTS = COMMUNITY_ALERTS_POOL.slice(0, 2);

// ── Recent Trips ──────────────────────────────────────────────────────────
export const RECENT_TRIPS = [
  { id: 1, to: 'Connaught Place',    date: 'Today',     score: 91 },
  { id: 2, to: 'Saket District Ctr', date: 'Yesterday', score: 84 },
  { id: 3, to: 'Lajpat Nagar Mkt',  date: 'May 5',     score: 78 },
  { id: 4, to: 'GTB Nagar Metro',   date: 'May 4',     score: 95 },
];
