let lastKey = "";
let lastAt = 0;

export function safeToast(key: string, show: (msg: string) => void, msg: string, minGapMs = 1200) {
  const now = Date.now();
  if (key === lastKey && now - lastAt < minGapMs) return; // throttle duplicate toasts
  lastKey = key;
  lastAt = now;
  show(msg);
}
