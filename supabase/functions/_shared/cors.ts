// _shared/cors.ts
export function buildCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') ?? '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers':
      'authorization,apikey,content-type,x-client-info,x-supabase-api-version,prefer,x-trace-id,x-source,x-chat-mode',
    'Access-Control-Max-Age': '86400',
  };
}

export function okJson(body: unknown, req: Request, init?: ResponseInit) {
  return new Response(JSON.stringify(body ?? {}), {
    status: init?.status ?? 200,
    headers: { 'Content-Type': 'application/json', ...buildCorsHeaders(req), ...(init?.headers || {}) },
  });
}

export function errJson(message: string, req: Request, status = 400, extra?: unknown) {
  return okJson({ error: message, ...(extra ? { extra } : {}) }, req, { status });
}

export function handleOptions(req: Request) {
  return new Response(null, { status: 204, headers: buildCorsHeaders(req) });
}