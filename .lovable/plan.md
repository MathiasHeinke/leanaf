

## Fix: Dropdown wird vom Container abgeschnitten

### Problem
Die `ProtocolBundleCard` verwendet `overflow-hidden` (Zeile 127), um die abgerundeten Ecken sauber darzustellen. Dies verhindert jedoch, dass das Such-Dropdown über die Container-Grenzen hinausragt.

### Lösung
Die beste Lösung ist, das Dropdown mit einem **React Portal** zu rendern. Dadurch wird es außerhalb des DOM-Baums der Karte platziert und ist nicht mehr von `overflow-hidden` betroffen.

### Datei-Änderungen

| Datei | Änderung |
|-------|----------|
| `src/components/supplements/QuickSupplementSearch.tsx` | Dropdown in ein Portal wrappen |

### Technische Umsetzung

Das Dropdown wird mit `ReactDOM.createPortal()` direkt in `document.body` gerendert. Die Position wird dynamisch basierend auf dem Suchfeld berechnet:

```typescript
import { createPortal } from 'react-dom';

// In der Komponente:
const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

// Bei Fokus/Öffnen die Position berechnen:
useEffect(() => {
  if (isOpen && containerRef.current) {
    const rect = containerRef.current.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom + window.scrollY + 4, // 4px Abstand
      left: rect.left + window.scrollX,
      width: rect.width,
    });
  }
}, [isOpen]);

// Dropdown-Render mit Portal:
{isOpen && filteredResults.length > 0 && createPortal(
  <div 
    style={{
      position: 'absolute',
      top: dropdownPosition.top,
      left: dropdownPosition.left,
      width: dropdownPosition.width,
    }}
    className="z-[9999] bg-popover border rounded-lg shadow-xl"
  >
    {/* Ergebnisliste */}
  </div>,
  document.body
)}
```

### Vorteile
- Das Dropdown erscheint über allen anderen Elementen
- Unabhängig von Parent-Container `overflow` Einstellungen
- Konsistentes Verhalten wie bei Radix UI Dropdowns

### Aufwand
~15 Zeilen Code-Änderung in einer Datei

