

# Fix: Makro-Ziele werden nach Profil-Speicherung nicht aktualisiert

## Problem-Analyse

### Was passiert:
1. Du änderst die Makrostrategie auf WARRIOR im Profil
2. Die DB wird korrekt aktualisiert: `protein: 202, carbs: 120, fats: 77` ✅
3. Das Widget zeigt aber noch `248g` statt `202g` ❌

### Root Cause:
Das Problem liegt im **React Query Caching-Verhalten**:

```text
┌────────────────────────────────────────────────────────────────┐
│                        PROFILE SAVE                            │
│  1. DB Update: daily_goals.protein = 202                   ✅  │
│  2. invalidateQueries(['daily-metrics'])                   ✅  │
│  3. User navigiert zurück → Kein aktiver Observer!         ⚠️  │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│                    HOMESCREEN (Remount)                        │
│  useDailyMetrics() prüft: "Ist Cache stale?"                   │
│  → staleTime: 5 min → Cache gilt noch als "frisch"         ⚠️  │
│  → Zeigt gecachte Werte: protein = 248                     ❌  │
└────────────────────────────────────────────────────────────────┘
```

**Das Kernproblem:**
- `invalidateQueries()` markiert den Cache als "invalid"
- Aber der Refetch passiert nur wenn ein **aktiver Observer** existiert
- Beim Navigieren zum Homescreen wird der "invalidierte aber noch nicht refetchte" Cache verwendet

---

## Lösungsplan

### Schritt 1: Profile.tsx - Aktiver Refetch statt nur Invalidation

**Datei:** `src/pages/Profile.tsx`  
**Zeilen:** 649-651

Ersetze:
```typescript
// ALT: Nur Invalidierung (refetcht nicht sofort)
queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DAILY_METRICS });
queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_PROFILE });
```

Mit:
```typescript
// NEU: Aktiver Refetch, damit der Cache sofort aktualisiert wird
await queryClient.refetchQueries({ queryKey: QUERY_KEYS.DAILY_METRICS });
await queryClient.refetchQueries({ queryKey: QUERY_KEYS.USER_PROFILE });
// Auch den Strategy-Query refreshen (für NutritionWidget Badge)
queryClient.invalidateQueries({ queryKey: ['user-profile-strategy'] });
```

### Schritt 2: useDailyMetrics - Bessere Cache-Strategie

**Datei:** `src/hooks/useDailyMetrics.ts`  
**Zeilen:** 173-175

Füge `refetchOnMount: 'always'` hinzu für kritische Queries:
```typescript
staleTime: 1000 * 60 * 5,  // 5 min fresh
gcTime: 1000 * 60 * 30,    // 30 min cache
refetchOnMount: 'always',  // NEU: Immer refetchen wenn gemountet
retry: 1
```

### Schritt 3: NutritionWidget - Strategy Query Key registrieren

**Datei:** `src/constants/queryKeys.ts`

Füge den neuen Key hinzu:
```typescript
export const QUERY_KEYS = {
  USER_PROFILE: ['user-profile'] as const,
  USER_PROFILE_STRATEGY: ['user-profile-strategy'] as const, // NEU
  DAILY_METRICS: ['daily-metrics'] as const,
  // ... rest
} as const;

// Im CATEGORY_QUERY_MAP:
export const CATEGORY_QUERY_MAP: Record<string, readonly (readonly string[])[]> = {
  profile: [QUERY_KEYS.USER_PROFILE, QUERY_KEYS.USER_PROFILE_STRATEGY, QUERY_KEYS.DAILY_METRICS], // NEU
  // ... rest
};
```

---

## Technische Details

### Warum `refetchQueries` statt `invalidateQueries`?

| Methode | Verhalten | Wann refetcht? |
|---------|-----------|----------------|
| `invalidateQueries` | Markiert Cache als stale | Nur wenn aktiver Observer |
| `refetchQueries` | Holt sofort neue Daten | Sofort |

Da der User noch auf der Profil-Seite ist wenn gespeichert wird, gibt es keinen aktiven Observer für `['daily-metrics']`. Mit `refetchQueries` erzwingen wir den Fetch.

### Dateien die geändert werden:

| Datei | Änderung |
|-------|----------|
| `src/pages/Profile.tsx` | `refetchQueries` statt `invalidateQueries` |
| `src/hooks/useDailyMetrics.ts` | `refetchOnMount: 'always'` hinzufügen |
| `src/constants/queryKeys.ts` | `USER_PROFILE_STRATEGY` Key + profile category |

---

## Erwartetes Ergebnis

### Vorher:
- Profil speichern mit WARRIOR (202g Protein)
- Zurück zum Homescreen
- Widget zeigt noch 248g (alter Cache)
- Pull-to-Refresh nötig um zu aktualisieren

### Nachher:
- Profil speichern mit WARRIOR (202g Protein)
- `refetchQueries` holt sofort neue Daten in den Cache
- Zurück zum Homescreen
- Widget zeigt sofort 202g (frischer Cache)

