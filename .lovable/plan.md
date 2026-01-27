
# Fix: Dashboard bleibt im Skeleton-Loading hängen

## Das Problem

Nach den letzten Änderungen bleibt das Dashboard (AresHome) in einem endlosen Loading-State (leere Skeleton-Boxen) hängen, wenn der User nicht eingeloggt ist.

**Screenshot zeigt:** Leere graue Boxen ohne Inhalt, keine Navigation zur Login-Seite.

## Root Cause

Die Loading-Logik in `AresHome.tsx` (Zeile 220) hat einen logischen Fehler:

```typescript
const hasProfileCache = !!profileData;
const isInitialLoading = authLoading || (!hasProfileCache && !user);
```

**Problem-Ablauf bei nicht-eingeloggtem User:**
1. `authLoading = false` (Auth ist fertig)
2. `hasProfileCache = false` (kein Cache ohne User)
3. `!user = true` (kein User eingeloggt)
4. `isInitialLoading = false || (true && true) = true`
5. Skeleton wird ewig angezeigt
6. Der Redirect zu `/auth` (Zeile 233-235) wird nie erreicht

## Die Lösung

Die Loading-Logik muss so geändert werden, dass sie zwischen diesen Fällen unterscheidet:

| Zustand | Erwartetes Verhalten |
|---------|---------------------|
| Auth lädt noch | Skeleton anzeigen |
| Auth fertig, kein User | Redirect zu `/auth` |
| Auth fertig, User da, Profil lädt ohne Cache | Skeleton anzeigen |
| Auth fertig, User da, Profil gecached/geladen | Dashboard anzeigen |

## Änderungen

### Datei: `src/pages/AresHome.tsx`

**Zeilen 218-235 ersetzen:**

Aktuelle (fehlerhafte) Logik:
```typescript
// Smart Loading: Only show skeleton if auth loading OR (profile loading AND no cache)
const hasProfileCache = !!profileData;
const isInitialLoading = authLoading || (!hasProfileCache && !user);

if (isInitialLoading) {
  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <Skeleton ... />
    </div>
  );
}

if (!user) {
  return <Navigate to="/auth" replace />;
}
```

Korrigierte Logik:
```typescript
// 1. Auth noch nicht fertig -> Skeleton
if (authLoading) {
  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <Skeleton className="h-[3px] w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-40 w-full rounded-3xl" />
      <Skeleton className="h-60 w-full rounded-2xl" />
    </div>
  );
}

// 2. Auth fertig, kein User -> Redirect zu Login
if (!user) {
  return <Navigate to="/auth" replace />;
}

// 3. User da, aber Profil lädt noch und kein Cache -> Skeleton
const hasProfileCache = !!profileData;
if (!hasProfileCache) {
  // Kurzes Skeleton während Profil aus DB geladen wird
  // (Normalerweise <100ms dank localStorage-Cache)
  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <Skeleton className="h-[3px] w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-40 w-full rounded-3xl" />
      <Skeleton className="h-60 w-full rounded-2xl" />
    </div>
  );
}

// 4. Ab hier: User authentifiziert UND profileData vorhanden
```

## Logik-Erklärung

Die neue Reihenfolge ist entscheidend:

```text
┌─────────────────────────────┐
│    authLoading = true?      │
│            │                │
│    Ja ─────┴───── Nein      │
│    │               │        │
│ Skeleton       user = null? │
│                    │        │
│            Ja ─────┴─── Nein│
│            │            │   │
│      Redirect       profileData?
│      /auth              │   │
│                  Nein ──┴── Ja
│                   │         │
│               Skeleton   Dashboard
└─────────────────────────────┘
```

## Ergebnis nach Fix

| Szenario | Vorher | Nachher |
|----------|--------|---------|
| User nicht eingeloggt | Ewiges Skeleton | Sofort Redirect zu `/auth` |
| User eingeloggt, Cache vorhanden | Dashboard sofort | Dashboard sofort |
| User eingeloggt, kein Cache | Kurzes Skeleton | Kurzes Skeleton |
| Auth noch am laden | Skeleton | Skeleton |

## Zusätzliche Empfehlung

Optional können wir auch einen Timeout hinzufügen, falls das Profil-Loading zu lange dauert (z.B. 3 Sekunden), um nie ewig im Skeleton zu bleiben:

```typescript
// Optional: Timeout nach 3s -> Dashboard trotzdem rendern mit Fallbacks
const [forceRender, setForceRender] = useState(false);
useEffect(() => {
  const timeout = setTimeout(() => setForceRender(true), 3000);
  return () => clearTimeout(timeout);
}, []);

if (!hasProfileCache && !forceRender) {
  return <Skeleton ... />;
}
```

## Zusammenfassung

Eine einzige Datei wird geändert:

| Datei | Änderung |
|-------|----------|
| `src/pages/AresHome.tsx` | Loading-Logik Reihenfolge korrigieren |

Der Fix ist minimal aber kritisch: Die Reihenfolge der Checks wird geändert, sodass der `!user` Redirect **vor** dem Profil-Cache-Check kommt.
