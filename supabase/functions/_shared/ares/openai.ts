
export async function callOpenAI({ system, user }: { system: string; user: string }) {
  const key = Deno.env.get('OPENAI_API_KEY')!;
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-5-mini-2025-08-07',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      max_completion_tokens: 800
      // No temperature for GPT-5 models
    })
  });
  if (!res.ok) {
    const msg = `OpenAI API error: ${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  const j = await res.json();
  const reply = j?.choices?.[0]?.message?.content ?? '';
  return { raw: j, reply };
}
