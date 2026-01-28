
# Supplement Layer Interoperability - Alle Empfehlungen

## Uebersicht

Dieses Update stellt sicher, dass alle 4 Supplement-Layer (0-3) korrekt verlinkt, interoperabel und funktional sind. Es behebt 4 identifizierte Probleme in einem konsistenten Refactoring.

---

## Aenderung 1: "Coming Soon" Badge entfernen

**Problem:** Die Supplements-Seite (Layer 3) ist bereits funktional, wird aber in der Navigation als "Soon" markiert.

**Datei:** `src/components/AppSidebar.tsx`

**Zeile 71 aendern:**
```typescript
// VORHER
{ title: "Supplements", url: "/supplements", icon: Pill, comingSoon: true },

// NACHHER
{ title: "Supplements", url: "/supplements", icon: Pill },
```

---

## Aenderung 2: Add-Wizard Modal integrieren

**Problem:** Der "Hinzufuegen" Button auf der SupplementsPage zeigt nur einen Toast "Add Wizard kommt in Phase 3".

**Loesung:** Das vorhandene `SupplementTrackingModal` wiederverwenden - es bietet bereits:
- Supplement-Datenbank-Suche
- Custom Supplement Eingabe
- Timing-Auswahl
- Dosierung + Einheit
- Goal + Notes

**Datei:** `src/pages/SupplementsPage.tsx`

**Aenderungen:**

1. Import hinzufuegen:
```typescript
import { SupplementTrackingModal } from '@/components/SupplementTrackingModal';
```

2. State fuer Modal hinzufuegen:
```typescript
const [isAddModalOpen, setIsAddModalOpen] = useState(false);
```

3. handleAdd aendern:
```typescript
const handleAdd = () => {
  setIsAddModalOpen(true);
};

const handleAddComplete = () => {
  setIsAddModalOpen(false);
  refetchTimeline();
  refetchInventory();
  // Dispatch unified event for all listeners
  window.dispatchEvent(new CustomEvent('supplement-stack-changed'));
};
```

4. Modal am Ende der Komponente einbinden:
```typescript
<SupplementTrackingModal 
  isOpen={isAddModalOpen} 
  onClose={handleAddComplete} 
/>
```

---

## Aenderung 3: Ad-hoc Supplement Search funktional machen

**Problem:** Die "Ungeplantes hinzufuegen" Suche im SupplementsLogger zeigt nur ein Input-Feld ohne Funktionalitaet.

**Datei:** `src/components/home/loggers/SupplementsLogger.tsx`

**Aenderungen:**

1. Imports erweitern:
```typescript
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Search, Plus, Loader2 } from 'lucide-react';
```

2. State und Logik hinzufuegen:
```typescript
const { user } = useAuth();
const [adHocResults, setAdHocResults] = useState<any[]>([]);
const [searchLoading, setSearchLoading] = useState(false);
const [loggingAdHoc, setLoggingAdHoc] = useState<string | null>(null);

// Debounced search function
useEffect(() => {
  if (!adHocSearch.trim()) {
    setAdHocResults([]);
    return;
  }
  
  const timer = setTimeout(async () => {
    setSearchLoading(true);
    const { data } = await supabase
      .from('supplement_database')
      .select('id, name, category, default_dosage, default_unit')
      .ilike('name', `%${adHocSearch}%`)
      .limit(5);
    setAdHocResults(data || []);
    setSearchLoading(false);
  }, 300);
  
  return () => clearTimeout(timer);
}, [adHocSearch]);

// Log ad-hoc supplement (one-time intake without adding to stack)
const handleLogAdHoc = async (supplement: any) => {
  if (!user) return;
  setLoggingAdHoc(supplement.id);
  
  try {
    // Create temporary intake log entry
    const today = new Date().toISOString().split('T')[0];
    const { error } = await supabase
      .from('supplement_intake_log')
      .insert({
        user_id: user.id,
        user_supplement_id: null, // Ad-hoc, not linked to user_supplements
        timing: getCurrentTiming(),
        taken: true,
        date: today,
        notes: `Ad-hoc: ${supplement.name} ${supplement.default_dosage}${supplement.default_unit}`
      });
    
    if (error) throw error;
    toast.success(`${supplement.name} geloggt`);
    setAdHocSearch('');
    setAdHocResults([]);
  } catch (err) {
    toast.error('Fehler beim Loggen');
  } finally {
    setLoggingAdHoc(null);
  }
};
```

