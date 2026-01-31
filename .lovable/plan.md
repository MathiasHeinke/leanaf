

# Data Confidence Penalty v2 - Erweitertes System

## Übersicht der Erweiterungen

Basierend auf dem Feedback implementieren wir:
1. **Core 7** statt Core 5 (+ B-Komplex & Elektrolyte)
2. **Gestaffelte Caps** nach Profil-Vollständigkeit (10.0 / 8.5 / 7.5)
3. **Context-sensitive Ausnahmen** (GLP-1 → Elektrolyte/EAA ohne Cap)
4. **UI-Warnung** bei Essential UND Optimizer Tab
5. **Tooltip** bei gecappten Supplements mit "Upgrade-Potenzial"

---

## Technische Änderungen

### 1. Types erweitern

**Datei:** `src/types/relevanceMatrix.ts`

```typescript
// In UserRelevanceContext hinzufügen:
export interface UserRelevanceContext {
  // ... existing fields
  
  // Data Confidence (NEU)
  hasBloodworkData: boolean;      // bloodworkFlags.length > 0
  hasBasicProfile: boolean;       // age, goal, weight vorhanden
  profileCompleteness: 'full' | 'basic' | 'minimal';
}

// In RelevanceScoreResult hinzufügen:
export interface RelevanceScoreResult {
  // ... existing fields
  
  // Data Confidence (NEU)
  isLimitedByMissingData: boolean;   // Score wurde gecapped
  dataConfidenceCap: number;         // Der angewendete Cap (8.5, 7.5, oder 10.0)
  potentialScore?: number;           // Was der Score MIT Blutwerten sein könnte
  upgradeTrigger?: string;           // "Mit Vitamin D Blutwert: Essential möglich"
}
```

### 2. Core 7 Whitelist + Context-sensitive Exceptions

**Datei:** `src/lib/calculateRelevanceScore.ts`

Neue Konstanten und Logik:

```typescript
// Core 7: Universal evidence, no personalization needed
const CORE_7_WHITELIST = [
  'kreatin', 'creatine', 'creatin',           // #1 Universal
  'magnesium', 'mg',                          // #2 70%+ defizitär
  'omega', 'fish oil', 'fischöl', 'epa', 'dha', // #3 Western diet = deficient
  'vitamin d', 'd3', 'd3+k2',                 // #4 Northern latitude
  'zink', 'zinc',                             // #5 Training = increased need
  'vitamin b', 'b-komplex', 'b12', 'b komplex', // #6 60%+ defizitär
  'elektrolyte', 'electrolyte', 'lmnt',       // #7 Training = loss
];

function isCore7(name: string): boolean {
  const normalized = name.toLowerCase();
  return CORE_7_WHITELIST.some(pattern => normalized.includes(pattern));
}

// Context-sensitive exceptions (bypass cap even without bloodwork)
function shouldBypassCap(
  name: string, 
  context: UserRelevanceContext
): { bypass: boolean; reason?: string } {
  const normalized = name.toLowerCase();
  
  // Core 7 always bypass
  if (isCore7(normalized)) {
    return { bypass: true, reason: 'Core 7 Supplement' };
  }
  
  // GLP-1 Users: Elektrolyte + EAA are CRITICAL (muscle loss is real!)
  if (context.isOnGLP1) {
    if (normalized.includes('elektrolyt') || normalized.includes('electrolyte')) {
      return { bypass: true, reason: 'GLP-1 → Elektrolyte kritisch' };
    }
    if (normalized.includes('eaa') || normalized.includes('essential amino')) {
      return { bypass: true, reason: 'GLP-1 → EAA für Muskelschutz' };
    }
  }
  
  // Age-based exceptions without bloodwork
  if (context.ageOver50) {
    if (normalized.includes('nmn') || normalized.includes('nad')) {
      return { bypass: true, reason: 'Alter 50+ → NAD+ Support' };
    }
  }
  
  return { bypass: false };
}
```

### 3. Gestaffelte Caps nach Profil-Vollständigkeit

**Datei:** `src/lib/calculateRelevanceScore.ts`

