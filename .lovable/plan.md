

# Architect Mode: Sidebar Navigation Refactoring

## Zusammenfassung

Die Sidebar wird zur "Layer 3 Configuration Hub" - dem Ort, wo **geplant** wird. Das Dashboard bleibt der Ort, wo **gehandelt** wird.

```text
Dashboard = DO IT (Layer 0-2, Daily Execution)
Sidebar = PLAN IT (Layer 3, Strategy & Configuration)
```

## Neue 4-Gruppen-Struktur

```text
┌─────────────────────────────────────────────────┐
│ LIVE                                            │
│   ● Dashboard                                   │
├─────────────────────────────────────────────────┤
│ PROTOKOLL                                       │
│   ● ARES Protokoll (Phasen)                     │
│   ○ Routinen           [Soon]                   │
│   ● Training                                    │
│   ○ Ernaehrung         [Soon]                   │
│   ○ Supplements        [Soon]                   │
│   ○ Peptide            [Soon]                   │
├─────────────────────────────────────────────────┤
│ ANALYSE                                         │
│   ● Bio-Daten (NEU - Hub fuer Blood/BioAge)     │
│   ● Analyse                                     │
│   ● Logbuch (History)                           │
├─────────────────────────────────────────────────┤
│ SYSTEM                                          │
│   ● Profil                                      │
│   ▸ Einstellungen [Collapsible]                 │
│   ▸ Rechtliches [Collapsible]                   │
└─────────────────────────────────────────────────┘

Legende: ● existiert | ○ neu (Platzhalter)
```

## Technische Umsetzung

### Datei 1: `src/components/AppSidebar.tsx` (EDIT)

**Neue Imports:**
```typescript
import { 
  Sparkles,    // Routinen
  Utensils,    // Ernaehrung
  Pill,        // Supplements
  Syringe,     // Peptide
  Dna,         // Bio-Daten
  LineChart    // Analyse
} from "lucide-react";
```

**Neue Navigations-Gruppen:**
```typescript
// Group 1: LIVE - The Cockpit
const GROUP_LIVE = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
];

// Group 2: ARES PROTOKOLL - Strategy & Builder
const GROUP_PROTOKOLL = [
  { title: "ARES Protokoll", url: "/protocol", icon: FlaskConical },
  { title: "Routinen", url: "/routines", icon: Sparkles, comingSoon: true },
  { title: "Training", url: "/training", icon: Dumbbell },
  { title: "Ernaehrung", url: "/nutrition-planner", icon: Utensils, comingSoon: true },
  { title: "Supplements", url: "/supplements", icon: Pill, comingSoon: true },
  { title: "Peptide", url: "/peptides", icon: Syringe, comingSoon: true },
];

// Group 3: ANALYSE & DATEN - The Lab
const GROUP_ANALYSE = [
  { title: "Bio-Daten", url: "/biodata", icon: Dna },
  { title: "Analyse", url: "/analyse", icon: LineChart },
  { title: "Logbuch", url: "/history", icon: HistoryIcon },
];

// Group 4: SYSTEM
const GROUP_SYSTEM = [
  { title: "Profil", url: "/profile", icon: UserIcon },
];
```

**UI-Struktur mit SidebarGroupLabel:**
- Jede Gruppe bekommt ein Label (LIVE, PROTOKOLL, ANALYSE, SYSTEM)
- Visuelle Divider zwischen Gruppen
- "Soon" Badge fuer kommende Features
- Labels im collapsed State: `sr-only` (nur Icons sichtbar)

### Datei 2: `src/App.tsx` (EDIT)

Neue Routen registrieren:
```typescript
import RoutinesPage from "./pages/RoutinesPage";
import NutritionPlannerPage from "./pages/NutritionPlannerPage";
import SupplementsPage from "./pages/SupplementsPage";
import PeptidesPage from "./pages/PeptidesPage";
import BioDataPage from "./pages/BioDataPage";

// In Routes:
<Route path="/routines" element={<RoutinesPage />} />
<Route path="/nutrition-planner" element={<NutritionPlannerPage />} />
<Route path="/supplements" element={<SupplementsPage />} />
<Route path="/peptides" element={<PeptidesPage />} />
<Route path="/biodata" element={<BioDataPage />} />
```

