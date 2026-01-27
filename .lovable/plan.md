

# Profile-Seite: Logische Reorganisation + Fehlende Features

## Zusammenfassung

Die Profile-Seite wird reorganisiert für besseren Informationsfluss und um kritische ARES-Protocol Features zu integrieren:
- **Natural vs. Enhanced Modus** (beeinflusst alle Berechnungen)
- **Aktuelle Protocol-Phase Anzeige**
- **Longevity-Settings für Phase 3+**

---

## Neue Reihenfolge der Sektionen

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. PROFIL & IDENTITÄT                                       │
│    Avatar + Anzeigename (wie soll ARES dich nennen)         │
├─────────────────────────────────────────────────────────────┤
│ 2. KÖRPER-BASICS                                            │
│    Gewicht (Start/Aktuell), Größe, Alter, Geschlecht       │
├─────────────────────────────────────────────────────────────┤
│ 3. LIFESTYLE                                                │
│    Aktivitätslevel + Training-Frequenz (NEU)                │
├─────────────────────────────────────────────────────────────┤
│ 4. ARES PROTOKOLL-MODUS (NEU)                              │
│    Natural │ Enhanced (Reta/Peptide) │ Klinisch (TRT+)     │
│    + Current Phase Badge (0-3) als read-only Info          │
├─────────────────────────────────────────────────────────────┤
│ 5. ZIELE                                                    │
│    Weight Delta + Muscle Goal + Tempo (bestehend)           │
├─────────────────────────────────────────────────────────────┤
│ 6. KALORIEN & MAKROS                                        │
│    BMR/TDEE/Ziel + Defizit + Makro-Verteilung (bestehend)   │
├─────────────────────────────────────────────────────────────┤
│ 7. PROTOKOLL-INTENSITÄT                                     │
│    Rookie/Warrior/Elite Protein-Tier (bestehend)            │
├─────────────────────────────────────────────────────────────┤
│ 8. GESUNDHEIT                                               │
│    Medical Screening (bestehend)                            │
│    + Bloodwork Status Indicator (NEU, optional)             │
├─────────────────────────────────────────────────────────────┤
│ 9. LONGEVITY SETTINGS (NEU - nur Phase 3+)                 │
│    Conditional: Nur anzeigen wenn user_protocol_status >= 3 │
│    → Rapamycin-Protokoll (Wochentag)                        │
│    → Fasten-Präferenz (16:8, 24h, Extended)                 │
│    → DunedinPACE Tracking aktiviert?                        │
├─────────────────────────────────────────────────────────────┤
│ 10. COACH PERSONA                                           │
│     Persönlichkeit des Coaches (bestehend)                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Neue Komponenten

### 1. Protocol Mode Selector (NEU)

**Datei:** `src/components/profile/ProtocolModeSelector.tsx`

**Zweck:** Definiert ob User Natural arbeitet oder Enhanced-Support nutzt

**UI-Struktur:**
```text
┌─────────────────────────────────────────────────────────────┐
│ 🧬 ARES Protokoll-Modus                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [ 🌱 Natural ]  [ 💊 Enhanced ]  [ 🔬 Klinisch ]          │
│     Diät only      Reta/Peptide      TRT+                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Aktuelle Phase: [2] Fine-Tuning                    │   │
│  │  → 7/9 Kriterien erfüllt                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**States:**
- `protocolMode`: `'natural' | 'enhanced' | 'clinical'`
- Current Phase: Geladen aus `user_protocol_status` (read-only)

**Auswirkungen:**
- Natural: Konservativere Defizit-Empfehlungen (max 500 kcal/Tag)
- Enhanced: Aggressivere Defizite erlaubt (GLP-1 schützt Muskeln)
- Clinical: Voller Zugang zu allen ARES-Interventionen

### 2. Training Frequency Input (NEU)

**Integration in Lifestyle-Sektion**

```text
Wie oft trainierst du pro Woche?
[ 0 ] [ 1-2 ] [ 3-4 ] [ 5+ ]
```

- Beeinflusst TDEE-Berechnung
- Wird mit `activityLevel` kombiniert für präzisere Kalorien

### 3. Longevity Settings (NEU - Conditional)

**Datei:** `src/components/profile/LongevitySettings.tsx`

**Nur anzeigen wenn:** `user_protocol_status.current_phase >= 3`

**UI-Struktur:**
```text
┌─────────────────────────────────────────────────────────────┐
│ 🧬 Longevity Protocol (Phase 3)                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Rapamycin-Tag: [ Sonntag ▼ ]                              │
│                                                             │
│  Fasten-Protokoll:                                          │
│  [ 16:8 ] [ 24h Weekly ] [ Extended (3-5d) ]               │
│                                                             │
│  [ ] DunedinPACE Tracking aktivieren                       │
│  [ ] Senolytic-Zyklen tracken                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4. Bloodwork Status Indicator (NEU - Optional)

