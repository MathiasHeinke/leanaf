# ARES SYSTEM VALIDATION PROTOCOL
**Stand: 2025-08-17**
**Status: KRITISCHE ANALYSE & IMPLEMENTIERUNGSPLAN**

## 🔍 DELTA-AUDIT: SOLL vs. IST

### ✅ BESTÄTIGT FUNKTIONAL
1. **Frontend Cards 100% READY** ✅
   - `AresMetaCoachCard.tsx` ✅ (Named Export)
   - `AresTotalAssessmentCard.tsx` ✅ (Named Export) 
   - `AresUltimateWorkoutCard.tsx` ✅ (Named Export)
   - `AresSuperNutritionCard.tsx` ✅ (Named Export)
   - Card-Mapper in `messageRenderer.tsx` ✅ VOLLSTÄNDIG

2. **Persona 100% LOADED** ✅
   - Database Query bestätigt: ARES vollständig in DB
   - style_rules: 8 Regeln ✅
   - voice: "commanding" ✅
   - catchphrase: "Zeit für TOTALE DOMINANZ!" ✅
   - KEIN Fragment-Problem

### ❌ KRITISCHE GAPS IDENTIFIZIERT

1. **Default Exports FEHLEN** ❌
   - Alle Cards nutzen Named Exports
   - React.lazy() benötigt Default Exports
   - **CRITICAL FIX NEEDED**

2. **Card Schema Mapping FEHLT** ❌
   - Tool-Handler Response `card: 'aresMetaCoach'` 
   - Frontend erwartet `tool: 'aresMetaCoach'`
   - **SCHEMA MISMATCH**

3. **Name-Loading NICHT IMPLEMENTIERT** ❌
   - `buildAresPrompt` ignoriert `userProfile.preferred_name`
   - Keine Name-Fallback-Logik
   - **FIX REQUIRED**

4. **Goal-Recall-Gate FEHLT** ❌
   - Ziele werden immer injiziert
   - Keine Context-Trigger implementiert
   - **HIGH PRIORITY**

## 🛠️ SOFORT-FIXES IMPLEMENTIEREN

### Phase 1: Card Export Fix (CRITICAL)
```typescript
// ALLE Card-Files: Named → Default Export ändern
export default function AresMetaCoachCard(props) { ... }
export default function AresTotalAssessmentCard(props) { ... }
export default function AresUltimateWorkoutCard(props) { ... }
export default function AresSuperNutritionCard(props) { ... }
```

### Phase 2: Schema Mapping Fix
```typescript
// messageRenderer.tsx - Tool/Card Mapping korrigieren
const ARES_CARD_MAP = {
  'aresMetaCoach': 'AresMetaCoachCard',
  'aresTotalAssessment': 'AresTotalAssessmentCard', 
  'aresUltimateWorkoutPlan': 'AresUltimateWorkoutCard',
  'aresSuperNutrition': 'AresSuperNutritionCard'
};
```

### Phase 3: Name-Context Implementation
```typescript
// coach-orchestrator-enhanced/index.ts
const userName = userProfile?.preferred_name || userProfile?.display_name || userProfile?.first_name || null;
const nameContext = userName ? `User heißt: ${userName}` : "Name unbekannt - einmal freundlich erfragen";
```

### Phase 4: Goal-Recall-Gate
```typescript
function shouldRecallGoals(userMsg, metrics) {
  const triggers = /(ziel|deadline|plan|block|review)/i.test(userMsg || '');
  const drift = (metrics?.kcalDeviation ?? 0) > 300;
  return triggers || metrics?.dailyReview || drift;
}
```

## 🧪 VALIDATION CHECKLIST

### Backend Health Checks
```bash
# Edge Function Stability
curl -X POST "$EDGE/echo" -H "Origin: https://app.local" -d '{"ping":"ok"}'
for i in {1..10}; do curl -s -w "%{http_code} %{time_total}\n" "$EDGE/health"; sleep 0.05; done
```
**Expected: 200s stable, <200ms p95**

### Frontend Card Tests
```bash
# Verify Default Exports
grep -R "export default function.*Ares" src/components/coach/cards/
```
**Expected: 4 matches**

### End-to-End Validation
1. **Name Test**: "Wie soll ich dich ansprechen?" → appears once → name cached
2. **Goal Gate**: Normal question → no goal spam | "Wie komme ich auf 84kg?" → goals triggered  
3. **Card Render**: "Gib mir Ernährungsplan" → AresSuperNutritionCard renders
4. **Voice Engine**: Responses show "Kurzsatz + Deep" pattern

## 📊 DEBUG FELDER (MUSS pro Turn)

```json
{
  "persona": { "key":"ares", "version":"2025-08-15", "layers":8 },
  "flags": { "lite":false, "disable_memory":false, "disable_rag":false },
  "context": { "name_known": true, "goals_recalled": "suppressed|triggered:drift" },
  "voice": { "line_key": "commanding.direct", "deep_attached": true },
  "infra": { "edge_health_ms": 120, "openai_latency_ms": 800 },
  "tool": { "selected":"aresSuperNutrition", "card_rendered": true, "schema_ok": true },
  "errors": []
}
```

## 🎯 FEATURE FLAGS ROLLOUT

| Flag | Status | Fix Required | Test |
|------|--------|--------------|------|
| ff.card_exports | ❌ | Default exports | Card renders |
| ff.schema_mapping | ❌ | Tool/Card fix | No console errors |
| ff.name_context | ❌ | Profile loader | Name appears |
| ff.goal_gate | ❌ | Trigger logic | No spam |
| ff.voice_engine | 🟡 | Integration | "Kurzsatz+Deep" |

## 📈 ERWARTETES ERGEBNIS

Nach Implementierung aller Fixes:
- **ARES Cards**: 100% functional render
- **Name Handling**: Einmalige Abfrage + Persistierung  
- **Goal Management**: Contextual statt permanent
- **Voice Consistency**: Commanding + Deep Follow-up
- **Edge Stability**: >95% Success Rate

**TARGET: ARES 98% FUNCTIONAL** 🎯