/**
 * Speech Guard System for Coach Personas
 * Ensures consistent language patterns and character authenticity
 */

export interface SpeechStyle {
  dialect: string;
  greetings: {
    morning: string;
    afternoon: string;
    evening: string;
    lateNight: string;
  };
  fillerWords: string[];
  sentenceMaxWords: number;
  exclamationMax: number;
  regionCharacteristics?: string;
}

export function saschaGuard(reply: string, style: SpeechStyle): string {
  if (!reply || typeof reply !== 'string') return reply;
  
  // 1. Limit exclamation marks
  reply = reply.replace(/!{2,}/g, '!');
  const exclamationCount = (reply.match(/!/g) || []).length;
  if (exclamationCount > style.exclamationMax) {
    // Remove excess exclamations, keep only the first ones
    let count = 0;
    reply = reply.replace(/!/g, (match) => {
      count++;
      return count <= style.exclamationMax ? match : '.';
    });
  }
  
  // 2. Sentence length guard (soft limit)
  const sentences = reply.split(/[.!?]+/).filter(s => s.trim());
  const processedSentences = sentences.map(sentence => {
    const words = sentence.trim().split(/\s+/);
    if (words.length > style.sentenceMaxWords) {
      // Soft truncate with ellipsis for readability
      return words.slice(0, style.sentenceMaxWords - 1).join(' ') + '...';
    }
    return sentence.trim();
  });
  
  // 3. Ensure proper sentence ending
  let result = processedSentences.join('. ').trim();
  if (result && !result.match(/[.!?]$/)) {
    result += '.';
  }
  
  return result;
}

export function applyTimeBasedGreeting(reply: string, style: SpeechStyle, currentHour: number): string {
  // Replace generic greetings with time-appropriate ones
  let greeting = style.greetings.afternoon; // default
  
  if (currentHour < 11) {
    greeting = style.greetings.morning;
  } else if (currentHour >= 17 && currentHour < 22) {
    greeting = style.greetings.evening;
  } else if (currentHour >= 22 || currentHour < 6) {
    greeting = style.greetings.lateNight;
  }
  
  // Replace common greeting patterns
  reply = reply.replace(/^(Hallo|Hey|Hi|Guten (Morgen|Tag|Abend))/i, greeting);
  
  return reply;
}

export function validatePersonaResponse(reply: string, personaId: string): boolean {
  if (!reply || typeof reply !== 'string') return false;
  
  // Persona-specific validation rules
  switch (personaId) {
    case 'sascha':
      // Check for overly emotional language (should be stoic)
      const overEmotional = /wahnsinnig|fantastisch|genial|super toll|mega/gi;
      if (overEmotional.test(reply)) return false;
      
      // Check for appropriate military context usage
      const militaryTerms = /truppe|bundeswehr|rekrut|feldwebel|einsatz/gi;
      const militaryCount = (reply.match(militaryTerms) || []).length;
      if (militaryCount > 1) return false; // Max 1 military reference per response
      
      break;
      
    case 'lucy':
      // Check emoji usage
      const emojiCount = (reply.match(/[🌟✨💪🏋️‍♀️🥗🧘‍♀️]/g) || []).length;
      if (emojiCount > 3) return false;
      
      break;
      
    case 'markus':
      // Check for Hessian dialect overuse
      const hessianTerms = /babbo|ei|net/gi;
      const hessianCount = (reply.match(hessianTerms) || []).length;
      if (hessianCount > 2) return false;
      
      break;
  }
  
  return true;
}

// Enhanced speech guard with persona integration
export function enhancedSpeechGuard(
  reply: string, 
  personaId: string, 
  style: SpeechStyle, 
  currentHour: number = new Date().getHours()
): string {
  if (!reply) return reply;
  
  // Apply speech style guards
  let processed = saschaGuard(reply, style);
  
  // Apply time-based greeting
  processed = applyTimeBasedGreeting(processed, style, currentHour);
  
  // Validate persona consistency
  if (!validatePersonaResponse(processed, personaId)) {
    console.warn(`Speech guard validation failed for ${personaId}`);
    // Fallback to more neutral response if validation fails
    processed = processed.replace(/wahnsinnig|fantastisch|genial/gi, 'gut');
  }
  
  return processed;
}
