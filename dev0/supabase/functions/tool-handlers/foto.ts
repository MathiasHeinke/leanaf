// This tool is deprecated - image classification is now handled 
// intelligently in enhanced-coach-chat/index.ts
export default async function handleFoto(images: string[], userId: string) {
  return {
    role: 'assistant',
    content: 'Bildanalyse wird nun automatisch durchgeführt...',
    meta: { clearTool: true }
  };
}