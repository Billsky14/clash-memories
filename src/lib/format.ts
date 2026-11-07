function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatDurationMs(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  const clock = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  return days > 0 ? `${days}d ${clock}` : clock;
}

export function formatCountdown(endsAt: number, now: number): string {
  return formatDurationMs(endsAt - now);
}

export function formatRelativeTime(timestamp: number, now: number): string {
  const difference = Math.max(0, now - timestamp);

  if (difference < 60_000) return 'baru saja';

  const minutes = Math.floor(difference / 60_000);
  if (minutes < 60) return `${minutes} menit lalu`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;

  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}
