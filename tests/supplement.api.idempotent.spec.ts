import { test, expect } from '@playwright/test';

const PROJECT_URL = 'https://gzczjscctgyxjyodhnhk.supabase.co';
const FN = (name: string) => `${PROJECT_URL}/functions/v1/${name}`;

const TEST_USER_JWT = process.env.TEST_USER_JWT || '';
const TEST_USER_ID = process.env.TEST_USER_ID || '';

test.skip(!TEST_USER_JWT || !TEST_USER_ID, 'Missing TEST_USER_JWT/TEST_USER_ID env');

function ceid(prefix = 'ceid') {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

test('supplement-save idempotent re-send', async ({ request }) => {
  const traceId = `test-trace-idem-${Date.now()}`;
  const clientEventId = ceid('idem');
  const body = {
    userId: TEST_USER_ID,
    mode: 'insert',
    clientEventId,
    item: {
      canonical: 'creatine_monohydrate',
      name: 'Kreatin Monohydrat',
      dose: '5 g',
      schedule: { freq: 'daily', time: 'evening' },
    }
  };

  const res1 = await request.post(FN('supplement-save'), {
    headers: { Authorization: `Bearer ${TEST_USER_JWT}`, 'Content-Type': 'application/json', 'x-trace-id': traceId },
    data: body,
  });
  expect(res1.ok()).toBeTruthy();
  const j1 = await res1.json();
  expect(j1.success).toBeTruthy();

  const res2 = await request.post(FN('supplement-save'), {
    headers: { Authorization: `Bearer ${TEST_USER_JWT}`, 'Content-Type': 'application/json', 'x-trace-id': traceId },
    data: body,
  });
  expect(res2.ok()).toBeTruthy();
  const j2 = await res2.json();
  expect(j2.success).toBeTruthy();
  // Either explicit idempotent flag or noop action is fine
  expect(j2.idempotent === true || j2.action === 'noop').toBeTruthy();
});
