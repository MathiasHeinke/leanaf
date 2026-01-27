

# Fix: Bio-Age zeigt 0 statt echtem Alter

## Problem

Der `useAresBioAge` Hook findet kein User-Profil, weil er die falsche Spalte abfragt:

```typescript
// FALSCH (aktuell in Zeile 370):
.eq('id', user.id)

// RICHTIG (wie in useUserProfile):
.eq('user_id', user.id)
```

Da `user.id` die Auth-User-ID ist, aber die `profiles`-Tabelle diese im `user_id`-Feld speichert (nicht `id`), wird nie ein Profil gefunden. Dadurch:
- `chronoAge: 0` (Default)
- `proxyBioAge: 0` (Default)
- Alle Domain-Scores: 50 (Default)

---

## Lösung

### Datei: `src/hooks/useAresBioAge.ts`

**Zeile 370 ändern:**

```typescript
// VORHER:
.eq('id', user.id)

// NACHHER:
.eq('user_id', user.id)
```

### Zusätzliche Verbesserungen

1. **Fallback für fehlendes `age`-Feld:**
   Wenn `profile.age` null ist, sollte ein sinnvoller Default (z.B. 30) verwendet werden, anstatt die Berechnung komplett zu blockieren.

2. **Bessere Empty-State Behandlung:**
   Wenn kein Profil gefunden wird, aber der User eingeloggt ist, sollte ein Hinweis erscheinen ("Profil vervollständigen").

---

## Betroffene Dateien

| Datei | Aktion | Beschreibung |
|-------|--------|--------------|
| `src/hooks/useAresBioAge.ts` | EDIT | Fix `.eq('id')` → `.eq('user_id')` auf Zeile 370 |

---

## Erwartetes Ergebnis

Nach dem Fix:
- **Chrono-Age zeigt echtes Alter** (z.B. 41 statt 0)
- **Bio-Age wird korrekt berechnet** (z.B. 38.2 statt 0.0)
- **Domain-Scores basieren auf echten Daten**
- Confidence bleibt "Niedrig" bis mehr Tracking-Daten vorhanden sind

