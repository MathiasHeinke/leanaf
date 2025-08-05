// Trigger embedding generation for Markus Rühl knowledge base
// Run this once to generate embeddings for all the new Markus content

const SUPABASE_URL = "https://gzczjscctgyxjyodhnhk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6Y3pqc2NjdGd5eGp5b2RobmhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NDc5ODIsImV4cCI6MjA2ODMyMzk4Mn0.RIEpNuSbszttym0v9KulYOxXX_Klose6QRAfEMuub1I";

async function generateMarkusEmbeddings() {
  console.log('Starting embedding generation for Markus Rühl knowledge base...');
  
  try {
    // First check how many Markus entries exist
    const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/coach_knowledge_base?coach_id=eq.markus&select=count`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      }
    });
    
    const checkData = await checkResponse.json();
    console.log(`Found ${checkData.length} Markus knowledge entries`);
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        regenerate_all: true
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Embedding generation completed:', result);
    
    if (result.success) {
      console.log(`✅ Successfully processed ${result.processed}/${result.total} knowledge entries`);
      if (result.failed > 0) {
        console.log(`⚠️ ${result.failed} entries failed to process`);
      }
    }
  } catch (error) {
    console.error('❌ Error generating embeddings:', error);
  }
}

// Execute immediately
generateMarkusEmbeddings();