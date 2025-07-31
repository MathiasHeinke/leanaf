export default async function handleFoto(images: string[], userId: string) {
  return {
    role: 'assistant',
    type: 'card',
    card: 'meal',
    payload: { 
      html: `<div>
        <h3>📸 Bild-Analyse</h3>
        <p>Dein Bild wird analysiert...</p>
        <p>Anzahl Bilder: ${images.length}</p>
      </div>`,
      ts: Date.now()
    },
    meta: { clearTool: true }
  };
}