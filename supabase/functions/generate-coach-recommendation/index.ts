
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { coachPersonality, userName, aiUsageStatus, messageType = 'daily_motivation' } = await req.json();

    // Analyze AI usage to create context-aware messages
    let aiContext = '';
    let upgradeUrgency = 'low';
    
    if (aiUsageStatus) {
      const { coach_chat, meal_analysis, coach_recipes } = aiUsageStatus;
      
      const totalUsed = (coach_chat?.daily_count || 0) + 
                       (meal_analysis?.daily_count || 0) + 
                       (coach_recipes?.daily_count || 0);
      
      if (totalUsed > 5) {
        upgradeUrgency = 'high';
        aiContext = 'User ist sehr aktiv mit AI-Features - bereits über 5 Nutzungen heute. Perfekter Kandidat für Pro!';
      } else if (totalUsed > 2) {
        upgradeUrgency = 'medium';
        aiContext = 'User nutzt AI-Features regelmäßig. Zeige Vorteile von unlimited AI auf.';
      } else if (totalUsed > 0) {
        upgradeUrgency = 'low';
        aiContext = 'User hat heute AI-Features genutzt. Sanft auf Pro-Vorteile hinweisen.';
      } else {
        aiContext = 'User hat heute noch keine AI-Features genutzt. Motiviere zur Nutzung und zeige Pro-Vorteile.';
      }
    }

    const systemPrompts = {
      sascha: `Du bist Sascha, ein direkter und harter Coach. 

KONTEXT: ${aiContext}
UPGRADE-DRINGLICHKEIT: ${upgradeUrgency}

Schreibe eine kurze, knackige Nachricht (max 30 Wörter) für ${userName || 'den User'}, die ihn motiviert, das Pro-Paket zu holen. 

Berücksichtige dabei:
- Sei direkt, nutze "Du", keine Emojis außer einem am Ende
- Bei hoher Urgency: Betone dass er bereits AI-Power nutzt und mit Pro unlimited wird
- Bei mittlerer Urgency: Zeige auf, wie Pro seine AI-Nutzung verstärkt  
- Bei niedriger Urgency: Motiviere zu mehr AI-Nutzung + Pro

Fokus: schnellere Zielerreichung mit Pro.`,
      
      lucy: `Du bist Lucy, eine sanfte und einfühlsame Coach.

KONTEXT: ${aiContext}
UPGRADE-DRINGLICHKEIT: ${upgradeUrgency}

Schreibe eine warme, kurze Nachricht (max 30 Wörter) für ${userName || 'den User'}, die ihn ermutigt, das Pro-Paket zu probieren.

Berücksichtige dabei:
- Sei liebevoll, nutze "Du", max 1 Emoji
- Bei hoher Urgency: Würdige seine aktive AI-Nutzung und zeige Pro als nächsten Schritt
- Bei mittlerer Urgency: Ermutige ihn, die AI-Features voll zu nutzen mit Pro
- Bei niedriger Urgency: Sanft zur AI-Nutzung und Pro ermutigen

Fokus: leichterer Weg zu den Zielen.`,
      
      kai: `Du bist Kai, ein energischer und motivierender Coach.

KONTEXT: ${aiContext}
UPGRADE-DRINGLICHKEIT: ${upgradeUrgency}

Schreibe eine dynamische, kurze Nachricht (max 30 Wörter) für ${userName || 'den User'}, die ihn begeistert, das Pro-Paket zu holen.

Berücksichtige dabei:
- Sei energisch, nutze "Du", max 2 Emojis
- Bei hoher Urgency: Feiere seine AI-Nutzung und pushe ihn zu Pro für maximum Power
- Bei mittlerer Urgency: Motiviere ihn, seine AI-Journey mit Pro zu maximieren
- Bei niedriger Urgency: Begeistere ihn für AI-Features und Pro-Power

Fokus: bessere Ergebnisse mit Pro.`
    };

    const prompt = systemPrompts[coachPersonality as keyof typeof systemPrompts] || systemPrompts.sascha;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: `Generiere jetzt die Coach-Empfehlung für das Pro-Paket. MessageType: ${messageType}` }
        ],
        max_tokens: 60,
        temperature: 0.8,
      }),
    });

    const data = await response.json();
    const recommendation = data.choices[0].message.content.trim();

    return new Response(JSON.stringify({ 
      recommendation,
      aiContext,
      upgradeUrgency
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating coach recommendation:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
