// Execute Markus Rühl Embedding Generation
// This will trigger the embedding generation process for all Markus knowledge

const SUPABASE_URL = "https://gzczjscctgyxjyodhnhk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6Y3pqc2NjdGd5eGp5b2RobmhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NDc5ODIsImV4cCI6MjA2ODMyMzk4Mn0.RIEpNuSbszttym0v9KulYOxXX_Klose6QRAfEMuub1I";

async function executeEmbeddingGeneration() {
  console.log('🚀 Starting Markus Rühl Embedding Generation...');
  console.log('📊 Checking current knowledge base status...');
  
  try {
    // Check current status first
    const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/coach_knowledge_base?coach_id=eq.markus&select=*`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      }
    });
    
    const knowledgeEntries = await checkResponse.json();
    console.log(`✅ Found ${knowledgeEntries.length} Markus knowledge entries`);
    
    // List the knowledge areas
    const areas = [...new Set(knowledgeEntries.map(entry => entry.expertise_area))];
    console.log('📚 Knowledge areas:', areas);
    
    // Execute embedding generation
    console.log('🔄 Triggering embedding generation...');
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
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Embedding generation completed:', result);
    
    if (result.success) {
      console.log(`🎯 Successfully processed ${result.processed}/${result.total} knowledge entries`);
      if (result.failed > 0) {
        console.log(`⚠️ ${result.failed} entries failed to process`);
      }
      
      // Check embedding count after generation
      const embeddingCheckResponse = await fetch(`${SUPABASE_URL}/rest/v1/knowledge_base_embeddings?select=count`, {
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        }
      });
      
      const embeddingData = await embeddingCheckResponse.json();
      console.log(`🧠 Total embeddings in database: ${embeddingData.length}`);
      
      console.log('🚀 Markus Rühl is now ready for RAG searches!');
    } else {
      console.log('❌ Embedding generation failed');
    }
    
  } catch (error) {
    console.error('❌ Error during embedding generation:', error);
  }
}

// Execute immediately
executeEmbeddingGeneration();