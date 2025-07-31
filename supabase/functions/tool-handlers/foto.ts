export default async function handleFoto(conv: any[], userId: string) {
  const lastUserMsg = conv.slice().reverse().find(m => m.role === 'user')?.content ?? '';
  
  return {
    role: 'assistant',
    type: 'card',
    card: 'mindset',
    payload: { 
      html: `<div>
        <h3>Fortschritt-Foto</h3>
        <p>Foto verarbeitet: ${lastUserMsg}</p>
      </div>`,
      ts: Date.now()
    }
  };
}