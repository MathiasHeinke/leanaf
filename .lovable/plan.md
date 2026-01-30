

## Entfernung des Analog/Advanced Toggles

### Zusammenfassung
Der Mode-Toggle (Zeilen 104-113) wird entfernt, da er aktuell keine Funktionalität hat und nur UI-Clutter verursacht.

### Änderungen

**Datei: `src/pages/Protocol.tsx`**

| Aktion | Details |
|--------|---------|
| Entfernen | Zeilen 104-113: Der komplette Mode-Toggle Button |
| Entfernen | Zeile 20: `Settings2` Import (wird nicht mehr benötigt) |
| Entfernen | Zeile 68: `setProtocolMode` aus dem Hook-Destructuring |

### Vorher (Header-Bereich)

```text
┌─────────────────────────────────────────────────┐
│ [Icon] ARES Protokoll     [Advanced] [Pause]    │
└─────────────────────────────────────────────────┘
```

### Nachher (Header-Bereich)

```text
┌─────────────────────────────────────────────────┐
│ [Icon] ARES Protokoll               [Pause]     │
└─────────────────────────────────────────────────┘
```

### Aufwand
Minimale Änderung – nur Entfernung von ca. 10 Zeilen Code und 2 Imports.

