import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const PROJECT_URL = 'https://gzczjscctgyxjyodhnhk.supabase.co';
const FN = (name: string) => `${PROJECT_URL}/functions/v1/${name}`;
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6Y3pqc2NjdGd5eGp5b2RobmhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NDc5ODIsImV4cCI6MjA2ODMyMzk4Mn0.RIEpNuSbszttym0v9KulYOxXX_Klose6QRAfEMuub1I';

const TEST_USER_JWT = process.env.TEST_USER_JWT || '';
const TEST_USER_ID = process.env.TEST_USER_ID || '';

test.skip(!TEST_USER_JWT || !TEST_USER_ID, 'Missing TEST_USER_JWT/TEST_USER_ID env');

function ceid(prefix = 'ceid') {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

async function ensureInserted(request: any, userId: string, jwt: string) {
  const body = {
    userId,
    mode: 'insert',
    clientEventId: ceid('pre'),
    item: {
      canonical: 'creatine_monohydrate',
      name: 'Kreatin Monohydrat',
      dose: '5 g',
      schedule: { freq: 'daily', time: 'evening' },
    }
  };
  await request.post(FN('supplement-save'), {
    headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json', 'x-trace-id': `pre-${Date.now()}` },
    data: body,
  });
}

test('supplement-save update dose/time, verify DB patch', async ({ request }) => {
  await ensureInserted(request, TEST_USER_ID, TEST_USER_JWT);

  const traceId = `test-trace-update-${Date.now()}`;
  const body = {
    userId: TEST_USER_ID,
    mode: 'update',
    clientEventId: ceid('upd'),
    item: {
      canonical: 'creatine_monohydrate',
      name: 'Kreatin Monohydrat',
      dose: '3 g',
      schedule: { freq: 'daily', time: 'morning' },
    }
  };

  const res = await request.post(FN('supplement-save'), {
    headers: { Authorization: `Bearer ${TEST_USER_JWT}`, 'Content-Type': 'application/json', 'x-trace-id': traceId },
    data: body,
  });
  expect(res.ok()).toBeTruthy();
  const json = await res.json();
  expect(json.success).toBeTruthy();
  expect(['update', 'noop']).toContain(json.action);

  // Verify DB patch
  const supabase = createClient(PROJECT_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${TEST_USER_JWT}` } } });
  const { data, error } = await supabase
    .from('user_supplements')
    .select('dose, schedule')
    .eq('user_id', TEST_USER_ID)
    .eq('canonical', 'creatine_monohydrate')
    .eq('name', 'Kreatin Monohydrat')
    .maybeSingle();

  expect(error).toBeNull();
  expect(data).toBeTruthy();
  expect(data?.dose).toBe('3 g');
  expect(data?.schedule?.freq).toBe('daily');
  expect(data?.schedule?.time).toBe('morning');
});
