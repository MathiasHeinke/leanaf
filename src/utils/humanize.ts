export function humanize(raw: string, ask: string = '') {
  const cleaned = String(raw || '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\*{2,}/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  // No truncation - full text is displayed
  const endsWithQuestion = /[?]$/.test(cleaned.trim());
  return endsWithQuestion || !ask ? cleaned : `${cleaned}\n\n${ask}`;
}
