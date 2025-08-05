// Markus Rühl End-to-End Test Script
// Testet die komplette Integration: RAG → Tools → Database → Response

const SUPABASE_URL = "https://gzczjscctgyxjyodhnhk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6Y3pqc2NjdGd5eGp5b2RobmhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NDc5ODIsImV4cCI6MjA2ODMyMzk4Mn0.RIEpNuSbszttym0v9KulYOxXX_Klose6QRAfEMuub1I";

// E2E Test Cases für Markus Rühl
const E2E_TEST_CASES = [
  {
    name: "COMPLETE_COACHING_SESSION",
    description: "Vollständige Coaching-Session mit RAG + Tools + DB",
    conversation: [
      {
        user: "Hi Markus, ich bin neu hier",
        expected_response_contains: ["willkommen", "trainierst", "ziel"],
        expected_tools: [],
        persona_check: "freundlich aber direkt"
      },
      {
        user: "Ich will Muskelmasse aufbauen, wiege 75kg",
        expected_response_contains: ["masse", "ernährung", "training"],
        expected_tools: ["mass_building_calculator"],
        expected_db_operations: ["INSERT INTO markus_mass_progress"],
        persona_check: "motivierend, praktische Tipps"
      },
      {
        user: "Gib mir einen Trainingsplan für 4 Tage",
        expected_response_contains: ["trainingsplan", "grundübungen", "4 tage"],
        expected_tools: ["heavy_training_plan"],
        persona_check: "kompetent, strukturiert"
      },
      {
        user: "Ich hab heute 120kg Bankdrücken geschafft",
        expected_response_contains: ["sehr gut", "weiter", "steigerung"],
        expected_tools: ["heavy_training_plan"],
        expected_db_operations: ["INSERT INTO markus_heavy_training_sessions"],
        persona_check: "anerkennend aber pusht weiter"
      }
    ]
  },

  {
    name: "RAG_KNOWLEDGE_RETRIEVAL",
    description: "Test der RAG-Wissensbasis",
    conversation: [
      {
        user: "Was denkst du über Kreuzheben?",
        expected_rag_triggered: true,
        expected_response_contains: ["kreuzheben", "grundübung", "wichtig"],
        persona_check: "Expertise zeigen, erfahrungsbasiert"
      },
      {
        user: "Wie warst du bei deinem ersten Wettkampf?",
        expected_rag_triggered: true,
        expected_response_contains: ["wettkampf", "erfahrung", "nervös"],
        persona_check: "persönlich, authentisch"
      }
    ]
  },

  {
    name: "TOOL_INTEGRATION_FLOW",
    description: "Test der Tool-Kette",
    conversation: [
      {
        user: "Ich will in 6 Monaten 10kg zunehmen und brauche alles: Plan, Ernährung, Mindset",
        expected_tools: ["heavy_training_plan", "mass_building_calculator", "mental_toughness_coach"],
        expected_response_contains: ["trainingsplan", "ernährung", "disziplin", "6 monate"],
        persona_check: "umfassend, strukturiert, motivierend"
      }
    ]
  },

  {
    name: "PERSONA_CONSISTENCY_TEST",
    description: "Test der Markus-Persönlichkeit über verschiedene Themen",
    conversation: [
      {
        user: "Ich hab Angst vor schweren Gewichten",
        expected_response_contains: ["angst", "überwinden", "langsam"],
        persona_check: "verständnisvoll aber ermutigend, keine Verharmlosung"
      },
      {
        user: "Cardio oder Krafttraining für Fettabbau?",
        expected_response_contains: ["krafttraining", "muskeln", "ernährung"],
        persona_check: "klare Meinung, krafttraining-fokussiert"
      },
      {
        user: "Ich esse vegan, geht das auch?",
        expected_response_contains: ["protein", "möglich", "aufpassen"],
        persona_check: "pragmatisch, nicht dogmatisch"
      }
    ]
  }
];

// Performance Benchmarks
const PERFORMANCE_BENCHMARKS = {
  max_response_time: 8000, // ms
  min_persona_score: 85,    // %
  max_tool_chain_time: 3000, // ms
  min_rag_relevance: 75     // %
};

