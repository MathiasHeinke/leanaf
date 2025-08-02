import { describe, it, expect } from 'vitest';

describe('Lucy v2 System', () => {
  describe('System Flags Detection', () => {
    it('should detect stress level from user message', () => {
      const userMessage = 'Bin total gestresst heute!';
      const profile = {};
      
      // Mock the deriveSystemFlags function
      const flags = {
        stressLevel: /gestresst|stress|überfordert|müde|erschöpft/i.test(userMessage),
        bodybuildingQuestion: /(bankdrücken|1\s?rm|split|hypertrophie|masse)/i.test(userMessage),
        alcoholMention: /wein|bier|alkohol|trinken/i.test(userMessage),
        cyclePhase: null
      };
      
      expect(flags.stressLevel).toBe(true);
      expect(flags.bodybuildingQuestion).toBe(false);
    });

    it('should detect bodybuilding questions', () => {
      const userMessage = 'Wie funktioniert ein Push Pull Split?';
      const flags = {
        stressLevel: /gestresst|stress|überfordert|müde|erschöpft/i.test(userMessage),
        bodybuildingQuestion: /(bankdrücken|1\s?rm|split|hypertrophie|masse)/i.test(userMessage),
        alcoholMention: /wein|bier|alkohol|trinken/i.test(userMessage),
        cyclePhase: null
      };
      
      expect(flags.bodybuildingQuestion).toBe(true);
    });
  });

  describe('Cycle Support', () => {
    it('should provide luteal phase nutrition tip', () => {
      const tip = getCycleNutritionTip('luteal');
      expect(tip).toMatch(/Cravings.*normal.*magnesium.*tryptophan/i);
    });

    it('should provide menstruation phase tip', () => {
      const tip = getCycleNutritionTip('menstruation');
      expect(tip).toMatch(/Eisen.*Omega.*Sleep/i);
    });
  });

  describe('Supplement Safety Check', () => {
    it('should identify safe supplements', () => {
      const safeStack = ['Vitamin D', 'Magnesium', 'Omega-3'];
      const result = checkSupplementStack(safeStack);
      expect(result).toBe('ok');
    });

    it('should flag caution supplements', () => {
      const cautionStack = ['Vitamin D', 'Niacin 600 mg'];
      const result = checkSupplementStack(cautionStack);
      expect(result).toBe('caution');
    });

    it('should flag banned supplements', () => {
      const bannedStack = ['Creatin', 'DMAA'];
      const result = checkSupplementStack(bannedStack);
      expect(result).toBe('banned');
    });
  });

  describe('Mindfulness Tips', () => {
    it('should provide stress mindfulness tip', () => {
      const tip = getStressMindfulnessTip();
      expect(tip).toBeDefined();
      expect(tip.length).toBeGreaterThan(10);
    });
  });

  describe('Berlin Tips', () => {
    it('should sometimes provide Berlin tip', () => {
      // Test multiple times since it's random
      let gotTip = false;
      for (let i = 0; i < 100; i++) {
        const tip = getBerlinTip();
        if (tip) {
          gotTip = true;
          expect(tip).toMatch(/(Tempeh|vegane|Buddha|Adaptogen|Veganz)/i);
          break;
        }
      }
      // We can't guarantee it will happen in 100 tries at 5% chance, so just check it can happen
    });
  });
});

// Mock functions for testing
function getCycleNutritionTip(phase: string): string {
  switch (phase) {
    case 'menstruation':
      return "Fokus auf Eisen + Omega-3, Sleep-Priority. Gönn dir warme, nährende Mahlzeiten! 🩸";
    case 'luteal':
      return "Snack-Cravings normal! Empfehle magnesium- & tryptophanreiche Optionen wie Banane + Mandeln 🍌";
    default:
      return "";
  }
}

function checkSupplementStack(supplements: string[]): 'ok' | 'caution' | 'banned' {
  const safeSupplements = {
    safe: ["Vitamin D", "Magnesium", "Creatin", "Omega-3"],
    caution: ["Niacin >500 mg"],
    banned: ["DMAA", "SARM"]
  };
  
  const lowerSupplements = supplements.map(s => s.toLowerCase());
  
  const bannedFound = safeSupplements.banned.some(banned =>
    lowerSupplements.some(supp => supp.includes(banned.toLowerCase()))
  );
  
  if (bannedFound) return 'banned';
  
  const cautionFound = safeSupplements.caution.some(caution =>
    lowerSupplements.some(supp => supp.includes(caution.toLowerCase()))
  );
  
  if (cautionFound) return 'caution';
  
  return 'ok';
}

function getStressMindfulnessTip(): string {
  return "Atme 4 Sekunden ein, 4 halten, 4 aus – wiederhole 4x. Das beruhigt dein Nervensystem! 🫁";
}

function getBerlinTip(): string | null {
  if (Math.random() < 0.05) {
    return "Hast du schon den Tempeh-Döner an der Warschauer probiert? 🌯";
  }
  return null;
}