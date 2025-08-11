export function humanize(raw: string, ask: string = 'Passt das so, oder soll ich tiefer reingehen?') {
  const cleaned = String(raw || '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\*{2,}/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const short = cleaned.length > 500 ? cleaned.slice(0, 480) + '…' : cleaned;
  const endsWithQuestion = /[?]$/.test(short.trim());
  return endsWithQuestion ? short : `${short}\n\n${ask}`;
}
