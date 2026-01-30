

## Fix: Click auf Dropdown-Element schließt sofort das Dropdown

### Problem
Die `handleClickOutside` Logik prüft nur, ob der Click innerhalb von `containerRef` ist. Da das Portal-Dropdown aber in `document.body` gerendert wird (nicht im Container), wird jeder Click auf ein Suchergebnis als "Outside-Click" erkannt - das Dropdown schließt sich **bevor** `handleSelect` ausgeführt werden kann.

### Lösung
Wir fügen eine zusätzliche Ref für das Dropdown hinzu und prüfen **beide** Container in der Outside-Click-Logik:

```typescript
const dropdownRef = useRef<HTMLDivElement>(null);

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Node;
  
  // Ignore clicks inside the input container OR the dropdown
  const isInsideContainer = containerRef.current?.contains(target);
  const isInsideDropdown = dropdownRef.current?.contains(target);
  
  if (!isInsideContainer && !isInsideDropdown) {
    setIsOpen(false);
  }
};
```

### Datei-Änderungen

| Datei | Änderung |
|-------|----------|
| `src/components/supplements/QuickSupplementSearch.tsx` | Dropdown-Ref hinzufügen und Outside-Click-Logik anpassen |

### Technische Details

1. **Neuer Ref für Dropdown:** `const dropdownRef = useRef<HTMLDivElement>(null);`
2. **Ref an Portal-Div zuweisen:** `<div ref={dropdownRef} style={{...}} ...>`
3. **Erweiterte Outside-Click-Prüfung:** Beide Refs checken

### Erwartetes Verhalten

| Vorher | Nachher |
|--------|---------|
| Click auf "Ashwagandha" → Dropdown schließt, nichts passiert | Click auf "Ashwagandha" → Supplement wird hinzugefügt, Toast erscheint |

### Code-Änderungen (ca. 10 Zeilen)

```diff
+ const dropdownRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = (event: MouseEvent) => {
-   if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
-     setIsOpen(false);
-   }
+   const target = event.target as Node;
+   const isInsideContainer = containerRef.current?.contains(target);
+   const isInsideDropdown = dropdownRef.current?.contains(target);
+   if (!isInsideContainer && !isInsideDropdown) {
+     setIsOpen(false);
+   }
  };

// Im Portal:
- <div style={{...}}>
+ <div ref={dropdownRef} style={{...}}>
```

