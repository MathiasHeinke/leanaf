export type ToolName = 'trainingsplan' | 'createPlanDraft' | 'savePlanDraft' | 'supplement' | 'gewicht' | 'uebung' | 'foto' | 'quickworkout' | 'diary' | 'mealCapture' | 'goalCheckin';

export interface ToolContext {
  tool: ToolName | 'chat';
  description: string;
  confidence: number;
}

export function detectToolIntent(text: string): ToolContext {
  const tools: { tool: ToolName; description: string; confidence: number }[] = [];

  // Trainingsplan draft creation detection
  const createPlanPatterns = [
    /(trainingsplan.*erstell|workout.*plan.*bau|push.*pull.*plan|split.*erstell|plan.*für.*training)/i,
    /\b(erstelle.*plan|baue.*plan|neue.*routine|training.*programm)\b/i
  ];
  
  const createPlanMatches = createPlanPatterns.filter(pattern => pattern.test(text)).length;
  if (createPlanMatches > 0) {
    const confidence = Math.min(0.9, createPlanMatches * 0.4);
    tools.push({ tool: 'createPlanDraft', description: 'Trainingsplan-Entwurf erstellen', confidence });
  }

  // Supplement detection
  const supplementPatterns = [
    /(supplement|kreatin|creatine|vitamin|zink|omega|protein.*pulver|magnesium|d3|b12|eisen)/i,
    /\b(nahrungsergänzung|pillen|tabletten|kapsel)\b/i
  ];
  
  const supplementMatches = supplementPatterns.filter(pattern => pattern.test(text)).length;
  if (supplementMatches > 0) {
    const confidence = Math.min(0.9, supplementMatches * 0.4);
    tools.push({ tool: 'supplement', description: 'Supplement-Empfehlung', confidence });
  }

  // Weight detection
  const weightPatterns = [
    /(gewicht|wiegen|kg|waage|gramm|pfund|weight|scale)/i,
    /\b(\d+[\.,]?\d*)\s*(kg|kilogramm|pfund)\b/i
  ];
  
  const weightMatches = weightPatterns.filter(pattern => pattern.test(text)).length;
  if (weightMatches > 0) {
    const confidence = Math.min(0.9, weightMatches * 0.4);
    tools.push({ tool: 'gewicht', description: 'Gewicht erfassen', confidence });
  }

  // Exercise detection
  const exercisePatterns = [
    /(übung|exercise|versuch.*mal|neue.*übung|bankdrücken|kniebeuge|kreuzheben|klimmzug)/i,
    /\b(sätze|wiederholung|reps|set|trainieren)\b/i
  ];
  
  const exerciseMatches = exercisePatterns.filter(pattern => pattern.test(text)).length;
  if (exerciseMatches > 0) {
    const confidence = Math.min(0.9, exerciseMatches * 0.4);
    tools.push({ tool: 'uebung', description: 'Übung hinzufügen', confidence });
  }

  // Photo detection
  const photoPatterns = [
    /(foto|picture|progress.*pic|bild|vorher.*nachher|transformation|körper.*foto)/i,
    /\b(selfie|photo|aufnahme|knipsen)\b/i
  ];
  
  const photoMatches = photoPatterns.filter(pattern => pattern.test(text)).length;
  if (photoMatches > 0) {
    const confidence = Math.min(0.9, photoMatches * 0.4);
    tools.push({ tool: 'foto', description: 'Foto analysieren', confidence });
  }

  // Quickworkout detection
  const quickworkoutPatterns = [
    /\b(spazier|walk|lauf|jogg|cardio|training|sport)\b/i,
    /\b(\d+)\s*(schritte|steps|km|meter|minuten|min)\b/i,
    /\b(bewegung|aktivität|quick.*workout)\b/i
  ];
  
  const quickworkoutMatches = quickworkoutPatterns.filter(pattern => pattern.test(text)).length;
  if (quickworkoutMatches > 0) {
    const confidence = Math.min(0.9, quickworkoutMatches * 0.3);
    tools.push({ tool: 'quickworkout', description: 'Quick-Workout dokumentieren', confidence });
  }

  // Diary detection
  const diaryPatterns = [
    /\b(tagebuch|reflexion|dankbar|gefühl|heute\s+war|bin\s+dankbar|journal)\b/i,
    /\b(stimmung|mood|emotional|gedanken|erlebnis|highlight)\b/i,
    /\b(herausforderung|schwierigkeit|positive|negative|empfindung)\b/i
  ];
  
  const diaryMatches = diaryPatterns.filter(pattern => pattern.test(text)).length;
  if (diaryMatches > 0) {
    const confidence = Math.min(0.9, diaryMatches * 0.4);
    tools.push({ tool: 'diary', description: 'Tagebuch-Eintrag erstellen', confidence });
  }

  // Meal capture detection
  const mealPatterns = [
    /\b(\d+)\s*(g|kg|gramm|ml|liter)\s+\w+/i,
    /\b(gegessen|essen|mahlzeit|kalorien|nährwerte|haferflocken|reis|hähnchen)\b/i,
    /\b(frühstück|mittagessen|abendessen|snack|zwischenmahlzeit)\b/i
  ];
  
  const mealMatches = mealPatterns.filter(pattern => pattern.test(text)).length;
  if (mealMatches > 0) {
    const confidence = Math.min(0.9, mealMatches * 0.4);
    tools.push({ tool: 'mealCapture', description: 'Mahlzeit erfassen', confidence });
  }

  // Goal check-in detection
  const goalPatterns = [
    /\b(fortschritt|auf\s+kurs|ziel|progress|check|stand)\b/i,
    /\b(bin\s+ich|wie\s+stehe|schaffe\s+ich|erreiche\s+ich)\b/i,
    /\b(kpi|kennzahl|bilanz|erfolg|zielerreichung)\b/i
  ];
  
  const goalMatches = goalPatterns.filter(pattern => pattern.test(text)).length;
  if (goalMatches > 0) {
    const confidence = Math.min(0.9, goalMatches * 0.4);
    tools.push({ tool: 'goalCheckin', description: 'Fortschritt überprüfen', confidence });
  }

  // Return the best match or default to chat
  if (tools.length === 0) {
    return { tool: 'chat', description: 'Freies Gespräch', confidence: 0 };
  }

  // Sort by confidence and return the best match
  tools.sort((a, b) => b.confidence - a.confidence);
  return tools[0];
}