### Neue Seiten (CREATE)

| Datei | Beschreibung | Inhalt |
|-------|--------------|--------|
| `src/pages/RoutinesPage.tsx` | Routine Engine | Action Card Konfigurator (Coming Soon) |
| `src/pages/NutritionPlannerPage.tsx` | Meal Architect | Meal Plans & Strategien (Coming Soon) |
| `src/pages/SupplementsPage.tsx` | Stack Manager | Inventar & Stack Builder (Coming Soon) |
| `src/pages/PeptidesPage.tsx` | Protocol Manager | Vial & Injection Management (Coming Soon) |
| `src/pages/BioDataPage.tsx` | Bio-Daten Hub | Links zu Bloodwork, Bio-Age, Transformation |

**Platzhalter-Design:**
- Header mit Icon + Titel + "Layer 3" Badge
- "Coming Soon" Card mit Konstruktions-Icon
- Feature-Preview-Liste (was kommt)
- Einheitliches Premium-Design

### BioDataPage - Besonderheit

Die BioDataPage ist KEIN reiner Platzhalter, sondern ein **Hub**:
- Klickbare Card "Blutwerte" → navigiert zu `/bloodwork`
- Klickbare Card "Transformation" → navigiert zu `/transformation`
- Coming Soon Cards fuer "Bio-Age" und "Koerperkomposition"
- Erklaerungstext zur Datenaggregation

## Betroffene Dateien

| Datei | Aktion | Beschreibung |
|-------|--------|--------------|
| `src/components/AppSidebar.tsx` | **EDIT** | Komplette Neustrukturierung mit 4 Gruppen |
| `src/App.tsx` | **EDIT** | 5 neue Routen registrieren |
| `src/pages/RoutinesPage.tsx` | **CREATE** | Platzhalter mit Feature-Preview |
| `src/pages/NutritionPlannerPage.tsx` | **CREATE** | Platzhalter mit Feature-Preview |
| `src/pages/SupplementsPage.tsx` | **CREATE** | Platzhalter mit Feature-Preview |
| `src/pages/PeptidesPage.tsx` | **CREATE** | Platzhalter mit Feature-Preview |
| `src/pages/BioDataPage.tsx` | **CREATE** | Hub-Seite mit Navigation zu Bloodwork/Transformation |

## Erwartetes Ergebnis

### Vorher
- Flache Navigation ohne Struktur
- Kein klares "Do vs. Plan" Konzept
- Transformation/ARES ausgeblendet und vergessen

### Nachher
- Klare 4-Gruppen-Hierarchie
- Professional "Pro Tool" Aesthetik
- ARES Protokoll wieder sichtbar
- Coming Soon Features sichtbar aber markiert
- Bio-Daten als zentraler Hub

### Visual Design

```text
┌──────────────────────────┐
│ LIVE                     │  ← Subtle Label
│ ┌──────────────────────┐ │
│ │ 🏠 Dashboard         │ │  ← Active state
│ └──────────────────────┘ │
├──────────────────────────┤  ← Divider
│ PROTOKOLL                │
│ │ ⚗️ ARES Protokoll     │ │
│ │ ✨ Routinen    [Soon] │ │  ← Badge
│ │ 🏋️ Training           │ │
│ │ 🍽️ Ernaehrung  [Soon] │ │
│ │ 💊 Supplements [Soon] │ │
│ │ 💉 Peptide     [Soon] │ │
├──────────────────────────┤
│ ANALYSE                  │
│ │ 🧬 Bio-Daten          │ │
│ │ 📈 Analyse            │ │
│ │ 📜 Logbuch            │ │
├──────────────────────────┤
│ SYSTEM                   │
│ │ 👤 Profil             │ │
│ │ ▸ Einstellungen       │ │  ← Collapsible
│ │ ▸ Rechtliches         │ │
└──────────────────────────┘
```

