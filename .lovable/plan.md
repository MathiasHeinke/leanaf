
# Instant Profile Cache - IMPLEMENTED ✅

## Das Problem

Beim Laden des Dashboards (AresHome) sieht der User eine stoerende Flicker-Sequenz:

```text
1. Skeleton Loader (authLoading)
2. "Warrior" + "Profil vervollstaendigen" Card (profileData = null)
3. Finales Dashboard mit korrektem Namen + Cards (profileData geladen)
```

Beim Navigieren (z.B. `/journal` -> `/`) wiederholt sich der gesamte Fetch-Prozess.

## Root Cause Analyse

| Hook | Caching | Initial State | Problem |
|------|---------|---------------|---------|
| `useUserProfile` | useState + useEffect | `null` | Kein Cache, zeigt "Warrior" |
| `useDailyMetrics` | React Query | Query-Cache | Korrekt gecached |
| `useWidgetConfig` | localStorage + useState | Sofort aus localStorage | Korrekt gecached |

Der kritische Unterschied:

```typescript
// useUserProfile (AKTUELL - schlecht)
const [profileData, setProfileData] = useState<ProfilesData | null>(null);
// -> null beim Start, "Warrior" wird angezeigt

// useWidgetConfig (VORBILD - gut)
const [widgets, setWidgets] = useState<WidgetConfig[]>(() => {
  const local = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (local) return JSON.parse(local);
  return DEFAULT_WIDGETS;
});
// -> Daten sofort aus localStorage, kein Flicker
```

---

## Die Loesung: Hybrid-Ansatz

Kombination aus:
1. **localStorage** fuer sofortigen Zugriff (0ms)
2. **React Query** fuer Cross-Route-Persistenz + Background-Updates

### Architektur

```text
App Start
    |
    v
[1] localStorage.getItem('ares_user_profile')
    |
    +-- Hat Cache? --> placeholderData --> UI zeigt "Mathias" sofort
    |
    v
[2] React Query startet Background-Fetch
    |
    v
[3] Supabase-Antwort --> Cache aktualisiert --> localStorage sync
    |
    v
[4] Realtime-Updates --> queryClient.setQueryData + localStorage
```

---

## Datei-Aenderungen

### 1. src/constants/queryKeys.ts

Neue Query-Key fuer User-Profile:

```typescript
export const QUERY_KEYS = {
  USER_PROFILE: ['user-profile'] as const,  // NEU
  DAILY_METRICS: ['daily-metrics'] as const,
  SUPPLEMENTS_TODAY: ['supplements-today-widget'] as const,
  // ... rest
} as const;
```

---

### 2. src/hooks/useUserProfile.tsx (Komplette Refaktorierung)

#### Neue Imports

```typescript
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
```

#### localStorage Helper

```typescript
const LOCAL_STORAGE_KEY = 'ares_user_profile';

const getStoredProfile = (): ProfilesData | null => {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.user_id) return parsed;
    }
  } catch { /* ignore corrupt data */ }
  return null;
};

const storeProfile = (data: ProfilesData) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch { /* quota exceeded etc */ }
};

const clearStoredProfile = () => {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch { /* ignore */ }
};
```

#### useQuery Konfiguration

```typescript
const queryClient = useQueryClient();

const { data: profileData, isLoading, error, refetch } = useQuery({
  queryKey: QUERY_KEYS.USER_PROFILE,
  queryFn: async () => {
    // Bestehende Fetch-Logik (Supabase direct + ARES fallback)
    const data = await fetchProfileFromSupabase();
    if (data) {
      storeProfile(data); // Sync to localStorage on success
    }
    return data;
  },
  enabled: !!user?.id && !!session?.access_token && isSessionReady,
  staleTime: 1000 * 60 * 10,  // 10 Minuten "frisch"
  gcTime: 1000 * 60 * 60,     // 60 Minuten im Speicher
  placeholderData: () => {
    // KRITISCH: localStorage-Daten sofort anzeigen
    const stored = getStoredProfile();
    // Nur verwenden wenn User-ID uebereinstimmt (Session-Wechsel-Schutz)
    if (stored && stored.user_id === user?.id) {
      return stored;
    }
    return undefined;
  },
  retry: 2,
});
```

#### Realtime-Subscription Update

```typescript
useEffect(() => {
  if (!user?.id) return;
  
  const channel = supabase
    .channel('profiles-self')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'profiles', filter: `user_id=eq.${user.id}` },
      (payload) => {
        if (payload.new && typeof payload.new === 'object') {
          const newData = payload.new as ProfilesData;
          // React Query Cache + localStorage gleichzeitig aktualisieren
          queryClient.setQueryData(QUERY_KEYS.USER_PROFILE, newData);
          storeProfile(newData);
        }
      }
    )
    .subscribe();
    
  return () => supabase.removeChannel(channel);
}, [user?.id, queryClient]);
```

#### Logout-Handling

```typescript
useEffect(() => {
  if (!user?.id) {
    // Bei Logout: Cache + localStorage leeren
    queryClient.removeQueries({ queryKey: QUERY_KEYS.USER_PROFILE });
    clearStoredProfile();
  }
}, [user?.id, queryClient]);
```

#### Return-Interface (unveraendert)

```typescript
return {
  profileData: profileData ?? null,
  profile: convertToUserProfile(profileData ?? null),
  isLoading,
  error: error?.message ?? null,
  isFirstAppStart,
  hasMissingRequiredFields: missingRequired(profileData),
  isProfileStale: isStale(profileData?.updated_at),
  needsCheckUp: false,
  refreshProfile: () => refetch(),
};
```

---

### 3. src/hooks/useAresGreeting.ts (Smart Loading)

