export type ToolName = 'trainingsplan' | 'supplement' | 'gewicht' | 'uebung' | 'foto' | 'quickworkout';

export interface ToolContext {
  tool: ToolName | 'chat';
  description: string;
  confidence: number;
}

export function detectToolIntent(text: string): ToolContext {
  const toolMap: Record<ToolName, { regex: RegExp; description: string }> = {
    trainingsplan: {
      regex: /(trainingsplan|workout.*plan|push.*pull|split|4.*tag|3.*tag|ganzkörper|upperbody|lowerbody|plan.*erstell)/i,
      description: 'Trainingsplan erstellen/bearbeiten'
    },
    supplement: {
      regex: /(supplement|kreatin|creatine|vitamin|zink|omega|protein.*pulver|magnesium|d3|b12|eisen)/i,
      description: 'Supplement-Empfehlung'
    },
    gewicht: {
      regex: /(gewicht|wiegen|kg|waage|gramm|pfund|weight|scale)/i,
      description: 'Gewicht erfassen'
    },
    uebung: {
      regex: /(übung|exercise|versuch.*mal|neue.*übung|bankdrücken|kniebeuge|kreuzheben|klimmzug)/i,
      description: 'Übung hinzufügen/analysieren'
    },
    foto: {
      regex: /(foto|picture|progress.*pic|bild|vorher.*nachher|transformation|körper.*foto)/i,
      description: 'Fortschritts-Foto analysieren'
    },
    quickworkout: {
      regex: /(schritte|walk|joggen|lauf|quickworkout|spazier|cardio|schnell.*training|10.*min)/i,
      description: 'Quick-Workout erfassen'
    }
  };

  // Suche nach dem besten Match
  let bestMatch: { tool: ToolName | 'chat'; confidence: number; description: string } = {
    tool: 'chat',
    confidence: 0,
    description: 'Freies Gespräch'
  };

  for (const [toolName, config] of Object.entries(toolMap)) {
    if (config.regex.test(text)) {
      // Berechne Confidence basierend auf Wort-Matches
      const matches = text.match(config.regex);
      const confidence = matches ? Math.min(matches.length * 0.3 + 0.7, 1.0) : 0;
      
      if (confidence > bestMatch.confidence) {
        bestMatch = {
          tool: toolName as ToolName,
          confidence,
          description: config.description
        };
      }
    }
  }

  return {
    tool: bestMatch.tool,
    description: bestMatch.description,
    confidence: bestMatch.confidence
  };
}

export function getToolEmoji(tool: ToolName | 'chat'): string {
  const emojiMap: Record<ToolName | 'chat', string> = {
    trainingsplan: '🏋️',
    supplement: '💊',
    gewicht: '⚖️',
    uebung: '💪',
    foto: '📸',
    quickworkout: '🏃',
    chat: '💬'
  };
  
  return emojiMap[tool] || '❓';
}

export function shouldUseTool(toolContext: ToolContext): boolean {
  return toolContext.tool !== 'chat' && toolContext.confidence > 0.6;
}