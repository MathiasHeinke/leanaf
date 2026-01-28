
# Feature: Erweiterte ExpandableSupplementChip mit Produkten, Impact & ARES-Button

## Uebersicht

Die bestehende Chip-Komponente wird um drei mächtige Features erweitert:
1. **Produkt-Marktplatz** mit Preisen, Qualitaets-Sternen und Zertifizierungen
2. **Impact Score Badge** mit visuellem Fortschrittsbalken
3. **"Frag ARES"-Button** fuer sofortige AI-Stack-Analyse

## Technische Analyse

### Bestehende Infrastruktur (bereits vorhanden)

| Komponente | Status | Details |
|------------|--------|---------|
| `useSupplementProducts(supplementId)` | Existiert | Laedt Produkte mit Brand-Daten, Preise, Zertifizierungen |
| `AresChat autoStartPrompt` Prop | Existiert | Triggert automatische Nachricht beim Laden |
| Impact Score in `item.supplement` | Existiert | `impact_score`, `necessity_tier`, `evidence_level` verfuegbar |

### Aenderungen

#### 1. ExpandableSupplementChip.tsx - Neue Zonen im Expanded State

Zwischen "Notes" und "Footer Actions" werden zwei neue Zonen eingefuegt:

**Zone A: Impact Score Badge**
```text
+-----------------------------------------------------+
| ⚡ Impact Score: 8.2                                |
|    [████████░░░] Essential                          |
+-----------------------------------------------------+
```

**Zone B: Produkt-Marktplatz**
```text
+-----------------------------------------------------+
| 📦 Verfuegbare Produkte                             |
| +--------------------------------------------------+|
| | Sunday Natural           ★★★★   €0.85/Tag       ||
| | [GMP] [vegan]            ✓ Empfohlen            ||
| +--------------------------------------------------+|
| | MoleQlar                 ★★★★★  €1.20/Tag       ||
| | [pharma-grade]                                  ||
| +--------------------------------------------------+|
+-----------------------------------------------------+
```

**Zone C: Erweiterter Footer**
```text
+-----------------------------------------------------+
| [✓ Speichern]              [🤖 Frag ARES]     [🗑] |
+-----------------------------------------------------+
```

#### 2. Qualitaets-Sterne Mapping

| Price Tier | Sterne | Farbe |
|------------|--------|-------|
| `luxury`   | ★★★★★  | Gold  |
| `premium`  | ★★★★   | Gold  |
| `mid`      | ★★★    | Amber |
| `budget`   | ★★     | Gray  |

#### 3. "Frag ARES" Navigation

Button navigiert zu `/coach/ares` mit `state.autoStartPrompt`:

```typescript
const handleAskAres = () => {
  const prompt = `Analysiere "${item.name}" in meinem Stack:
- Aktuelle Dosis: ${dosage}${unit}
- Timing: ${PREFERRED_TIMING_LABELS[preferredTiming]}
Passt das zu meinen Zielen? Gibt es bessere Alternativen oder Synergie-Effekte?`;
  
  navigate('/coach/ares', { state: { autoStartPrompt: prompt } });
};
```

#### 4. Coach.tsx Anpassung

Die Seite liest den `autoStartPrompt` aus `location.state` und reicht ihn an `AresChat` weiter. Da `AresChat` dies bereits unterstuetzt (Prop existiert, Zeilen 420-430), ist nur das Weiterreichen noetig.

## Datei-Aenderungen

| Datei | Aenderung |
|-------|-----------|
| `src/components/supplements/ExpandableSupplementChip.tsx` | Neue Imports (`Star`, `Zap`, `MessageSquare`, `useNavigate`), `useSupplementProducts` Hook integrieren, Impact-Badge rendern, Produkt-Liste rendern, "Frag ARES"-Button im Footer |
| `src/pages/Coach.tsx` | `useLocation` nutzen um `autoStartPrompt` aus State zu lesen und an `AresChat` weitergeben, State nach Verwendung clearen |

## Erwartetes Resultat

1. User oeffnet Supplement-Chip im Layer 3 Timeline
2. Sieht sofort Impact Score (z.B. "8.2 - Essential") mit Fortschrittsbalken
3. Scrollt zu verfuegbaren Produkten mit Preis/Tag, Sterne-Rating und Zertifizierungen
4. Klickt auf "Frag ARES" → Navigiert zu ARES-Chat
5. ARES antwortet automatisch mit personalisierter Stack-Analyse