**Kleine Badge unter Medical Screening:**

```text
🩸 Letzte Blutwerte: vor 45 Tagen
   [Neue Werte eingeben]
```

---

## Änderungen in Profile.tsx

### Neue States

```typescript
// Protocol Mode
const [protocolMode, setProtocolMode] = useState<'natural' | 'enhanced' | 'clinical'>('natural');

// Training Frequency  
const [weeklyTrainingSessions, setWeeklyTrainingSessions] = useState<number>(3);

// Longevity (Phase 3+)
const [rapamycinDay, setRapamycinDay] = useState<string>('sunday');
const [fastingProtocol, setFastingProtocol] = useState<'16:8' | '24h' | 'extended'>('16:8');
const [trackDunedinPace, setTrackDunedinPace] = useState(false);
```

### Sektion-Reihenfolge ändern

| Alt | Neu |
|-----|-----|
| 1. Persönliche Daten | 1. Profil & Identität (Avatar + Name) |
| 2. Ziele | 2. Körper-Basics |
| 3. Kalorien & Makros | 3. Lifestyle (+ Training) |
| 4. Protokoll-Intensität | 4. Protocol Mode (NEU) |
| 5. Medical Screening | 5. Ziele |
| 6. Coach Persona | 6. Kalorien & Makros |
| 7. Avatar & Name | 7. Protokoll-Intensität |
| - | 8. Gesundheit |
| - | 9. Longevity (conditional) |
| - | 10. Coach Persona |

---

## Dateien

| Datei | Aktion |
|-------|--------|
| `src/components/profile/ProtocolModeSelector.tsx` | NEU erstellen |
| `src/components/profile/LongevitySettings.tsx` | NEU erstellen |
| `src/pages/Profile.tsx` | Reihenfolge ändern, neue States, neue Komponenten integrieren |
| `src/utils/calorieCalculator.ts` | Protocol Mode berücksichtigen (Defizit-Limits) |

---

## Database Integration

### Neue Felder in `profiles` Tabelle (oder bestehende nutzen)

```sql
protocol_mode: text ('natural' | 'enhanced' | 'clinical')
weekly_training_sessions: integer
rapamycin_day: text
fasting_protocol: text
track_dunedin_pace: boolean
```

### Read-only Daten aus bestehenden Tabellen

- `user_protocol_status.current_phase` → Phase-Badge
- `user_bloodwork.created_at` → "Letzte Blutwerte vor X Tagen"

---

## Vorteile der Reorganisation

| Aspekt | Verbesserung |
|--------|--------------|
| **Logischer Flow** | Von "Wer bin ich" → "Was will ich" → "Wie erreiche ich es" |
| **ARES-Integration** | Protocol Mode beeinflusst alle Empfehlungen |
| **Progressive Disclosure** | Longevity nur für Phase 3+ User sichtbar |
| **Vollständigkeit** | Alle relevanten Protocol-Daten an einem Ort |
| **Personalisierung** | Training-Frequenz verbessert Kalorienschätzung |

