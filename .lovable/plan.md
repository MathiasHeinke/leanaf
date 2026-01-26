
# ARES Epiphany Card + Icon Fix Implementation

## Uebersicht

Zwei Aenderungen:
1. **Icon Fix**: `Sun` durch `Sunrise` ersetzen fuer "Morgens" (authentischer)
2. **Epiphany Card**: Komplett neues System mit AI-generierten Insights statt statischer Mathe

---

## Teil 1: Morning Icon Fix (Quick Win)

### Aenderungen

| Datei | Aenderung |
|-------|-----------|
| `src/hooks/useActionCards.ts` | Import `Sunrise` statt `Sun`, alle `icon: Sun` zu `icon: Sunrise` |
| `src/components/home/SmartFocusCard.tsx` | Import `Sunrise`, Fallback-Liste anpassen |

### Code-Snippet (useActionCards.ts Zeile 11)

```typescript
// VORHER:
import { BrainCircuit, Moon, PenTool, Pill, User, Droplets, Coffee, Check, LucideIcon, Sun, Clock, Dumbbell } from 'lucide-react';

// NACHHER:
import { BrainCircuit, Moon, PenTool, Pill, User, Droplets, Coffee, Check, LucideIcon, Sunrise, Clock, Dumbbell } from 'lucide-react';
```

### Code-Snippet (useActionCards.ts Zeile 82)

```typescript
// VORHER:
return { id: 'morning', label: 'Morgens', icon: Sun, primary: true };

// NACHHER:
return { id: 'morning', label: 'Morgens', icon: Sunrise, primary: true };
```

---

## Teil 2: ARES Epiphany Card System

### Das Konzept

```text
+-------------------------------------------+
|  PHASE 1: MYSTERY (vor Klick)             |
|                                           |
|  [Pulsierende Violette Karte]             |
|  "ARES hat ein Muster erkannt"            |
|  [Tap to Reveal] Button                   |
+-------------------------------------------+
           |
           v (User klickt)
+-------------------------------------------+
|  PHASE 2: LOADING                         |
|                                           |
|  [Skeleton Animation]                     |
|  Edge Function generiert Insight...       |
+-------------------------------------------+
           |
           v (API Response)
+-------------------------------------------+
|  PHASE 3: REVELATION                      |
|                                           |
|  [Card Flip Animation]                    |
|  "Dein Protein-Timing ist suboptimal.     |
|   Abendtraining ohne Post-Workout         |
|   Protein korreliert mit -15% Schlaf."    |
|                                           |
|  [Was bedeutet das?] -> Opens Chat        |
+-------------------------------------------+
```

### Architektur

```text
Frontend                          Backend
---------                         -------
ActionCardStack                   ares-insight-generator (NEW)
     |                                   |
     v                                   v
EpiphanyCard.tsx (NEW)  --->  Gemini 3 Flash (quick insight)
     |                                   |
     | onReveal()                        | Analyzes:
     |                                   |   - Last 7 days daily_logs
     v                                   |   - Sleep patterns
handleReveal() ----------------->        |   - Nutrition timing
     |                                   |   - Training correlation
     |                                   |
     v                                   v
setInsight(response) <------- { insight: "Dein..." }
     |
     v
Card Flip Animation
     |
     v
[Was bedeutet das?] -> Opens Chat with context
```

---

### Neue Dateien

#### 1. Frontend: `src/components/home/EpiphanyCard.tsx`

Standalone Komponente mit 3 States:

```typescript
interface EpiphanyCardProps {
  onOpenChat: (prompt: string) => void;
  onDismiss: () => void;
}

const EpiphanyCard: React.FC<EpiphanyCardProps> = ({ onOpenChat, onDismiss }) => {
  const [phase, setPhase] = useState<'mystery' | 'loading' | 'revealed'>('mystery');
  const [insight, setInsight] = useState<string | null>(null);
  
  const handleReveal = async () => {
    setPhase('loading');
    
    // Call edge function
    const { data } = await supabase.functions.invoke('ares-insight-generator');
    
    if (data?.insight) {
      setInsight(data.insight);
      setPhase('revealed');
    }
  };
  
  return (
    <motion.div className="...">
      <AnimatePresence mode="wait">
        {phase === 'mystery' && <MysteryState onReveal={handleReveal} />}
        {phase === 'loading' && <LoadingState />}
        {phase === 'revealed' && (
          <RevealedState 
            insight={insight} 
            onAskMore={() => onOpenChat(`Du hast mir gesagt: "${insight}". Erklaere mir das genauer und was ich konkret tun soll.`)}
            onDismiss={onDismiss}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
```

**MysteryState Design:**
- Gradient: `from-indigo-900 via-violet-800 to-purple-900`
- Animated mesh background (subtle pulsing)
- Icon: `Sparkles` (pulsierend)
- Text: "ARES hat ein Muster erkannt"
- Subtext: "Basierend auf deinen letzten 7 Tagen"
- Button: "Aufdecken" mit `ChevronRight` icon

**LoadingState Design:**
- Skeleton shimmer animation
- Text: "Analysiere Korrelationen..."

**RevealedState Design:**
- Gradient: Cleaner `from-slate-900 to-slate-800`
- Icon: `Lightbulb` mit glow effect
- Insight text in quotes, larger font
- "Was bedeutet das?" Button -> Opens chat
- "X" Icon top-right to dismiss

---

#### 2. Backend: `supabase/functions/ares-insight-generator/index.ts`

Neue Edge Function die echte Korrelationen analysiert:

