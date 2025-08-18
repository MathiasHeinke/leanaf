export function dayRangeISO(date = new Date(), tzOffsetMin?: number) {
  // wenn du die User-TZ hast, gib sie rein; sonst Browserzeit
  const d = new Date(date);
  const off = tzOffsetMin ?? -d.getTimezoneOffset();
  const start = new Date(
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, -off, 0, 0)
  );
  const end = new Date(start); 
  end.setUTCDate(start.getUTCDate() + 1);

  return { 
    startISO: start.toISOString(), 
    endISO: end.toISOString()
  };
}