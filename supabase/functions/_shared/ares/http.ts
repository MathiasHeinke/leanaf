
export function json(body: any, init?: ResponseInit) {
  return new Response(JSON.stringify(body ?? {}), {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    status: init?.status ?? 200,
  });
}
