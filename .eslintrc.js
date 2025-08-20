module.exports = {
  extends: [
    '@vitejs/eslint-config-typescript',
    '@vitejs/eslint-config-react'
  ],
  rules: {
    'no-restricted-imports': ['error', {
      paths: [
        { 
          name: '@/hooks/useOrchestrator', 
          message: 'Use @/ares/orchestrator/ARESOrchestratorClient instead. Legacy useOrchestrator is deprecated.' 
        },
        { 
          name: '@/components/QuickFluidInput', 
          message: 'Use @/components/fluids/QuickFluidInput or ARES adapter from @/ares/adapters/fluids instead.' 
        },
        { 
          name: '@/components/MealInput', 
          message: 'Use @/ares/adapters/meals unified pipeline or dashboard components instead.' 
        },
        { 
          name: '@/components/MealInputLean', 
          message: 'Use @/ares/adapters/meals unified pipeline or dashboard components instead.' 
        },
        { 
          name: '@/hooks/useGlobalMealInput', 
          message: 'Use @/ares/adapters/meals unified pipeline instead.' 
        }
      ],
      patterns: [
        {
          group: ['**/legacy/**'],
          message: 'Legacy components are deprecated. Use ARES equivalents or adapters.'
        }
      ]
    }]
  }
};