
# Plan: Journal-Speicherung Debuggen & Verbessern

## Problem-Zusammenfassung

Der Benutzer kann Journal-Einträge nicht speichern. Nach Analyse des Codes und der Datenbank zeigt sich:

- Datenbank-Schema ist korrekt (alle Spalten vorhanden)
- RLS-Policy erlaubt Schreibzugriff für authentifizierte Benutzer
- Es gibt einen erfolgreichen Eintrag von vor wenigen Minuten

## Identifizierte Schwachstellen

| Problem | Datei | Beschreibung |
|---------|-------|--------------|
| Fehlendes Fehler-Feedback | JournalLogger.tsx | Wenn `trackEvent` false zurückgibt, gibt es keine spezifische Fehlermeldung |
| Generischer Error-Toast | useAresEvents.ts | "Speichern fehlgeschlagen" ohne Details zur Ursache |
| Platzhalter-Button verwirrt | JournalLogger.tsx | "Foto hinzufügen" ist nicht implementiert |

## Lösungsplan

### Phase 1: Besseres Fehler-Feedback

**Datei: `src/components/home/loggers/JournalLogger.tsx`**

Aktuell:
```typescript
const success = await trackEvent('journal', {...});
if (success) {
  toast.success('Tagebuch gespeichert ✨');
  onClose();
}
// PROBLEM: Kein else-Block für Fehlerfall
```

Neu:
```typescript
const success = await trackEvent('journal', {...});
if (success) {
  toast.success('Tagebuch gespeichert ✨');
  onClose();
} else {
  // Expliziter Hinweis (useAresEvents zeigt bereits generischen Toast)
  console.error('[JournalLogger] Speichern fehlgeschlagen');
}
```

### Phase 2: Console Logging für Debugging

**Datei: `src/hooks/useAresEvents.ts`**

Erweitere das Journal-Insert mit mehr Logging:
```typescript
if (category === 'journal' && payload.content) {
  console.log('[AresEvents] Attempting journal insert:', { 
    userId: auth.user.id, 
    contentLength: payload.content.length,
    mood: payload.mood 
  });
  
  const { error } = await supabase.from('diary_entries').insert({...});
  
  if (error) {
    console.error('[AresEvents] Journal insert failed:', error.message, error.code);
    throw error;
  }
}
```

### Phase 3: Foto-Placeholder deaktivieren/verstecken

**Datei: `src/components/home/loggers/JournalLogger.tsx`**

Option A: Button ausblenden (empfohlen)
```typescript
{/* PHOTO - Coming Soon */}
{false && (
  <motion.button ...>
    <Camera />
    <span>Foto hinzufügen</span>
  </motion.button>
)}
```

Option B: Als "Coming Soon" markieren
```typescript
<motion.button disabled className="opacity-50 cursor-not-allowed">
  <Camera />
  <span>Foto hinzufügen (bald verfügbar)</span>
</motion.button>
```

### Phase 4: Auth-Check verbessern

Füge einen expliziten Auth-Check vor dem Speichern hinzu:

```typescript
const handleSave = useCallback(async () => {
  if (!content.trim()) {
    toast.error('Bitte schreibe oder sprich deinen Gedanken');
    return;
  }
  
  // NEU: Auth-Check
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    toast.error('Bitte melde dich an');
    return;
  }
  
  setIsSaving(true);
  // ... rest
}, [...]);
```

---

## Technische Details

### Dateien die geändert werden

| Datei | Änderung |
|-------|----------|
| `src/components/home/loggers/JournalLogger.tsx` | Besseres Fehler-Handling, Foto-Button verstecken |
| `src/hooks/useAresEvents.ts` | Erweitertes Console-Logging für Debugging |

### Erwartetes Ergebnis

Nach Implementierung:
- Klares Feedback wenn Speichern fehlschlägt
- Detaillierte Console-Logs zur Fehleranalyse
- Kein verwirrender "Foto hinzufügen" Platzhalter
- Auth-Zustand wird vor dem Speichern geprüft
