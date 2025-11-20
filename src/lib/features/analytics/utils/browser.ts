// Browser detection utilities
export function detectBrowser(): string {
  if (typeof window === 'undefined') return 'server';

  const userAgent = window.navigator.userAgent;

  if (userAgent.includes('Chrome')) return 'chrome';
  if (userAgent.includes('Firefox')) return 'firefox';
  if (userAgent.includes('Safari')) return 'safari';
  if (userAgent.includes('Edge')) return 'edge';

  return 'unknown';
}

export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(window.navigator.userAgent);
}

export default { detectBrowser, isMobile };