```typescript
export function useAresGreeting(): UseAresGreetingReturn {
  const { profileData, isLoading: profileLoading } = useUserProfile();
  
  // NEU: Wenn profileData existiert (auch aus placeholderData), 
  // sind wir nicht mehr "loading"
  const isActuallyLoading = profileLoading && !profileData;
  
  const result = useMemo(() => {
    // ... bestehende Logik
    
    const userName = profileData?.preferred_name || 
                    profileData?.display_name || 
                    'Warrior';
    
    return {
      greeting,
      userName,
      dayOfWeek,
      dateFormatted,
      streak,
      loading: isActuallyLoading, // NEU: Smart loading
    };
  }, [profileData, streaks, isActuallyLoading]);

  return result;
}
```

---

### 4. src/hooks/useActionCards.ts (Guard fuer leere Cards)

```typescript
export const useActionCards = () => {
  const { profileData, isLoading: profileLoading } = useUserProfile();
  
  // NEU: Waehrend Initial-Load OHNE Cache -> keine Cards anzeigen
  const isInitialLoading = profileLoading && !profileData;
  
  const cards = useMemo(() => {
    // Guard: Keine "Profil vervollstaendigen" Card waehrend Initial-Load
    if (isInitialLoading) {
      // Nur Epiphany Card zeigen (immer vorhanden)
      return [{
        id: 'epiphany',
        type: 'epiphany',
        title: 'ARES hat etwas entdeckt',
        subtitle: 'Tippe um die Erkenntnis aufzudecken',
        gradient: 'from-indigo-900 via-violet-800 to-purple-900',
        icon: Sparkles,
        priority: 10,
        xp: 25,
        canSwipeComplete: false
      }];
    }
    
    // Bestehende Card-Logik...
    const result: ActionCard[] = [];
    
    // Profile-Check mit voller Validierung
    const profileComplete = profileData?.height && profileData?.weight && profileData?.age;
    if (!profileComplete && profileData) { // Nur wenn Profil geladen
      result.push({ /* Profile Card */ });
    }
    
    // ... rest
  }, [isInitialLoading, profileData, /* ... rest deps */]);
  
  return { cards, isLoading: isInitialLoading };
};
```

---

### 5. src/pages/AresHome.tsx (Optional: Smart Loading Gate)

Das Skeleton nur zeigen wenn wirklich kein Cache vorhanden ist:

```typescript
export default function AresHome() {
  const { user, loading: authLoading } = useAuth();
  const { profileData, isLoading: profileLoading } = useUserProfile();
  
  // Smart Loading: Nur Skeleton wenn Auth laedt ODER (Profile laedt UND kein Cache)
  const hasProfileCache = !!profileData;
  const isInitialLoading = authLoading || (profileLoading && !hasProfileCache);
  
  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-background p-6 space-y-6">
        <Skeleton className="h-[3px] w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full rounded-3xl" />
        <Skeleton className="h-60 w-full rounded-2xl" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  // Ab hier ist profileData garantiert vorhanden (aus Cache oder Fetch)
  // ...
}
```

---

## Ergebnis nach Implementierung

### Vorher (aktuell)

```text
App Start -> Auth Check -> [Skeleton]
         -> Auth Ready -> Profile Fetch -> ["Warrior" + "Profil vervollstaendigen"]
         -> Profile Ready -> ["Mathias" + korrekte Cards]
         
Navigation /journal -> / -> [Skeleton] -> ["Warrior"] -> ["Mathias"]
```

### Nachher

```text
App Start -> localStorage gelesen -> ["Mathias" + korrekte Cards sofort]
         -> Background Fetch -> [Bleibt "Mathias", ggf. stille Aktualisierung]
         
Navigation /journal -> / -> ["Mathias" + korrekte Cards sofort] (aus React Query Cache)
```

---

## Edge Cases & Sicherheit

| Szenario | Handling |
|----------|----------|
| **localStorage korrupt** | try-catch, Query fetcht frisch |
| **User-Wechsel** | `stored.user_id === user?.id` Validierung |
| **Erster App-Start** | Kein Cache -> normales Loading, aber nur 1x |
| **Logout** | `clearStoredProfile()` + Query-Cache geleert |
| **Realtime-Update** | `setQueryData` + `storeProfile` synchron |

---

## Zusammenfassung der Aenderungen

| Datei | Aenderung |
|-------|----------|
| `src/constants/queryKeys.ts` | `USER_PROFILE` Key hinzufuegen |
| `src/hooks/useUserProfile.tsx` | Komplette Refaktorierung zu React Query + localStorage |
| `src/hooks/useAresGreeting.ts` | Smart loading: `isActuallyLoading = profileLoading && !profileData` |
| `src/hooks/useActionCards.ts` | Guard fuer Initial-Load ohne Cache |
| `src/pages/AresHome.tsx` | Smart Loading Gate (optional) |

---

## Technische Details fuer Gemini-Debugging

### placeholderData vs initialData

Geminis Empfehlung `placeholderData` ist korrekt:
- `initialData`: Wird als "frisch" behandelt, kein Background-Fetch
- `placeholderData`: Wird als "stale" behandelt, startet Background-Fetch -> unsere Wahl

### Query-Lifecycle

```text
1. Component mounted
2. placeholderData() aufgerufen -> localStorage gelesen
3. UI rendert mit Placeholder (kein Loading-State)
4. queryFn() startet im Hintergrund
5. Wenn Fetch fertig: isPlaceholderData = false
6. localStorage wird mit frischen Daten aktualisiert
```

### Cache-Invalidierung

```typescript
// Bei Logout
queryClient.removeQueries({ queryKey: QUERY_KEYS.USER_PROFILE });

// Bei manuellem Refresh
refetch();

// Bei Realtime-Update
queryClient.setQueryData(QUERY_KEYS.USER_PROFILE, newData);
```
