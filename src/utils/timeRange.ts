export function todayRangeISO(tzOffsetMin = new Date().getTimezoneOffset()) {
  // Lokales heute → in UTC-ISO
  const now = new Date();
  const start = new Date(now); 
  start.setHours(0,0,0,0);
  const end = new Date(now);   
  end.setHours(23,59,59,999);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function withWatchdog<T>(p: Promise<T>, ms = 5000) {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("watchdog-timeout")), ms);
    p.then(v => { clearTimeout(t); resolve(v); }).catch(e => { clearTimeout(t); reject(e); });
  });
}