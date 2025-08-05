// Final Markus Rühl Integration Test
// Tests all components: RAG + Tools + Database + Main Engine

const SUPABASE_URL = "https://gzczjscctgyxjyodhnhk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6Y3pqc2NjdGd5eGp5b2RobmhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NDc5ODIsImV4cCI6MjA2ODMyMzk4Mn0.RIEpNuSbszttym0v9KulYOxXX_Klose6QRAfEMuub1I";

const TEST_SCENARIOS = [
  {
    name: "RAG_Knowledge_Test",
    query: "Was sagt Markus über schwere Grundübungen?",
    expectedFeatures: ["rag_search", "hessian_dialect", "motivational_tone"],
    description: "Tests RAG knowledge retrieval and persona authenticity"
  },
  {
    name: "Training_Plan_Tool",
    query: "Ich brauch einen 4-Tage Trainingsplan von Markus",
    expectedFeatures: ["tool_execution", "training_plan", "markus_principles"],
    description: "Tests heavyTrainingPlan tool integration"
  },
  {
    name: "Mass_Building_Calculator",
    query: "Ich wiege 80kg und will Masse aufbauen, was soll ich essen?",
    expectedFeatures: ["tool_execution", "nutrition_calculation", "hardcore_advice"],
    description: "Tests massBuildingCalculator tool"
  },
  {
    name: "Mental_Coaching",
    query: "Ich hab kein Bock mehr zu trainieren",
    expectedFeatures: ["tool_execution", "mental_toughness", "anti_whining"],
    description: "Tests mentalToughnessCoach tool"
  },
  {
    name: "Database_Integration",
    query: "Ich hab heute 180kg Kreuzheben geschafft",
    expectedFeatures: ["database_logging", "pr_recognition", "motivational_response"],
    description: "Tests database integration and logging"
  }
];

async function runFinalTests() {
  console.log('🚀 Starting Markus Rühl Final Integration Tests...');
  console.log('=' .repeat(60));
  
  let passed = 0;
  let failed = 0;
  
  for (const scenario of TEST_SCENARIOS) {
    console.log(`\n🧪 Testing: ${scenario.name}`);
    console.log(`📝 Description: ${scenario.description}`);
    console.log(`💬 Query: "${scenario.query}"`);
    
    try {
      const startTime = Date.now();
      
      // Test Main Coach Engine
      const response = await fetch(`${SUPABASE_URL}/functions/v1/enhanced-coach-non-streaming`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation: [
            { role: 'user', content: scenario.query }
          ],
          coach_id: 'markus',
          user_id: 'test-user-id',
          request_type: 'chat'
        })
      });
      
      const responseTime = Date.now() - startTime;
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
      
      const result = await response.json();
      console.log(`⏱️ Response time: ${responseTime}ms`);
      
      // Analyze response
      const analysisResult = analyzeResponse(result, scenario);
      
      if (analysisResult.success) {
        console.log(`✅ PASSED - ${analysisResult.summary}`);
        passed++;
      } else {
        console.log(`❌ FAILED - ${analysisResult.summary}`);
        failed++;
      }
      
      // Show response preview
      if (result.response) {
        const preview = result.response.substring(0, 150) + (result.response.length > 150 ? '...' : '');
        console.log(`📖 Response preview: "${preview}"`);
      }
      
    } catch (error) {
      console.log(`❌ FAILED - Error: ${error.message}`);
      failed++;
    }
    
    console.log('-'.repeat(40));
  }
  
  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('🏁 FINAL TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED! Markus Rühl ist 100% production-ready! 🚀');
  } else {
    console.log('⚠️ Some tests failed. Review and fix issues before production.');
  }
}

function analyzeResponse(result, scenario) {
  const response = result.response || '';
  const metadata = result.metadata || {};
  
  let score = 0;
  let maxScore = scenario.expectedFeatures.length;
  let details = [];
  
  // Check expected features
  for (const feature of scenario.expectedFeatures) {
    switch (feature) {
      case 'rag_search':
        if (metadata.rag_used || response.includes('weiß') || response.includes('erfahrung')) {
          score++;
          details.push('✓ RAG search detected');
        } else {
          details.push('✗ RAG search not detected');
        }
        break;
        
      case 'hessian_dialect':
        if (response.includes('gell') || response.includes('isch') || response.includes('des') || response.includes('nit')) {
          score++;
          details.push('✓ Hessian dialect present');
        } else {
          details.push('✗ Hessian dialect missing');
        }
        break;
        
      case 'tool_execution':
        if (metadata.tools_used && metadata.tools_used.length > 0) {
          score++;
          details.push(`✓ Tools executed: ${metadata.tools_used.join(', ')}`);
        } else {
          details.push('✗ No tools executed');
        }
        break;
        
      case 'motivational_tone':
      case 'anti_whining':
        if (response.includes('keine Ausreden') || response.includes('Disziplin') || response.includes('hart')) {
          score++;
          details.push('✓ Motivational/tough tone detected');
        } else {
          details.push('✗ Motivational tone missing');
        }
        break;
        
      default:
        // Generic feature check
        if (response.toLowerCase().includes(feature.toLowerCase())) {
          score++;
          details.push(`✓ Feature "${feature}" found`);
        } else {
          details.push(`✗ Feature "${feature}" not found`);
        }
    }
  }
  
  const success = score >= Math.ceil(maxScore * 0.7); // 70% threshold
  
  return {
    success,
    score,
    maxScore,
    summary: `${score}/${maxScore} features detected`,
    details
  };
}

// Execute tests
runFinalTests();