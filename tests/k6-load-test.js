import http from "k6/http";
import { check, sleep } from "k6";

export const options = { 
  vus: 50, 
  duration: "1m" 
};

export default function () {
  const payload = JSON.stringify({
    messageId: `${__ITER}-${Date.now()}`,
    message: "Gib mir einen 3-Punkte Plan gegen Abend-Cravings.",
    userId: "test-user-" + __ITER, 
    coachId: "lucy", 
    enableRag: true,
    enableStreaming: true
  });

  const params = {
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${__ENV.SUPABASE_ANON_KEY}`,
      "apikey": `${__ENV.SUPABASE_ANON_KEY}`
    }
  };

  const res = http.post(`${__ENV.BASE_URL}/functions/v1/unified-coach-engine`, payload, params);
  
  check(res, { 
    "status 200": (r) => r.status === 200,
    "response time < 5s": (r) => r.timings.duration < 5000
  });
  
  sleep(1);
}