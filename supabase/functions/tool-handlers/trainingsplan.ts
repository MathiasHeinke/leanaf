export default async function handleTrainingsplan(conv: any[], userId: string) {
  const lastUserMsg = conv.slice().reverse().find(m => m.role === 'user')?.content ?? '';
  
  // Simple placeholder - could be enhanced with AI generation
  return {
    role: 'assistant',
    type: 'card',
    card: 'plan',
    payload: { 
      html: `<div>
        <h3>Trainingsplan für: ${lastUserMsg}</h3>
        <p>Dein individueller Plan wird erstellt...</p>
      </div>`,
      ts: Date.now()
    }
  };
}