import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export default async function handleSupplement(conv: any[], userId: string) {
  const lastUserMsg = conv.slice().reverse().find(m => m.role === 'user')?.content ?? '';
  
  // Enhanced supplement parsing with fallback
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Simple supplement recognition patterns
    const supplementPattern = /(vitamin|creatin|omega|protein|magnesium|zinc|eisen|kalzium)/i;
    const dosagePattern = /(\d+(?:[.,]\d+)?)\s*(mg|g|µg|mcg|iu)/i;
    
    let detectedSupplement = '';
    let detectedDose = '1 Portion';
    
    const supplementMatch = lastUserMsg.match(supplementPattern);
    if (supplementMatch) {
      detectedSupplement = supplementMatch[1];
    }
    
    const dosageMatch = lastUserMsg.match(dosagePattern);
    if (dosageMatch) {
      detectedDose = `${dosageMatch[1]} ${dosageMatch[2]}`;
    }

    // If we detected a supplement, try to save it with fallback handling
    if (detectedSupplement) {
      try {
        const { data, error } = await supabase.functions.invoke('supplement-save', {
          body: {
            mode: 'insert',
            item: {
              canonical: detectedSupplement.toLowerCase(),
              name: detectedSupplement,
              dose: detectedDose,
              schedule: { timing: ['morning'] },
              notes: `Erkannt aus: "${lastUserMsg.substring(0, 100)}"`
            },
            userId,
            clientEventId: `supplement_${Date.now()}`
          }
        });

        if (!error && data?.success) {
          return {
            role: 'assistant',
            type: 'card',
            card: 'supplement',
            payload: { 
              html: `<div>
                <h3>✅ Supplement gespeichert</h3>
                <p><strong>${detectedSupplement}</strong> - ${detectedDose}</p>
                <p>Erkannt aus: "${lastUserMsg}"</p>
              </div>`,
              ts: Date.now()
            },
            meta: { clearTool: true }
          };
        }
      } catch (saveError) {
        console.warn('Supplement save failed:', saveError);
        // Continue with fallback response
      }
    }

    // Fallback response for unrecognized or failed supplements
    return {
      role: 'assistant',
      type: 'card', 
      card: 'supplement',
      payload: { 
        html: `<div>
          <h3>Supplement-Empfehlung</h3>
          <p>Basierend auf: "${lastUserMsg}"</p>
          ${detectedSupplement ? `<p>Erkannt: <strong>${detectedSupplement}</strong></p>` : ''}
          <p>💡 Verwende das Supplement-Tool für präzise Erfassung</p>
        </div>`,
        ts: Date.now()
      },
      meta: { clearTool: true }
    };

  } catch (error) {
    console.error('Supplement handler error:', error);
    
    // Graceful error fallback
    return {
      role: 'assistant',
      type: 'card',
      card: 'supplement', 
      payload: { 
        html: `<div>
          <h3>Supplement-Hinweis</h3>
          <p>Verwende das Supplement-Tool für die beste Erfassung deiner Supplements.</p>
          <p>Nachricht: "${lastUserMsg}"</p>
        </div>`,
        ts: Date.now()
      },
      meta: { clearTool: true }
    };
  }
}