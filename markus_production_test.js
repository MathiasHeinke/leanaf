// Markus Rühl Production Readiness Test
// Final comprehensive test before production deployment

const SUPABASE_URL = "https://gzczjscctgyxjyodhnhk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6Y3pqc2NjdGd5eGp5b2RobmhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NDc5ODIsImV4cCI6MjA2ODMyMzk4Mn0.RIEpNuSbszttym0v9KulYOxXX_Klose6QRAfEMuub1I";

async function runProductionReadinessTest() {
  console.log('🚀 MARKUS RÜHL PRODUCTION READINESS TEST');
  console.log('=' .repeat(60));
  
  const results = {
    infrastructure: {},
    functionality: {},
    performance: {},
    authenticity: {}
  };
  
  // 1. Infrastructure Tests
  console.log('\n🏗️ INFRASTRUCTURE TESTS');
  console.log('-'.repeat(30));
  
  try {
    // Check Knowledge Base
    const kbResponse = await fetch(`${SUPABASE_URL}/rest/v1/coach_knowledge_base?coach_id=eq.markus&select=count`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      }
    });
    const kbData = await kbResponse.json();
    results.infrastructure.knowledge_base = kbData.length;
    console.log(`✅ Knowledge Base: ${kbData.length} entries`);
    
    // Check Embeddings
    const embResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/count`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        table_name: 'knowledge_base_embeddings'
      })
    });
    
    // Alternative: Direct embedding check
    const embResponse2 = await fetch(`${SUPABASE_URL}/rest/v1/knowledge_base_embeddings?select=count`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      }
    });
    const embData = await embResponse2.json();
    results.infrastructure.embeddings = embData.length;
    console.log(`🧠 Embeddings: ${embData.length} generated`);
    
    // Check Database Schemas
    const schemasChecked = ['markus_heavy_training_sessions', 'markus_mass_progress', 'markus_competition_prep'];
    for (const schema of schemasChecked) {
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/${schema}?select=count&limit=1`, {
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          }
        });
        if (response.ok) {
          console.log(`✅ Schema: ${schema} exists`);
        }
      } catch (err) {
        console.log(`❌ Schema: ${schema} error: ${err.message}`);
      }
    }
    
  } catch (error) {
    console.log(`❌ Infrastructure test failed: ${error.message}`);
  }
  
  // 2. Functionality Tests
  console.log('\n⚙️ FUNCTIONALITY TESTS');
  console.log('-'.repeat(30));
  
  const functionalityTests = [
    {
      name: 'Main Coach Engine',
      query: 'Hi Markus, wie gehts?',
      endpoint: 'enhanced-coach-non-streaming'
    },
    {
      name: 'Tool Integration - Training Plan',
      query: 'Ich brauch einen Trainingsplan für 4 Tage',
      endpoint: 'enhanced-coach-non-streaming'
    },
    {
      name: 'Tool Integration - Mass Building',
      query: 'Ich wiege 80kg und will Masse aufbauen',
      endpoint: 'enhanced-coach-non-streaming'
    }
  ];
  
  for (const test of functionalityTests) {
    console.log(`\n🧪 Testing: ${test.name}`);
    console.log(`💬 Query: "${test.query}"`);
    
    try {
      const startTime = Date.now();
      const response = await fetch(`${SUPABASE_URL}/functions/v1/${test.endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation: [
            { role: 'user', content: test.query }
          ],
          coach_id: 'markus',
          user_id: 'test-user-production',
          request_type: 'chat'
        })
      });
      
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Response time: ${responseTime}ms`);
        
        if (result.response) {
          const preview = result.response.substring(0, 100) + '...';
          console.log(`📖 Preview: "${preview}"`);
          
          // Check for Markus characteristics
          const hasDialect = /gell|isch|des|nit/.test(result.response);
          const hasMotivation = /disziplin|hart|keine ausreden/i.test(result.response);
          console.log(`🗣️ Hessian dialect: ${hasDialect ? '✅' : '❌'}`);
          console.log(`💪 Motivational tone: ${hasMotivation ? '✅' : '❌'}`);
        }
        
        results.functionality[test.name] = {
          success: true,
          responseTime,
          hasResponse: !!result.response
        };
        
      } else {
        console.log(`❌ HTTP Error: ${response.status}`);
        results.functionality[test.name] = {
          success: false,
          error: response.status
        };
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      results.functionality[test.name] = {
        success: false,
        error: error.message
      };
    }
  }
  
  // 3. Final Assessment
  console.log('\n🎯 PRODUCTION READINESS ASSESSMENT');
  console.log('=' .repeat(60));
  
  const infrastructureScore = results.infrastructure.knowledge_base > 10 ? 1 : 0;
  const functionalityScore = Object.values(results.functionality).filter(r => r.success).length;
  const totalFunctionalityTests = Object.keys(results.functionality).length;
  
  console.log(`🏗️ Infrastructure: ${infrastructureScore}/1 (${results.infrastructure.knowledge_base} KB entries)`);
  console.log(`⚙️ Functionality: ${functionalityScore}/${totalFunctionalityTests} tests passed`);
  console.log(`🧠 Embeddings: ${results.infrastructure.embeddings} generated`);
  
  const overallScore = (infrastructureScore + (functionalityScore / totalFunctionalityTests)) / 2;
  
  if (overallScore >= 0.8) {
    console.log('🎉 MARKUS RÜHL IST PRODUCTION-READY! 🚀');
    console.log('✅ Kann sofort live geschaltet werden!');
  } else if (overallScore >= 0.6) {
    console.log('⚠️ MARKUS RÜHL ist fast bereit - kleinere Fixes nötig');
  } else {
    console.log('❌ MARKUS RÜHL braucht noch Arbeit vor Production');
  }
  
  console.log(`📊 Overall Score: ${(overallScore * 100).toFixed(1)}%`);
  
  return results;
}

// Execute production test
runProductionReadinessTest().then(() => {
  console.log('\n🏁 Production test completed!');
}).catch(error => {
  console.error('❌ Production test failed:', error);
});