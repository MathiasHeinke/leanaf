
export function newTraceId() {
  const rand = Math.random().toString(36).slice(2, 9);
  return `t_${Date.now().toString(36)}${rand}`;
}
