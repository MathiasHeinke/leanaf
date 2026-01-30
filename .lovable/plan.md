

# Fix: ARES Instant Check - Komplette Datenkorrektur & Lester-Integration

## Problem-Zusammenfassung

Der ARES Instant Check lädt aktuell **fehlerhafte Daten** wegen falscher DB-Schemas und **ignoriert die Persona-Einstellungen** komplett.

## Zu behebende Fehler

### 1. Datenbank-Schema-Korrekturen

| Problem | Lösung |
|---------|--------|
| `profiles.phase` existiert nicht | Entfernen oder aus `protocol_mode` ableiten |
| `peptide_protocols.compound/status/dose/frequency` falsch | Korrekt: `name, peptides (JSONB), goal, is_active, phase` |
| `user_bloodwork.marker_name/value/unit` falsch | Korrekt: Flache Spalten (vitamin_d, ferritin, magnesium, zinc, etc.) |
| `ares_user_insights` existiert nicht | Korrekt: `user_insights` mit Spalten `category, insight, importance, confidence` |
| `daily_goals.calories/protein/carbs/fats` | Prüfen ob Tabelle existiert, sonst aus `profiles.daily_calorie_target` etc. nehmen |

### 2. Fehlende Datenquellen

| Datenquelle | Wert für Prompt |
|-------------|-----------------|
| `coach_memory.memory_data` | `preferred_name: "Matze"`, Mood History, Topics, User Notes |
| `coach_personas` (basierend auf `profiles.coach_personality`) | Lester's `language_style`, `dial_*` Werte |

### 3. Lester-Persona-Integration

Die Persona muss aus `coach_personas` geladen werden basierend auf dem User's `profiles.coach_personality` Wert.

**Lester-spezifischer Stil-Block für den Prompt:**
```text
PERSONA: LESTER - Der Wissenschafts-Nerd
- Erkläre wie ein Biochemie-Professor mit Humor
- Nutze Fachbegriffe (IGF-1, mTor, etc.) und erkläre sie kurz
- Tiefe: Maximum | Humor: Maximum | Meinung: Stark
- Sei nerdig aber charmant
```

## Korrigierte Datenladung

```typescript
const [
  profileResult,
  stackResult,
  peptidesResult,
  bloodworkResult,
  insightsResult,
  coachMemoryResult,
  personaResult,
] = await Promise.all([
  // 1. User Profile (KORRIGIERT: ohne 'phase')
  svcClient
    .from('profiles')
    .select('goal, weight, age, gender, protocol_mode, preferred_name, display_name, coach_personality, daily_calorie_target, protein_target_g')
    .eq('user_id', userId)
    .maybeSingle(),

  // 2. Current Supplement Stack (unverändert - korrekt)
  svcClient
    .from('user_supplements')
    .select('name, dosage, unit, preferred_timing')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(20),

  // 3. Peptide Protocols (KORRIGIERT: richtige Spalten)
  svcClient
    .from('peptide_protocols')
    .select('name, peptides, goal, is_active, phase')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(5),

  // 4. Bloodwork (KORRIGIERT: flache Marker-Spalten)
  svcClient
    .from('user_bloodwork')
    .select('test_date, vitamin_d, vitamin_b12, ferritin, magnesium, zinc, iron, total_testosterone')
    .eq('user_id', userId)
    .order('test_date', { ascending: false })
    .limit(1),

  // 5. User Insights (KORRIGIERT: richtige Tabelle)
  svcClient
    .from('user_insights')
    .select('category, insight, importance')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('importance', { ascending: false })
    .limit(10),

  // 6. Coach Memory (NEU: für preferred_name, mood, topics)
  svcClient
    .from('coach_memory')
    .select('memory_data')
    .eq('user_id', userId)
    .maybeSingle(),

  // 7. Persona (NEU: basierend auf coach_personality)
  // Wird nach Profile-Load dynamisch abgefragt
]);

// Persona laden basierend auf coach_personality
const personaName = profile.coach_personality === 'soft' ? 'LESTER' : 'ARES';
const personaResult = await svcClient
  .from('coach_personas')
  .select('name, language_style, dial_depth, dial_humor, dial_opinion, dialect')
  .eq('name', personaName)
  .maybeSingle();
```

## Korrigierter Prompt

```typescript
// Persona-Style-Block dynamisch bauen
const persona = personaResult.data;
const personaStyleBlock = persona ? `
PERSONA: ${persona.name}
Stil: ${persona.language_style}
Tiefe: ${persona.dial_depth}/10 | Humor: ${persona.dial_humor}/10 | Meinung: ${persona.dial_opinion}/10
${persona.dialect ? `Dialekt-Hinweis: ${persona.dialect}` : ''}
` : '';

const systemPrompt = `Du bist ${persona?.name || 'ARES'}, der Elite-Supplement-Auditor.
${personaStyleBlock}

