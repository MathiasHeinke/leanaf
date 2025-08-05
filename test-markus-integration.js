// Phase 4: Markus Rühl Integration Testing Suite
// Tests RAG + Tools + Database Schemas + Persona Authenticity

const MARKUS_TEST_SCENARIOS = [
  // 1. RAG Knowledge Base Tests
  {
    name: "RAG_Heavy_Training_Knowledge",
    query: "Was sagt Markus Rühl über schweres Kreuzheben?",
    expectedTriggers: ["rag_search"],
    expectedContent: ["kreuzheben", "schwer", "grundübung"],
    persona_check: "aggressive, motivierend, keine Ausreden"
  },
  
  {
    name: "RAG_Competition_Prep",
    query: "Wie bereitet sich Markus Rühl auf Wettkämpfe vor?",
    expectedTriggers: ["rag_search"],
    expectedContent: ["wettkampf", "vorbereitung", "disziplin"],
    persona_check: "professionell, erfahren, hardcore"
  },

  // 2. Specialized Tools Tests
  {
    name: "TOOL_Heavy_Training_Plan",
    query: "Ich brauch einen echten Rühl-Trainingsplan für 4 Tage",
    expectedTriggers: ["heavy_training_plan"],
    expectedContent: ["grundübungen", "6-8 wiederholungen", "schwer"],
    persona_check: "praktisch, direkt, keine Kompromisse"
  },

  {
    name: "TOOL_Mass_Building",
    query: "Was würde Markus bei 80kg essen um Masse aufzubauen?",
    expectedTriggers: ["mass_building_calculator"],
    expectedContent: ["kalorien", "protein", "reis", "fleisch"],
    persona_check: "pragmatisch, viel essen, Disziplin"
  },

  {
    name: "TOOL_Mental_Toughness",
    query: "Ich hab kein Bock mehr zu trainieren, was sagt Markus?",
    expectedTriggers: ["mental_toughness_coach"],
    expectedContent: ["disziplin", "durchhalten", "keine ausreden"],
    persona_check: "motivierend aber hart, keine Weicheier"
  },

  // 3. Database Integration Tests
  {
    name: "DB_Heavy_Training_Log",
    query: "Ich hab heute 200kg Kreuzheben für 5 Wdh geschafft",
    expectedTriggers: ["heavy_training_plan"],
    expectedDatabase: "markus_heavy_training_sessions",
    expectedContent: ["personal record", "sehr gut", "weiter so"]
  },

  {
    name: "DB_Mass_Progress_Track",
    query: "Ich wiege jetzt 85kg und will auf 90kg",
    expectedTriggers: ["mass_building_calculator"],
    expectedDatabase: "markus_mass_progress",
    expectedContent: ["ziel", "ernährung", "geduld"]
  },

  // 4. Persona Authenticity Tests
  {
    name: "PERSONA_Motivational_Style",
    query: "Ich will aufgeben",
    expectedPersona: {
      tone: "hart aber unterstützend",
      language: "direkt, deutsch, keine Schönrederei",
      motivation: "Durchhalteparolen, eigene Erfahrung"
    }
  },

  {
    name: "PERSONA_Technical_Knowledge",
    query: "Wie trainiert man für maximale Hypertrophie?",
    expectedPersona: {
      expertise: "professionell, wissenschaftlich untermauert",
      style: "praktische Tipps aus Erfahrung",
      focus: "Grundübungen, schwere Gewichte"
    }
  },

  // 5. Complex Multi-Component Tests
  {
    name: "INTEGRATION_Full_Coaching_Session",
    query: "Ich bin 25, wiege 75kg, will auf 85kg. Gib mir einen kompletten Plan.",
    expectedTriggers: ["rag_search", "heavy_training_plan", "mass_building_calculator"],
    expectedDatabase: ["markus_mass_progress", "markus_heavy_training_sessions"],
    expectedContent: ["trainingsplan", "ernährung", "zeitrahmen", "disziplin"]
  }
];

// Performance Benchmarks
const PERFORMANCE_TARGETS = {
  rag_response_time: 2000, // ms
  tool_execution_time: 1500, // ms
  database_query_time: 500, // ms
  total_response_time: 5000, // ms
  persona_consistency: 90 // % score
};

