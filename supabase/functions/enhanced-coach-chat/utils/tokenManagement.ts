// ============= TOKEN MANAGEMENT UTILITIES =============

export const estimateTokenCount = (messages: any[]): number => {
  const text = JSON.stringify(messages);
  return Math.ceil(text.length / 4); // Rough estimation: 4 chars per token
};

export const intelligentTokenShortening = async (
  messages: any[], 
  targetBudget: number, 
  intent: string,
  supabase?: any
): Promise<any[]> => {
  const currentTokens = estimateTokenCount(messages);
  
  if (currentTokens <= targetBudget) {
    return messages;
  }
  
  console.log(`🔧 Applying intelligent shortening: ${currentTokens} → ${targetBudget} tokens`);
  
  const systemMessage = messages[0];
  const userMessage = messages[messages.length - 1];
  const historyMessages = messages.slice(1, -1);
  
  let shortenedMessages = [systemMessage];
  
  // Strategy 1: Reduce history length
  if (historyMessages.length > 0) {
    const historyBudget = Math.floor(targetBudget * 0.4); // 40% for history
    const avgHistoryTokens = estimateTokenCount(historyMessages) / historyMessages.length;
    const maxHistoryCount = Math.floor(historyBudget / avgHistoryTokens);
    
    if (maxHistoryCount < historyMessages.length) {
      console.log(`📝 Reducing history: ${historyMessages.length} → ${maxHistoryCount} messages`);
      shortenedMessages.push(...historyMessages.slice(-maxHistoryCount));
    } else {
      shortenedMessages.push(...historyMessages);
    }
  }
  
  // Strategy 2: Shorten system message if still over budget
  shortenedMessages.push(userMessage);
  const currentSize = estimateTokenCount(shortenedMessages);
  
  if (currentSize > targetBudget) {
    console.log('✂️ Shortening system message...');
    const systemContent = systemMessage.content;
    const sections = systemContent.split('\n\n');
    
    // Keep essential sections based on intent
    const essentialSections = filterEssentialSections(sections, intent);
    const shortenedSystemContent = essentialSections.join('\n\n');
    
    shortenedMessages[0] = { ...systemMessage, content: shortenedSystemContent };
  }
  
  return shortenedMessages;
};

const filterEssentialSections = (sections: string[], intent: string): string[] => {
  // Always keep coach personality and basic instructions
  const essentialPatterns = [
    /Du bist|You are/i, // Coach personality
    /Verhalten|Behavior/i, // Behavior instructions
    /Antworte|Respond/i, // Response guidelines
  ];
  
  // Intent-specific important sections
  const intentPatterns = {
    nutrition: [/Ernährung|Nutrition|Mahlzeit|Meal/i, /Kalorien|Calories/i],
    workout: [/Training|Workout|Übung|Exercise/i, /Muskel|Muscle/i],
    health: [/Gesundheit|Health|Schlaf|Sleep/i, /Regeneration|Recovery/i],
    supplements: [/Supplement|Vitamin|Mineral/i, /Nährstoff|Nutrient/i],
    general_advice: essentialPatterns
  };
  
  const relevantPatterns = [
    ...essentialPatterns,
    ...(intentPatterns[intent as keyof typeof intentPatterns] || [])
  ];
  
  return sections.filter(section => 
    relevantPatterns.some(pattern => pattern.test(section)) ||
    section.length < 200 // Keep short sections
  );
};

// ============= HISTORY SUMMARIZATION WITH GPT-4O-MINI =============
export const summarizeHistory = async (
  messages: any[], 
  openAIApiKey: string,
  maxSummaryTokens: number = 400
): Promise<string> => {
  if (messages.length <= 10) {
    return JSON.stringify(messages);
  }
  
  try {
    const historyText = messages.map(m => `${m.role}: ${m.content}`).join('\n');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Summarize this conversation history in max ${maxSummaryTokens} tokens. Focus on:
- User's goals and preferences
- Important achievements or struggles mentioned
- Key topics discussed
- Coach-user relationship dynamics
Keep it concise but informative for context.`
          },
          {
            role: 'user',
            content: `Conversation to summarize:\n${historyText}`
          }
        ],
        max_tokens: maxSummaryTokens,
        temperature: 0.3
      })
    });
    
    if (!response.ok) {
      console.error('History summarization failed:', response.status);
      return JSON.stringify(messages.slice(-5)); // Fallback to recent messages
    }
    
    const data = await response.json();
    const summary = data.choices[0]?.message?.content;
    
    if (summary) {
      console.log('📝 History summarized successfully');
      return `[CONVERSATION SUMMARY]: ${summary}`;
    }
    
    return JSON.stringify(messages.slice(-5));
  } catch (error) {
    console.error('Error summarizing history:', error);
    return JSON.stringify(messages.slice(-5));
  }
};
