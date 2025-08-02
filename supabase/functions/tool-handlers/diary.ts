// Diary tool handler for journal entries with mood analysis
export default async function handleDiary(conv: any[], userId: string) {
  const lastUserMsg = conv.slice().reverse().find(m => m.role === 'user')?.content ?? '';
  
  // Simple sentiment analysis based on keywords
  function analyzeSentiment(text: string): { mood_score: number; sentiment_tag: string } {
    const positiveWords = ['gut', 'super', 'toll', 'dankbar', 'glücklich', 'freude', 'erfolg', 'stolz', 'wunderbar', 'großartig'];
    const negativeWords = ['schlecht', 'müde', 'stress', 'schwer', 'traurig', 'frustriert', 'ärger', 'sorge', 'problem', 'schwierig'];
    
    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    let mood_score = 0;
    let sentiment_tag = 'neutral';
    
    if (positiveCount > negativeCount) {
      mood_score = Math.min(5, positiveCount);
      sentiment_tag = 'positive';
    } else if (negativeCount > positiveCount) {
      mood_score = Math.max(-5, -negativeCount);
      sentiment_tag = 'negative';
    }
    
    return { mood_score, sentiment_tag };
  }
  
  // Extract gratitude items
  function extractGratitude(text: string): string[] {
    const gratitudePatterns = /(?:dankbar für|bin dankbar|grateful for|thankful for)\s+([^.!?]+)/gi;
    const matches = [...text.matchAll(gratitudePatterns)];
    return matches.map(match => match[1].trim()).slice(0, 3);
  }
  
  const { mood_score, sentiment_tag } = analyzeSentiment(lastUserMsg);
  const gratitude_items = extractGratitude(lastUserMsg);
  const excerpt = lastUserMsg.length > 120 ? lastUserMsg.slice(0, 120) + '...' : lastUserMsg;
  
  return {
    role: 'assistant',
    type: 'card',
    card: 'diary',
    payload: {
      raw_text: lastUserMsg,
      mood_score,
      sentiment_tag,
      gratitude_items,
      excerpt,
      date: new Date().toISOString().split('T')[0],
      ts: Date.now(),
      actions: [{
        type: 'save_diary',
        label: 'Tagebuch speichern',
        data: {
          raw_text: lastUserMsg,
          mood_score,
          sentiment_tag,
          gratitude_items,
          date: new Date().toISOString().split('T')[0]
        }
      }]
    },
    meta: { clearTool: true }
  };
}