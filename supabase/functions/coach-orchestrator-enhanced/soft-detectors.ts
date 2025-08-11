import type { Meta } from './open-intake.ts';

// Lightweight, non-blocking pattern detection for soft signals
export function detectSoftSignals(text: string): Meta["soft_signal"] {
  const t = text.toLowerCase();
  const out: Meta["soft_signal"] = [];
  
  // Meal logging signals
  if (/(essen|mahlzeit|heute gegessen|kalorien|kcal|frühstück|mittagessen|abendessen|snack)/.test(t)) {
    out.push("maybe_log_meal");
  }
  
  // Supplement signals
  if (/(supplement|kapsel|pulver|vitamin|stack|creatin|omega|magnesium|d3)/.test(t)) {
    out.push("maybe_add_supplement");
  }
  
  // Analysis signals
  if (/(check|prüf|analyse|interaktion|bewerte|schau|verträg)/.test(t)) {
    out.push("maybe_analyze_stack");
  }
  
  return out;
}

// Additional context-aware detection (can be extended)
export function detectDomainContext(text: string): Record<string, number> {
  const t = text.toLowerCase();
  const domains: Record<string, number> = {};
  
  // Training domain
  if (/(training|workout|fitness|kraft|cardio|satz|rep|übung)/.test(t)) {
    domains.training = 0.8;
  }
  
  // Nutrition domain
  if (/(ernährung|essen|kalorien|protein|kohlenhydrate|fett|makro)/.test(t)) {
    domains.nutrition = 0.7;
  }
  
  // Supplement domain
  if (/(supplement|vitamin|mineral|creatin|protein|pulver)/.test(t)) {
    domains.supplement = 0.75;
  }
  
  // Health/tracking domain
  if (/(gewicht|körper|messen|tracking|gesundheit|schlaf)/.test(t)) {
    domains.health = 0.6;
  }
  
  return domains;
}