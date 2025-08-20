export class ARESClientTrace {
  private _id: string | null = null;
  setFromResponse(res: Response | { headers?: Record<string, string> }) {
    const h = (res as any)?.headers;
    const val = (typeof h?.get === 'function') ? h.get('X-Trace-Id') : h?.['X-Trace-Id'] ?? h?.['x-trace-id'];
    if (val) this._id = val;
  }
  get id() { return this._id; }
}