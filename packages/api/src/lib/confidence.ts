const MAX_AGE_MS = 9 * 24 * 60 * 60 * 1000; // 9 days = confidence 0

export function computeConfidence(lastCrawled: Date): number {
  const ageMs = Date.now() - lastCrawled.getTime();
  if (ageMs <= 0) return 1;
  const score = 1 - ageMs / MAX_AGE_MS;
  return Math.max(0, Math.min(1, Math.round(score * 1000) / 1000));
}

export function computeFreshness(lastCrawled: Date): string {
  const ageMs = Date.now() - lastCrawled.getTime();
  const minutes = Math.floor(ageMs / (60 * 1000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