export function getToolEmoji(tool: ToolName | 'chat'): string {
  const emojiMap: Record<ToolName | 'chat', string> = {
    trainingsplan: '📋',
    createPlanDraft: '📝',
    savePlanDraft: '💾',
    supplement: '💊',
    gewicht: '⚖️',
    uebung: '🏋️',
    foto: '📸',
    quickworkout: '🏃',
    diary: '📖',
    mealCapture: '🍽️',
    goalCheckin: '🎯',
    chat: '💬'
  };
  return emojiMap[tool];
}

// Intent filtering function to check if tool usage is appropriate
export function isIntentAppropriate(text: string, toolContext: ToolContext): boolean {
  // Check if message is purely emotional/reflective
  const emotionalPatterns = [
    /\b(fühl|gefühl|emotion|müde|stress|motivation|durchhang|schwer|hart|anstrengend)\b/i,
    /\b(bin.*stolz|bin.*dankbar|freue.*mich|bin.*motiviert|schaffe.*es)\b/i,
    /\b(heute.*war|gestern.*war|war.*schwer|war.*gut|lief.*gut)\b/i
  ];
  
  const isEmotional = emotionalPatterns.some(pattern => pattern.test(text));
  
  // For weight tool specifically - check if it's actually about entering weight data
  if (toolContext.tool === 'gewicht') {
    const hasNumericWeight = /\b(\d+[\.,]?\d*)\s*(kg|kilogramm)\b/i.test(text);
    const hasWeightIntent = /\b(wiege|gewicht.*ist|aktuell.*kg|heute.*kg)\b/i.test(text);
    
    // Only trigger weight tool if there's clear numeric intent
    if (!hasNumericWeight && !hasWeightIntent) {
      return false;
    }
    
    // Don't trigger if it's purely emotional talk about weight struggles
    if (isEmotional && !hasNumericWeight) {
      return false;
    }
  }
  
  // For diary tool - allow emotional content
  if (toolContext.tool === 'diary' && isEmotional) {
    return true;
  }
  
  // For other tools, avoid triggering on purely emotional content
  if (isEmotional && toolContext.tool !== 'diary') {
    return false;
  }
  
  return true;
}

export function shouldUseTool(toolContext: ToolContext): boolean {
  return toolContext.tool !== 'chat' && toolContext.confidence > 0.6;
}