3. Ad-hoc UI erweitern:
```typescript
<CollapsibleContent className="pt-3 space-y-3">
  <div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
    <Input
      placeholder="Medikament oder Supplement suchen..."
      value={adHocSearch}
      onChange={(e) => setAdHocSearch(e.target.value)}
      className="w-full pl-9"
    />
  </div>
  
  {/* Search Results */}
  {searchLoading ? (
    <div className="flex justify-center py-2">
      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
    </div>
  ) : adHocResults.length > 0 ? (
    <div className="space-y-1">
      {adHocResults.map((supp) => (
        <button
          key={supp.id}
          onClick={() => handleLogAdHoc(supp)}
          disabled={loggingAdHoc === supp.id}
          className="flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
        >
          <div>
            <p className="text-sm font-medium">{supp.name}</p>
            <p className="text-xs text-muted-foreground">
              {supp.default_dosage}{supp.default_unit} • {supp.category}
            </p>
          </div>
          {loggingAdHoc === supp.id ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4 text-primary" />
          )}
        </button>
      ))}
    </div>
  ) : adHocSearch.trim() ? (
    <p className="text-xs text-muted-foreground text-center py-2">
      Keine Ergebnisse fuer "{adHocSearch}"
    </p>
  ) : null}
  
  <p className="text-xs text-muted-foreground px-1">
    Fuer einmalige Einnahmen (z.B. Kopfschmerztablette)
  </p>
</CollapsibleContent>
```

---

## Aenderung 4: Events vereinheitlichen

**Problem:** Verschiedene Komponenten nutzen unterschiedliche Event-Namen:
- `supplement-recommendations-saved` (3 Stellen)
- `supplementRecommendationsAdded` (1 Stelle)

**Loesung:** Alle auf einen einheitlichen Namen: `supplement-stack-changed`

### Betroffene Dateien:

**1. src/components/SupplementPreviewCard.tsx (Zeile 135)**
```typescript
// VORHER
window.dispatchEvent(new CustomEvent('supplement-recommendations-saved'));

// NACHHER
window.dispatchEvent(new CustomEvent('supplement-stack-changed'));
```

**2. src/hooks/useSupplementRecognition.tsx (Zeile 106)**
```typescript
// VORHER
window.dispatchEvent(new CustomEvent('supplement-recommendations-saved'));

// NACHHER
window.dispatchEvent(new CustomEvent('supplement-stack-changed'));
```

**3. src/components/EnhancedUnifiedCoachChat.tsx (Zeile 1313)**
```typescript
// VORHER
window.dispatchEvent(new CustomEvent('supplement-recommendations-saved'));

// NACHHER
window.dispatchEvent(new CustomEvent('supplement-stack-changed'));
```

**4. src/components/InlineSupplementList.tsx (Zeile 83)**
```typescript
// VORHER
window.dispatchEvent(new CustomEvent('supplementRecommendationsAdded'));

// NACHHER
window.dispatchEvent(new CustomEvent('supplement-stack-changed'));
```

**5. Event Listener in useSupplementData.tsx hinzufuegen:**
```typescript
// Nach useDataRefresh (Zeile 249)
useEffect(() => {
  const handleStackChange = () => loadSupplementData({ force: true });
  window.addEventListener('supplement-stack-changed', handleStackChange);
  return () => window.removeEventListener('supplement-stack-changed', handleStackChange);
}, [loadSupplementData]);
```

---

## Zusammenfassung der Dateien

| Datei | Aktion | Beschreibung |
|-------|--------|--------------|
| `src/components/AppSidebar.tsx` | **EDIT** | `comingSoon: true` entfernen (Zeile 71) |
| `src/pages/SupplementsPage.tsx` | **EDIT** | SupplementTrackingModal integrieren |
| `src/components/home/loggers/SupplementsLogger.tsx` | **EDIT** | Ad-hoc Suche mit supplement_database verbinden |
| `src/components/SupplementPreviewCard.tsx` | **EDIT** | Event-Name aendern |
| `src/hooks/useSupplementRecognition.tsx` | **EDIT** | Event-Name aendern |
| `src/components/EnhancedUnifiedCoachChat.tsx` | **EDIT** | Event-Name aendern |
| `src/components/InlineSupplementList.tsx` | **EDIT** | Event-Name aendern |
| `src/hooks/useSupplementData.tsx` | **EDIT** | Event-Listener hinzufuegen |

---

## Erwartetes Ergebnis

Nach Umsetzung aller Aenderungen:

1. **Navigation**: Supplements ist ohne "Soon" Badge erreichbar
2. **Layer 3 Add**: Klick auf "Hinzufuegen" oeffnet vollstaendigen Add-Wizard Modal
3. **Layer 2 Ad-hoc**: "Ungeplantes hinzufuegen" durchsucht die supplement_database und loggt direkt
4. **Events**: Alle Komponenten reagieren konsistent auf Stack-Aenderungen via `supplement-stack-changed`
5. **Interoperabilitaet**: Layer 0 (Chat) → Layer 1 (Widget) → Layer 2 (Sheet) → Layer 3 (Page) sind vollstaendig verlinkt
