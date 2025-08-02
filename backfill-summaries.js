// Backfill-Script für Daily Summaries v2
// Usage: node backfill-summaries.js USER_UUID DAYS

const userId = "84b0664f-0934-49ce-9c35-c99546b792bf"; // office@mathiasheinke.de
const days = 14; // Test mit 14 Tagen
const EDGE_URL = "https://gzczjscctgyxjyodhnhk.supabase.co/functions/v1/generate-day-summary-v2";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6Y3pqc2NjdGd5eGp5b2RobmhrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc0Nzk4MiwiZXhwIjoyMDY4MzIzOTgyfQ.dCHnpuqnIQLGWpL3mqAh7SPbDrIcNO77Gg7OQ5nGX2E";

async function backfillSummaries() {
  console.log(`🚀 Starting backfill for user ${userId} - ${days} days`);
  
  const results = [];
  
  for (let i = 0; i < days; i++) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    
    try {
      console.log(`📅 Processing ${date}...`);
      
      const response = await fetch(EDGE_URL, {
        method: "POST",
        headers: {
          "apikey": SERVICE_KEY,
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SERVICE_KEY}`
        },
        body: JSON.stringify({
          userId,
          date,
          force: true,
          text: false // Skip GPT generation for speed
        })
      });
      
      const result = await response.json();
      console.log(`  ✅ ${date}: ${result.status || 'unknown'}`);
      
      results.push({ date, ...result });
      
      // Small delay to be respectful
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`  ❌ ${date}: ${error.message}`);
      results.push({ date, error: error.message });
    }
  }
  
  console.log(`\n📊 Backfill Summary:`);
  console.log(`Total processed: ${results.length}`);
  console.log(`Successful: ${results.filter(r => r.status === 'success').length}`);
  console.log(`Skipped: ${results.filter(r => r.status === 'skipped').length}`);
  console.log(`Errors: ${results.filter(r => r.error).length}`);
  
  return results;
}

// For Node.js usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { backfillSummaries };
}

// For browser/Deno usage  
if (typeof window !== 'undefined' || typeof Deno !== 'undefined') {
  // Run immediately
  backfillSummaries().then(results => {
    console.log('Backfill completed:', results);
  }).catch(console.error);
}