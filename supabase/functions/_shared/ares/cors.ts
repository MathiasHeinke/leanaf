
export const cors = {
  preflight(req: Request) {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: this.headers() });
    }
    return null;
  },
  headers(extra: Record<string, string> = {}) {
    return {
      'Access-Control-Allow-Origin': '*',
      'Vary': 'Origin',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-supabase-api-version, prefer, x-trace-id, x-source, accept',
      'Access-Control-Max-Age': '86400',
      ...extra,
    };
  }
};
