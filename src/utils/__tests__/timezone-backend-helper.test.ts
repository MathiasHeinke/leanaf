import { describe, it, expect } from 'vitest';
import { getDateBoundariesInTimezone } from '../timezone-backend-helper';

const fmtLocal = (iso: string, timeZone: string) => {
  const d = new Date(iso);
  // sv-SE gives YYYY-MM-DD HH:mm:ss
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(d);
};

describe('timezone-backend-helper getDateBoundariesInTimezone', () => {
  const tz = 'Europe/Berlin';

  it('returns half-open [start, nextDayStart) around DST start (spring forward)', () => {
    const date = '2025-03-30'; // DST starts in EU
    const { start, end } = getDateBoundariesInTimezone(date, tz);

    // Should map to 00:00:00 local and next day 00:00:00 local
    expect(fmtLocal(start, tz)).toBe('2025-03-30 00:00:00');
    expect(fmtLocal(end, tz)).toBe('2025-03-31 00:00:00');
  });

  it('returns half-open [start, nextDayStart) around DST end (fall back)', () => {
    const date = '2025-10-26'; // DST ends in EU
    const { start, end } = getDateBoundariesInTimezone(date, tz);

    expect(fmtLocal(start, tz)).toBe('2025-10-26 00:00:00');
    expect(fmtLocal(end, tz)).toBe('2025-10-27 00:00:00');
  });

  it('works for a regular day', () => {
    const date = '2025-02-15';
    const { start, end } = getDateBoundariesInTimezone(date, tz);

    expect(fmtLocal(start, tz)).toBe('2025-02-15 00:00:00');
    expect(fmtLocal(end, tz)).toBe('2025-02-16 00:00:00');
  });
});