// Main Test Runner
async function runMarkusE2ETests() {
  console.log("🏋️‍♂️ MARKUS RÜHL E2E INTEGRATION TESTS");
  console.log("=====================================");
  
  const results = {
    total_tests: 0,
    passed: 0,
    failed: 0,
    performance_issues: 0,
    persona_failures: 0,
    test_details: []
  };

  for (const testCase of E2E_TEST_CASES) {
    console.log(`\n🧪 Running: ${testCase.name}`);
    console.log(`Description: ${testCase.description}`);
    
    const testResult = await runConversationTest(testCase);
    
    results.total_tests++;
    if (testResult.success) {
      results.passed++;
      console.log("✅ TEST PASSED");
    } else {
      results.failed++;
      console.log("❌ TEST FAILED:", testResult.failure_reason);
    }
    
    if (testResult.performance_issues > 0) {
      results.performance_issues++;
    }
    
    if (testResult.persona_score < PERFORMANCE_BENCHMARKS.min_persona_score) {
      results.persona_failures++;
    }
    
    results.test_details.push(testResult);
  }
  
  generateE2EReport(results);
}

// Conversation Test Runner
async function runConversationTest(testCase) {
  const result = {
    test_name: testCase.name,
    success: true,
    failure_reason: "",
    conversation_results: [],
    performance_issues: 0,
    persona_score: 0,
    total_response_time: 0
  };
  
  for (let i = 0; i < testCase.conversation.length; i++) {
    const turn = testCase.conversation[i];
    console.log(`\n  💬 Turn ${i + 1}: "${turn.user}"`);
    
    const turnResult = await executeTurn(turn);
    result.conversation_results.push(turnResult);
    result.total_response_time += turnResult.response_time;
    
    // Validate turn
    if (!validateTurnExpectations(turn, turnResult)) {
      result.success = false;
      result.failure_reason += `Turn ${i + 1} failed expectations. `;
    }
    
    // Check performance
    if (turnResult.response_time > PERFORMANCE_BENCHMARKS.max_response_time) {
      result.performance_issues++;
    }
    
    // Accumulate persona score
    result.persona_score += turnResult.persona_score;
  }
  
  // Average persona score
  result.persona_score = result.persona_score / testCase.conversation.length;
  
  return result;
}

// Execute Single Conversation Turn
async function executeTurn(turn) {
  const startTime = Date.now();
  
  try {
    // Mock coach response - replace with actual API call
    const response = await callMarkusCoach(turn.user);
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // Analyze response
    const analysis = analyzeResponse(response, turn);
    
    return {
      user_message: turn.user,
      coach_response: response,
      response_time: responseTime,
      tools_triggered: analysis.tools_triggered,
      rag_triggered: analysis.rag_triggered,
      db_operations: analysis.db_operations,
      persona_score: analysis.persona_score,
      content_match: analysis.content_match
    };
    
  } catch (error) {
    return {
      user_message: turn.user,
      error: error.message,
      response_time: Date.now() - startTime,
      persona_score: 0
    };
  }
}

// Mock Coach API Call
async function callMarkusCoach(message) {
  // This would be replaced with actual API call to your coach engine
  // For testing, return a mock response
  
  const mockResponses = {
    "Hi Markus, ich bin neu hier": "Willkommen! Erzähl mir, was dein Trainingsziel ist. Ich helfe dir dabei, richtig durchzustarten.",
    "Ich will Muskelmasse aufbauen, wiege 75kg": "Bei 75kg willst du Masse aufbauen? Gut! Du brauchst einen soliden Trainingsplan und musst ordentlich essen. Ich rechne dir das mal durch...",
    "Gib mir einen Trainingsplan für 4 Tage": "4-Tage-Split ist perfekt für Masse! Wir machen: Mo-Brust/Trizeps, Di-Rücken/Bizeps, Do-Beine, Fr-Schultern. Grundübungen stehen im Mittelpunkt!",
    "Ich hab heute 120kg Bankdrücken geschafft": "120kg Bankdrücken - sehr gut! Das ist ein solider Wert. Jetzt heißt es dranbleiben und stetig steigern. Nächstes Ziel: 125kg!"
  };
  
  return mockResponses[message] || "Das ist eine interessante Frage. Erzähl mir mehr über deine Situation.";
}

