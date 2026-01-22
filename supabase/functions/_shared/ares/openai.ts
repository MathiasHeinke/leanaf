
export async function callOpenAI({ system, user }: { system: string; user: string }) {
  const key = Deno.env.get('OPENAI_API_KEY')!;
  
  // Retry logic with exponential backoff
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user }
          ],
          max_tokens: 800,
          temperature: 0.7
        })
      });
      
      if (res.ok) {
        const j = await res.json();
        const reply = j?.choices?.[0]?.message?.content ?? '';
        return { raw: j, reply };
      }
      
      // Don't retry on client errors (4xx)
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        throw new Error(`OPENAI_${res.status}: ${res.statusText}`);
      }
      
      // Retry on 429, 5xx errors
      if (![429, 500, 502, 503, 504].includes(res.status)) {
        throw new Error(`OPENAI_${res.status}: ${res.statusText}`);
      }
      
      // Wait before retry
      const delays = [0, 250, 1000];
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, delays[attempt + 1]));
      }
    } catch (error) {
      if (attempt === 2) {
        throw new Error('OPENAI_RETRY_EXHAUSTED');
      }
      // Continue to next attempt
    }
  }
  
  throw new Error('OPENAI_RETRY_EXHAUSTED');
}
