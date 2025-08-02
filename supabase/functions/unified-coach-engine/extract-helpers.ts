// Helper functions for extracting data from user messages

export function extractQuickWorkoutData(message: string): {
  description: string;
  steps: number | null;
  distance: number | null;
  duration: number | null;
} {
  const lowerMessage = message.toLowerCase();
  
  // Extrahiere Schritte
  const stepsMatch = message.match(/(\d+(?:\.\d+)?)\s*(?:schritte|steps)/i);
  const steps = stepsMatch ? parseInt(stepsMatch[1]) : null;
  
  // Extrahiere Distanz
  const distanceMatch = message.match(/(\d+(?:[\.,]\d+)?)\s*(?:km|kilometer|meter|m)/i);
  let distance = null;
  if (distanceMatch) {
    const value = parseFloat(distanceMatch[1].replace(',', '.'));
    distance = lowerMessage.includes('meter') && !lowerMessage.includes('kilometer') ? value / 1000 : value;
  }
  
  // Extrahiere Dauer
  const durationMatch = message.match(/(\d+(?:[\.,]\d+)?)\s*(?:min|minuten|stunden|h)/i);
  let duration = null;
  if (durationMatch) {
    const value = parseFloat(durationMatch[1].replace(',', '.'));
    duration = lowerMessage.includes('stunden') || lowerMessage.includes(' h') ? value * 60 : value;
  }
  
  // Beschreibung generieren
  let description = 'Quick-Workout';
  if (lowerMessage.includes('jogg') || lowerMessage.includes('lauf')) {
    description = 'Joggen/Laufen';
  } else if (lowerMessage.includes('walk') || lowerMessage.includes('spazier')) {
    description = 'Spaziergang/Walking';
  } else if (lowerMessage.includes('cardio')) {
    description = 'Cardio-Training';
  }
  
  return { description, steps, distance, duration };
}