```typescript
function getDataConfidenceCap(context: UserRelevanceContext): number {
  // Full bloodwork = no cap
  if (context.hasBloodworkData) return 10.0;
  
  // Basic profile (age, goals, weight, medications) = soft cap
  if (context.hasBasicProfile) return 8.5;
  
  // Minimal/anonymous = harder cap
  return 7.5;
}

// In calculateRelevanceScore() nach dem Clamping:
const dataConfidenceCap = getDataConfidenceCap(context);
const bypassInfo = shouldBypassCap(supplementName, context);

let isLimitedByMissingData = false;
let potentialScore: number | undefined;
let upgradeTrigger: string | undefined;

if (!bypassInfo.bypass && score >= dataConfidenceCap && dataConfidenceCap < 10.0) {
  potentialScore = score;  // Store what it COULD be
  score = dataConfidenceCap;
  isLimitedByMissingData = true;
  
  // Generate upgrade hint
  if (matrix.bloodwork_triggers && Object.keys(matrix.bloodwork_triggers).length > 0) {
    const firstTrigger = Object.keys(matrix.bloodwork_triggers)[0];
    upgradeTrigger = `Mit ${getBloodworkFlagLabel(firstTrigger)}: Essential möglich`;
  }
  
  reasons.push(`Daten-Cap: ${dataConfidenceCap.toFixed(1)}`);
  warnings.push('Score vorläufig – Blutbild für volle Personalisierung empfohlen');
}
```

### 4. Context-Hook erweitern

**Datei:** `src/hooks/useUserRelevanceContext.ts`

```typescript
// Im useMemo():
const hasBloodworkData = bloodworkFlags.length > 0;
const hasBasicProfile = !!(profile?.age && profile?.goal_type && profile?.weight);

const profileCompleteness: 'full' | 'basic' | 'minimal' = 
  hasBloodworkData ? 'full' :
  hasBasicProfile ? 'basic' :
  'minimal';

return {
  // ... existing fields
  hasBloodworkData,
  hasBasicProfile,
  profileCompleteness,
};
```

### 5. UI: MissingBloodworkBanner Komponente

**Neue Datei:** `src/components/supplements/MissingBloodworkBanner.tsx`

```typescript
interface MissingBloodworkBannerProps {
  profileCompleteness: 'full' | 'basic' | 'minimal';
  activeTier: DynamicTier;
}

export const MissingBloodworkBanner: React.FC<MissingBloodworkBannerProps> = ({
  profileCompleteness,
  activeTier,
}) => {
  // Only show for Essential and Optimizer when data is incomplete
  if (profileCompleteness === 'full') return null;
  if (activeTier === 'niche') return null;
  
  const isMinimal = profileCompleteness === 'minimal';
  
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
      <div className="text-2xl shrink-0">🔬</div>
      <div className="flex-1">
        <h4 className="font-semibold text-amber-800 dark:text-amber-200">
          {isMinimal ? 'Profil unvollständig' : 'Blutwerte fehlen'}
        </h4>
        <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
          {isMinimal 
            ? 'Ohne Profildaten zeigen wir nur die wissenschaftlich gesicherten Basis-Supplements. Ergänze Alter, Ziele und Gewicht für bessere Empfehlungen.'
            : 'Ohne Laborwerte zeigen wir nur die Core-Supplements. Für personalisierte Empfehlungen basierend auf deinen Biomarkern, lade dein Blutbild hoch.'}
        </p>
        <Link 
          to={isMinimal ? '/profile' : '/bloodwork'}
          className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
        >
          {isMinimal ? 'Profil vervollständigen' : 'Blutwerte hinzufügen'} 
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
};
```

### 6. SupplementInventory integrieren

**Datei:** `src/components/supplements/SupplementInventory.tsx`

```typescript
import { MissingBloodworkBanner } from './MissingBloodworkBanner';
import { useUserRelevanceContext } from '@/hooks/useUserRelevanceContext';

// Im Component:
const { context } = useUserRelevanceContext();

// Im JSX vor der Supplement-Liste:
{context?.profileCompleteness !== 'full' && 
 (activeTier === 'essential' || activeTier === 'optimizer') && (
  <MissingBloodworkBanner 
    profileCompleteness={context?.profileCompleteness || 'minimal'}
    activeTier={activeTier}
  />
)}
```

