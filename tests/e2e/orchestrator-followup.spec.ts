import { test, expect } from '@playwright/test';

const FN = (name: string) => `https://gzczjscctgyxjyodhnhk.supabase.co/functions/v1/${name}`;

const hasAuth = !!process.env.TEST_USER_JWT && !!process.env.TEST_USER_ID;

// Utility to build headers with optional auth
function headers(traceId: string) {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-trace-id': traceId,
    'x-chat-mode': 'dev',
  };
  if (process.env.TEST_USER_JWT) {
    h['Authorization'] = `Bearer ${process.env.TEST_USER_JWT}`;
  }
  return h;
}

// A) TEXT → reflect → analyze follow-up
test('orchestrator: text reflect → analyze follow-up', async ({ request }) => {
  if (!hasAuth) test.skip('Missing TEST_USER_JWT/TEST_USER_ID env for authenticated run');

  const traceId = `e2e-reflect-${Date.now()}`;
  const userId = process.env.TEST_USER_ID as string;

  // First call: expect reflect
  const res1 = await request.post(FN('coach-orchestrator-enhanced'), {
    headers: headers(traceId),
    data: {
      userId,
      event: { type: 'TEXT', text: 'hcecken supplement stack', clientEventId: crypto.randomUUID() },
    },
  });
  expect(res1.ok()).toBeTruthy();
  const j1 = await res1.json();
  expect(['reflect', 'choice_suggest']).toContain(j1.kind);

  // follow-up: analyze using last_proposal supplement minimal stub
  const res2 = await request.post(FN('coach-orchestrator-enhanced'), {
    headers: headers(traceId),
    data: {
      userId,
      event: {
        type: 'TEXT',
        text: 'mehr info',
        clientEventId: crypto.randomUUID(),
        context: {
          followup: true,
          last_proposal: {
            kind: 'supplement',
            data: { items: [{ name: 'Kreatin Monohydrat', canonical: 'creatine_monohydrate' }], topPickIdx: 0 },
          },
        },
      },
    },
  });
  expect(res2.ok()).toBeTruthy();
  const j2 = await res2.json();
  expect(['message', 'choice_suggest']).toContain(j2.kind);
});

// B) IMAGE → reflect only
test('orchestrator: image → reflect only', async ({ request }) => {
  if (!hasAuth) test.skip('Missing TEST_USER_JWT/TEST_USER_ID env for authenticated run');

  const traceId = `img-${Date.now()}`;
  const userId = process.env.TEST_USER_ID as string;
  const res = await request.post(FN('coach-orchestrator-enhanced'), {
    headers: headers(traceId),
    data: {
      userId,
      event: { type: 'IMAGE', url: 'https://example.com/img.jpg', clientEventId: crypto.randomUUID(), context: { image_type: 'food' } },
    },
  });
  expect(res.ok()).toBeTruthy();
  const j = await res.json();
  expect(j.kind).toBe('reflect');
});