ANTWORT-REGELN:
- Maximal 4 kurze Absätze, maximal 150 Wörter
- Nutze Emojis für Struktur (✅ ⏰ 💊 ⚠️ 💡)
- Keine Floskeln, keine Einleitungen
- Bei Lester: Nutze Fachbegriffe und erkläre kurz
`;
```

## Korrigierte Bloodwork-Formatierung

```typescript
// VORHER (falsch): Erwartet JSON-Marker
const bloodworkSection = bloodwork.filter(b => b.marker_name...)

// NACHHER (korrekt): Flache Spalten transformieren
const latestBloodwork = bloodworkResult.data?.[0];
const bloodworkSection = latestBloodwork ? [
  latestBloodwork.vitamin_d ? `- Vitamin D: ${latestBloodwork.vitamin_d} ng/ml` : null,
  latestBloodwork.magnesium ? `- Magnesium: ${latestBloodwork.magnesium} mg/dl` : null,
  latestBloodwork.zinc ? `- Zink: ${latestBloodwork.zinc} µg/dl` : null,
  latestBloodwork.ferritin ? `- Ferritin: ${latestBloodwork.ferritin} ng/ml` : null,
  latestBloodwork.vitamin_b12 ? `- B12: ${latestBloodwork.vitamin_b12} pg/ml` : null,
].filter(Boolean).join('\n') || 'Keine relevanten Marker' : 'Keine Blutwerte vorhanden';
```

## Korrigierte Peptide-Formatierung

```typescript
// VORHER (falsch): Erwartet compound/status Spalten
const peptideSection = peptides.map(p => `${p.compound} (${p.status})`)

// NACHHER (korrekt): peptides ist JSONB Array
const peptideSection = peptides.length > 0
  ? peptides.flatMap(p => {
      const peptideList = Array.isArray(p.peptides) ? p.peptides : [];
      return peptideList.map(pep => 
        `- ${pep.name || pep}: ${p.goal || 'aktiv'}`
      );
    }).join('\n') || 'Keine'
  : 'Keine';
```

## Korrigierte Insights-Formatierung

```typescript
// VORHER (falsch): ares_user_insights.insight_type/content
// NACHHER (korrekt): user_insights.category/insight
const insightSection = insights.length > 0
  ? insights
      .filter(i => ['gewohnheiten', 'substanzen', 'gesundheit', 'koerper'].includes(i.category))
      .slice(0, 5)
      .map(i => `- ${i.insight}`)
      .join('\n')
  : 'Keine bekannten Präferenzen';
```

## Erwartetes Ergebnis: Korrigierter Prompt für Ecdysteron

```text
PERSONA: LESTER - Der Wissenschafts-Nerd
Stil: Extrem hohes Tiefes Fachwissen zu Training, Steroiden, Peptiden...
Tiefe: 10/10 | Humor: 10/10 | Meinung: 9/10

## USER KONTEXT
- Protokoll: enhanced
- Ziel: lose (2044 kcal/Tag)
- Alter: 41 | Gewicht: 100.80kg | Geschlecht: male

## AKTUELLER STACK
- Magnesium Komplex 11 Ultra (200mg, Abends)
- Zink (15mg, Abends)
- HMB 3000 (1500mg, Vor Training)
- Creatin (5g, Nach Training)
- Omega-3 (EPA/DHA) (3g, Mittags)
... (weitere 9 Supplements)

## AKTIVE PEPTIDE
Keine aktiven Protokolle

## RELEVANTE BLUTWERTE
Keine Blutwerte vorhanden

## BEKANNTE PRÄFERENZEN
- Trainiert morgens nüchtern
- Nimmt Zink 15mg abends
- Bevorzugt Reis, um Insulinspitzen zu vermeiden
- Verwendet eine Withings Body Comp Waage
- Verwendet ein Amazfit Armband zur Fitnessüberwachung

## ZU PRÜFENDES SUPPLEMENT
- Name: Ecdysteron
- Marke: unbekannt
- Dosis: 1 Kapseln
- Timing: Vor Training

## AUFGABE
Bewerte dieses Supplement für Matze:
1. Passt es zu den Zielen?
2. Ist das Timing optimal?
3. Ist die Dosis angemessen?
4. Gibt es Interaktionen mit dem Stack/Peptiden?
5. Qualität der Marke (falls bekannt)?
```

## Dateien die geändert werden

| Datei | Änderung |
|-------|----------|
| `supabase/functions/ares-instant-check/index.ts` | Komplette Überarbeitung der Datenladung, Schema-Fixes, Persona-Integration |

## Performance-Auswirkung

- Eine zusätzliche DB-Abfrage für `coach_personas` (nach Profile geladen)
- Insgesamt weiterhin schnell durch parallele Abfragen
- Erwartet: ~250-350ms Datenladung statt ~180ms

