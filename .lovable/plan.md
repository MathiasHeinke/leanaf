

# Fix: MissingBloodworkBanner zeigt falschen Status

## Problem

Der Banner zeigt "Profil unvollständig" obwohl das Profil komplett ausgefüllt ist. Es fehlen nur die Blutwerte.

**Ursachen:**
1. **Query-Bug in `useUserRelevanceContext.ts`**: Zeile 35 verwendet `.eq('id', user.id)` aber die Profiles-Tabelle hat `id` ≠ `user_id`. Die Auth-UUID steht in `user_id`, nicht in `id`!
2. **Generische Meldung**: Der Banner unterscheidet nur zwischen "minimal" und "basic", sagt aber nicht was konkret fehlt

## Lösung

### Schritt 1: Query-Bug fixen

**Datei:** `src/hooks/useUserRelevanceContext.ts` (Zeile 35)

```typescript
// Vorher:
.eq('id', user.id)

// Nachher:
.eq('user_id', user.id)
```

### Schritt 2: Banner intelligenter machen

**Datei:** `src/components/supplements/MissingBloodworkBanner.tsx`

Statt generischer Meldungen zeigen wir an was **konkret** fehlt:

| Fehlende Daten | Meldung |
|----------------|---------|
| Nur Blutwerte | "Blutwerte fehlen" → Für volle Personalisierung |
| Profil + Blutwerte | "Profil unvollständig" → Alter, Ziele, Gewicht ergänzen |
| Nur bestimmte Felder | Spezifische Hinweise: "Alter fehlt", "Gewicht fehlt" |

**Erweiterte Props:**

```typescript
interface MissingBloodworkBannerProps {
  profileCompleteness: 'full' | 'basic' | 'minimal';
  activeTier: DynamicTier;
  missingProfileFields?: string[];  // NEU: Konkrete fehlende Felder
}
```

**Dynamische Anzeige:**

```typescript
// Wenn nur Blutwerte fehlen (Profil ist komplett)
if (profileCompleteness === 'basic' && (!missingProfileFields || missingProfileFields.length === 0)) {
  return (
    <Banner 
      icon={FlaskConical}
      title="Blutwerte fehlen"
      text="Für personalisierte Empfehlungen basierend auf deinen Biomarkern, lade dein Blutbild hoch."
      link="/bloodwork"
      linkText="Blutwerte hinzufügen"
    />
  );
}

// Wenn Profil-Felder fehlen
if (missingProfileFields && missingProfileFields.length > 0) {
  const fieldLabels = missingProfileFields.map(f => FIELD_LABELS[f]).join(', ');
  return (
    <Banner 
      icon={User}
      title="Profil unvollständig"
      text={`Ergänze ${fieldLabels} für bessere Empfehlungen.`}
      link="/profile"
      linkText="Profil vervollständigen"
    />
  );
}
```

### Schritt 3: Context erweitern

**Datei:** `src/hooks/useUserRelevanceContext.ts`

Neue Felder im Return:

```typescript
// Konkrete fehlende Profil-Felder
missingProfileFields: string[];

// Berechnung:
const missingProfileFields: string[] = [];
if (!profile?.age) missingProfileFields.push('age');
if (!profile?.gender) missingProfileFields.push('gender');
if (!profile?.weight) missingProfileFields.push('weight');
if (!profile?.goal_type && !dailyGoals?.goal_type) missingProfileFields.push('goal');
```

### Schritt 4: SupplementInventory anpassen

**Datei:** `src/components/supplements/SupplementInventory.tsx`

Die `missingProfileFields` an den Banner übergeben:

```typescript
<MissingBloodworkBanner 
  profileCompleteness={context.profileCompleteness}
  activeTier={activeTier}
  missingProfileFields={context.missingProfileFields}
/>
```

---

## Dateien-Übersicht

| Datei | Änderung |
|-------|----------|
| `src/hooks/useUserRelevanceContext.ts` | Query-Fix (`user_id` statt `id`) + `missingProfileFields` Array |
| `src/types/relevanceMatrix.ts` | `missingProfileFields?: string[]` zum Interface |
| `src/components/supplements/MissingBloodworkBanner.tsx` | Intelligentere Anzeige mit konkreten Hinweisen |
| `src/components/supplements/SupplementInventory.tsx` | Props durchreichen |

---

## Erwartetes Ergebnis

**Dein Profil (komplett, keine Blutwerte):**
- Meldung: "🔬 Blutwerte fehlen"
- Text: "Für personalisierte Empfehlungen basierend auf deinen Biomarkern, lade dein Blutbild hoch."
- Link: → /bloodwork

**User ohne Alter/Gewicht:**
- Meldung: "👤 Profil unvollständig"
- Text: "Ergänze Alter, Gewicht für bessere Empfehlungen."
- Link: → /profile

**User mit allem:**
- Kein Banner

