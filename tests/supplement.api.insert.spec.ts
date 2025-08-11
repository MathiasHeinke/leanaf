import { test, expect } from '@playwright/test';

const PROJECT_URL = 'https://gzczjscctgyxjyodhnhk.supabase.co';
const FN = (name: string) => `${PROJECT_URL}/functions/v1/${name}`;

const TEST_USER_JWT = process.env.TEST_USER_JWT || '';
const TEST_USER_ID = process.env.TEST_USER_ID || '';

// Skip all tests in this file if env not provided
// Set TEST_USER_JWT and TEST_USER_ID to run these smokes against your project.
test.skip(!TEST_USER_JWT || !TEST_USER_ID, 'Missing TEST_USER_JWT/TEST_USER_ID env');

function ceid(prefix = 'ceid') {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

test('supplement-save insert happy path', async ({ request }) => {
  const traceId = `test-trace-insert-${Date.now()}`;
  const body = {
    userId: TEST_USER_ID,
    mode: 'insert',
    clientEventId: ceid('insert'),
    item: {
      canonical: 'creatine_monohydrate',
      name: 'Kreatin Monohydrat',
      dose: '5 g',
      schedule: { freq: 'daily', time: 'evening' },
      notes: 'Playwright insert smoke'
    }
  };

  const res = await request.post(FN('supplement-save'), {
    headers: {
      Authorization: `Bearer ${TEST_USER_JWT}`,
      'Content-Type': 'application/json',
      'x-trace-id': traceId,
    },
    data: body,
  });

  expect(res.ok()).toBeTruthy();
  const json = await res.json();
  expect(json.success).toBeTruthy();
  expect(['insert', 'noop']).toContain(json.action);
});