// Test Execution Function
async function runMarkusIntegrationTests() {
  console.log("🏋️‍♂️ MARKUS RÜHL INTEGRATION TESTING SUITE");
  console.log("=" * 50);
  
  const results = {
    passed: 0,
    failed: 0,
    performance: {},
    persona_scores: [],
    detailed_results: []
  };

  for (const scenario of MARKUS_TEST_SCENARIOS) {
    console.log(`\n🔧 Testing: ${scenario.name}`);
    console.log(`Query: "${scenario.query}"`);
    
    try {
      const startTime = Date.now();
      
      // Execute test query (would call your coach engine)
      const response = await executeMarkusQuery(scenario.query);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Validate response
      const testResult = validateTestScenario(scenario, response, responseTime);
      
      if (testResult.success) {
        results.passed++;
        console.log("✅ PASSED");
      } else {
        results.failed++;
        console.log("❌ FAILED:", testResult.reason);
      }
      
      results.detailed_results.push({
        scenario: scenario.name,
        success: testResult.success,
        response_time: responseTime,
        details: testResult
      });
      
    } catch (error) {
      results.failed++;
      console.log("💥 ERROR:", error.message);
    }
  }
  
  // Generate Test Report
  generateTestReport(results);
}

// Test Validation Logic
function validateTestScenario(scenario, response, responseTime) {
  const result = {
    success: true,
    reason: "",
    details: {}
  };
  
  // Check performance
  if (responseTime > PERFORMANCE_TARGETS.total_response_time) {
    result.success = false;
    result.reason += `Response too slow: ${responseTime}ms. `;
  }
  
  // Check expected content
  if (scenario.expectedContent) {
    const missingContent = scenario.expectedContent.filter(
      content => !response.toLowerCase().includes(content.toLowerCase())
    );
    
    if (missingContent.length > 0) {
      result.success = false;
      result.reason += `Missing content: ${missingContent.join(', ')}. `;
    }
  }
  
  // Check persona authenticity
  if (scenario.expectedPersona || scenario.persona_check) {
    const personaScore = evaluatePersonaAuthenticity(response, scenario);
    result.details.persona_score = personaScore;
    
    if (personaScore < PERFORMANCE_TARGETS.persona_consistency) {
      result.success = false;
      result.reason += `Persona score too low: ${personaScore}%. `;
    }
  }
  
  return result;
}

// Persona Authenticity Evaluator
function evaluatePersonaAuthenticity(response, scenario) {
  let score = 100;
  
  // Markus-spezifische Checks
  const markusIndicators = {
    // Positive Indicators (+10 each)
    positive: [
      /keine ausreden?/i,
      /schwer/i,
      /grundübung/i,
      /disziplin/i,
      /durchhalten/i,
      /(hart|hardcore)/i,
      /jammern bringt (nix|nichts)/i
    ],
    
    // Negative Indicators (-20 each)
    negative: [
      /easy/i,
      /sanft/i,
      /leicht/i,
      /vorsichtig/i,
      /langsam angehen/i
    ]
  };
  
  // Check positive indicators
  markusIndicators.positive.forEach(pattern => {
    if (pattern.test(response)) {
      score += 10;
    }
  });
  
  // Check negative indicators
  markusIndicators.negative.forEach(pattern => {
    if (pattern.test(response)) {
      score -= 20;
    }
  });
  
  return Math.max(0, Math.min(100, score));
}

// Mock function - replace with actual coach engine call
async function executeMarkusQuery(query) {
  // This would call your actual coach engine
  // For testing purposes, return mock response
  return `Markus Rühl Response to: ${query}`;
}

// Test Report Generator
function generateTestReport(results) {
  console.log("\n" + "=" * 50);
  console.log("🏋️‍♂️ MARKUS RÜHL INTEGRATION TEST REPORT");
  console.log("=" * 50);
  
  console.log(`\n📊 SUMMARY:`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  
  if (results.persona_scores.length > 0) {
    const avgPersonaScore = results.persona_scores.reduce((a, b) => a + b, 0) / results.persona_scores.length;
    console.log(`🎭 Avg Persona Score: ${avgPersonaScore.toFixed(1)}%`);
  }
  
  console.log(`\n🎯 RECOMMENDATIONS:`);
  if (results.failed > 0) {
    console.log("- Review failed test cases");
    console.log("- Optimize RAG knowledge base");
    console.log("- Fine-tune tool triggers");
    console.log("- Improve persona consistency");
  } else {
    console.log("- All tests passed! Markus is ready for deployment! 💪");
  }
}

// Export for Node.js usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runMarkusIntegrationTests,
    MARKUS_TEST_SCENARIOS,
    PERFORMANCE_TARGETS
  };
}

// Run tests if called directly
if (typeof window === 'undefined' && require.main === module) {
  runMarkusIntegrationTests();
}