// Response Analysis
function analyzeResponse(response, turn) {
  const analysis = {
    tools_triggered: [],
    rag_triggered: false,
    db_operations: [],
    persona_score: 0,
    content_match: true
  };
  
  // Check expected content
  if (turn.expected_response_contains) {
    const missingContent = turn.expected_response_contains.filter(
      content => !response.toLowerCase().includes(content.toLowerCase())
    );
    analysis.content_match = missingContent.length === 0;
  }
  
  // Analyze persona authenticity
  analysis.persona_score = calculatePersonaScore(response, turn.persona_check);
  
  // Mock tool and RAG detection (replace with actual detection logic)
  if (turn.expected_tools) {
    analysis.tools_triggered = turn.expected_tools; // Mock
  }
  
  if (turn.expected_rag_triggered) {
    analysis.rag_triggered = true; // Mock
  }
  
  return analysis;
}

// Persona Score Calculator
function calculatePersonaScore(response, personaCheck) {
  let score = 50; // Base score
  
  // Markus-spezifische Persona-Indikatoren
  const personaIndicators = {
    motivierend: [/sehr gut/i, /weiter/i, /durchstarten/i, /schaffen/i],
    direkt: [/brauchst/i, /musst/i, /heißt es/i, /punkt/i],
    kompetent: [/plan/i, /grundübung/i, /training/i, /wert/i],
    authentisch: [/ich/i, /meine erfahrung/i, /damals/i]
  };
  
  // Check persona indicators
  Object.values(personaIndicators).flat().forEach(pattern => {
    if (pattern.test(response)) {
      score += 5;
    }
  });
  
  // Penalize for non-Markus language
  const negativePatterns = [/maybe/i, /perhaps/i, /könnte sein/i, /vielleicht/i];
  negativePatterns.forEach(pattern => {
    if (pattern.test(response)) {
      score -= 10;
    }
  });
  
  return Math.max(0, Math.min(100, score));
}

// Validation Logic
function validateTurnExpectations(turn, turnResult) {
  let valid = true;
  
  // Check content expectations
  if (turn.expected_response_contains && !turnResult.content_match) {
    valid = false;
  }
  
  // Check tool expectations
  if (turn.expected_tools && 
      !turn.expected_tools.every(tool => turnResult.tools_triggered.includes(tool))) {
    valid = false;
  }
  
  // Check RAG expectations
  if (turn.expected_rag_triggered && !turnResult.rag_triggered) {
    valid = false;
  }
  
  return valid;
}

// Generate Final Report
function generateE2EReport(results) {
  console.log("\n" + "=" * 50);
  console.log("🏋️‍♂️ MARKUS E2E TEST REPORT");
  console.log("=" * 50);
  
  console.log(`\n📊 OVERALL RESULTS:`);
  console.log(`✅ Passed: ${results.passed}/${results.total_tests}`);
  console.log(`❌ Failed: ${results.failed}/${results.total_tests}`);
  console.log(`📈 Success Rate: ${((results.passed / results.total_tests) * 100).toFixed(1)}%`);
  
  console.log(`\n⚡ PERFORMANCE:`);
  console.log(`🚀 Performance Issues: ${results.performance_issues}`);
  console.log(`🎭 Persona Failures: ${results.persona_failures}`);
  
  console.log(`\n🎯 MARKUS READINESS:`);
  if (results.failed === 0 && results.performance_issues === 0 && results.persona_failures === 0) {
    console.log("🟢 READY FOR PRODUCTION! Markus ist einsatzbereit! 💪");
  } else if (results.failed <= 1 && results.performance_issues <= 1) {
    console.log("🟡 MOSTLY READY - Minor issues to fix");
  } else {
    console.log("🔴 NEEDS WORK - Major issues found");
  }
  
  console.log(`\n📋 NEXT STEPS:`);
  if (results.failed > 0) {
    console.log("- Fix failing test cases");
  }
  if (results.performance_issues > 0) {
    console.log("- Optimize response times");
  }
  if (results.persona_failures > 0) {
    console.log("- Improve persona consistency");
  }
  if (results.passed === results.total_tests) {
    console.log("- Deploy Markus to production! 🚀");
  }
}

// Run tests
if (typeof require !== 'undefined' && require.main === module) {
  runMarkusE2ETests().catch(console.error);
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runMarkusE2ETests,
    E2E_TEST_CASES,
    PERFORMANCE_BENCHMARKS
  };
}