```typescript
// System Prompt fuer den Insight Generator
const INSIGHT_SYSTEM_PROMPT = `Du bist ARES, ein analytischer Coach.

DEINE AUFGABE:
Analysiere die User-Daten und finde EIN nicht-offensichtliches Muster oder eine Korrelation.

REGELN:
1. Formuliere als EINE kurze, praegnante Erkenntnis (max 2 Saetze)
2. Sei spezifisch - nutze echte Zahlen aus den Daten
3. Zeige eine KORRELATION, keine reine Statistik
4. Beispiele guter Insights:
   - "Dein Protein-Timing ist suboptimal. An Trainingstagen ohne Post-Workout Protein sinkt dein Schlaf-Score um 15%."
   - "Deine Hydration beeinflusst deine Energie. An Tagen mit >2.5L Wasser trackst du 23% mehr Schritte."
   - "Du erreichst dein Kalorienziel nur an Tagen, an denen du morgens fruehstueckst."

5. VERMEIDE:
   - Reine Mathe ("Du bist 500kcal unter Ziel")
   - Offensichtliches ("Du hast wenig geschlafen")
   - Generisches ("Trink mehr Wasser")

ANTWORTE NUR mit dem Insight-Satz, keine Erklaerung.`;

serve(async (req) => {
  // 1. Auth check
  const user = await getUser(req);
  
  // 2. Load last 7 days of data
  const { data: logs } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', sevenDaysAgo)
    .order('date', { ascending: false });
  
  // 3. Format for LLM
  const dataContext = formatLogsForAnalysis(logs);
  
  // 4. Call Gemini Flash (fast + cheap)
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}` },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: [
        { role: 'system', content: INSIGHT_SYSTEM_PROMPT },
        { role: 'user', content: dataContext }
      ]
    })
  });
  
  // 5. Extract insight
  const result = await response.json();
  const insight = result.choices[0].message.content;
  
  return json({ insight, generated_at: new Date().toISOString() });
});
```

**Data Context Format:**

```typescript
function formatLogsForAnalysis(logs: DailyLog[]): string {
  return `
## USER DATEN (letzte 7 Tage)

| Datum | Kalorien | Protein | Wasser | Schlaf | Schritte | Training |
|-------|----------|---------|--------|--------|----------|----------|
${logs.map(log => `| ${log.date} | ${log.total_calories}/${log.calorie_goal} | ${log.total_protein}g | ${log.hydration_ml}ml | ${log.sleep_hours}h | ${log.steps} | ${log.workout_logged ? 'Ja' : 'Nein'} |`).join('\n')}

## AUFGABE
Finde eine nicht-offensichtliche Korrelation zwischen diesen Metriken.
`;
}
```

---

### Integration in ActionCardStack

Aenderungen in `src/hooks/useActionCards.ts`:

```typescript
// VORHER (Zeile 150-165):
result.push({
  id: 'insight',
  type: 'insight',
  title: 'ARES Erkenntnis',
  subtitle: insightData.subtitle,
  ...
});

// NACHHER:
result.push({
  id: 'insight',
  type: 'epiphany', // Neuer Typ!
  title: 'ARES hat etwas entdeckt',
  subtitle: 'Tippe um die Erkenntnis aufzudecken',
  gradient: 'from-indigo-900 via-violet-800 to-purple-900',
  icon: Sparkles, // Statt BrainCircuit
  priority: 10,
  xp: 25,
  canSwipeComplete: false
});
```

Aenderungen in `src/components/home/ActionCardStack.tsx`:

```typescript
// Neuer Case im Switch
case 'epiphany':
  // Rendered separately as EpiphanyCard
  // Handled by SmartFocusCard with special rendering
  return;
```

Aenderungen in `src/components/home/SmartFocusCard.tsx`:

```typescript
// Wenn type === 'epiphany', render EpiphanyCard statt Standard-Card
if (task.type === 'epiphany') {
  return (
    <EpiphanyCard 
      onOpenChat={onOpenChat}
      onDismiss={onDismiss}
    />
  );
}
```

---

## Dateien-Uebersicht

| Datei | Aenderung |
|-------|-----------|
| `src/hooks/useActionCards.ts` | 1. Sunrise Import, 2. Neuer 'epiphany' Typ |
| `src/components/home/SmartFocusCard.tsx` | 1. Sunrise Import, 2. EpiphanyCard Integration |
| `src/components/home/EpiphanyCard.tsx` | **NEU** - 3-Phase Reveal Komponente |
| `supabase/functions/ares-insight-generator/index.ts` | **NEU** - AI Insight Generator |
| `supabase/config.toml` | Neue Function registrieren |

---

## Psychologischer Hebel

Das neue System nutzt mehrere psychologische Prinzipien:

1. **Curiosity Gap**: "ARES hat etwas entdeckt" weckt Neugier
2. **Effort Justification**: User muss klicken -> hoeherer wahrgenommener Wert
3. **Variable Reward**: Jeder Insight ist anders -> Dopamin
4. **Personalization**: Echte Korrelationen aus eigenen Daten
5. **Social Proof via Authority**: "ARES hat analysiert" (AI als Experte)

---

## Erwartetes Ergebnis

**Vorher:** "Pattern: 1963 kcal unter Tagesziel" (langweilig, reine Mathe)

**Nachher:** "Dein Schlaf verbessert sich um 18% an Tagen, an denen du vor 20 Uhr zu Abend isst." (echte Korrelation, ueberraschend, actionable)