### 7. SupplementToggleRow Badge + Tooltip

**Datei:** `src/components/supplements/SupplementToggleRow.tsx`

```typescript
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

// In getScoreBadge():
const getScoreBadge = () => {
  if (!item.scoreResult) return null;
  const { score, dynamicTier, isPersonalized, isLimitedByMissingData, potentialScore, upgradeTrigger } = item.scoreResult;
  const tierConfig = DYNAMIC_TIER_CONFIG[dynamicTier];
  
  const badge = (
    <span 
      className={cn(
        "text-[10px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-0.5",
        tierConfig.bgClass,
        tierConfig.textClass,
        isLimitedByMissingData && "border border-dashed border-current opacity-80"
      )}
    >
      {isPersonalized && !isLimitedByMissingData && <Sparkles className="h-2.5 w-2.5" />}
      {isLimitedByMissingData && <Lock className="h-2.5 w-2.5" />}
      {score.toFixed(1)}
    </span>
  );
  
  // Tooltip for capped scores
  if (isLimitedByMissingData && upgradeTrigger) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent side="top" className="max-w-[200px]">
            <p className="text-xs">
              <strong>Score vorläufig</strong><br/>
              {upgradeTrigger}
              {potentialScore && ` (Potenzial: ${potentialScore.toFixed(1)})`}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return badge;
};
```

---

## Dateien-Übersicht

| Datei | Änderung |
|-------|----------|
| `src/types/relevanceMatrix.ts` | `hasBloodworkData`, `profileCompleteness`, `isLimitedByMissingData`, `potentialScore`, `upgradeTrigger` |
| `src/hooks/useUserRelevanceContext.ts` | Profile-Vollständigkeit berechnen |
| `src/lib/calculateRelevanceScore.ts` | Core 7 Whitelist, Context-Exceptions, gestaffelte Caps |
| `src/components/supplements/MissingBloodworkBanner.tsx` | **NEU** - UI-Warnung |
| `src/components/supplements/SupplementInventory.tsx` | Banner integrieren |
| `src/components/supplements/SupplementToggleRow.tsx` | Lock-Badge + Tooltip |

---

## Erwartetes Ergebnis

**Ohne Profil (Minimal):**
- Cap bei 7.5 → Nur 2-3 Essentials (Core 7 bypassen)
- UI: "Profil unvollständig" Banner
- Badge: 🔒 mit gestricheltem Rand

**Mit Profil, ohne Blutwerte (Basic):**
- Cap bei 8.5 → ~5-7 Essentials (Core 7 + Context-Matches)
- GLP-1 User: Elektrolyte + EAA bleiben Essential!
- UI: "Blutwerte fehlen" Banner

**Mit Blutwerten (Full):**
- Kein Cap → Volle Personalisierung
- ✨ Badge für personalisierte Scores
- Kein Banner

---

## Beispiel: Score-Verhalten

| Supplement | Base | +Modifiers | Cap (Basic) | Final | Tier |
|------------|------|------------|-------------|-------|------|
| Creatin | 9.8 | +0 | BYPASS | 9.8 | Essential ✅ |
| Magnesium | 9.5 | +0 | BYPASS | 9.5 | Essential ✅ |
| Elektrolyte | 7.0 | +2.5 (GLP-1) | BYPASS | 9.5 | Essential ✅ |
| NMN | 9.0 | +1.5 (Age 50+) | BYPASS | 10.0 | Essential ✅ |
| Tongkat Ali | 8.0 | +2.0 (Natural) | 8.5 | 8.5 | Optimizer 🔒 |
| Ashwagandha | 8.5 | +1.0 | 8.5 | 8.5 | Optimizer 🔒 |
| Quercetin | 7.0 | +2.5 | 8.5 | 8.5 | Optimizer 🔒 |

Das System ist jetzt verantwortungsvoll: Core-Supplements bleiben zugänglich, aber alles andere braucht Daten um "Essential" zu werden.

