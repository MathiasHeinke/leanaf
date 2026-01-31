
# Phase 0 Profil-Vervollständigung: Lifestyle-Screening + Disclaimer

## Ubersicht

Phase 0 braucht eine neue Checklist-Karte "Profil vollstandig", die erst als erfüllt gilt, wenn:
1. Basisdaten ausgefüllt sind (Gewicht, Größe, Alter, Geschlecht, Aktivität)
2. Lifestyle-Screening abgeschlossen wurde (Alkohol, Rauchen, Medikamente)
3. Der rechtliche Disclaimer akzeptiert wurde

### Aktueller Stand
- `Phase0Checklist.tsx`: Hat 9 Items (toxin_free, sleep_score, bio_sanierung, etc.)
- `Profile.tsx`: Hat Körper-Basics und MedicalScreening (für Vorerkrankungen/Medikamente)
- `profiles` Tabelle: Hat bereits `protocol_mode`, aber **keine** Lifestyle-Felder (Alkohol, Rauchen)
- `user_medical_profile` Tabelle: Hat medizinische Daten, aber nicht Lifestyle/Toxine

---

## Losung: Neue Struktur

### 1. Profil-Seite Neustrukturierung

Die Reihenfolge der Sektionen in Profile.tsx andern zu:

```text
1. Profil & Identitat (Name, Avatar) - BESTEHT
2. Körper-Basics (Gewicht, Große, Alter, Geschlecht, Aktivitat, Training) - BESTEHT
3. 🆕 LIFESTYLE-SCREENING (Alkohol, Rauchen/Vapen, Drogen)
4. 🆕 DISCLAIMER-AKZEPTANZ (Gesundheits-Haftungsausschluss)
5. Medizinische Informationen (Vorerkrankungen, Medikamente) - BESTEHT (verschoben)
6. ARES Protokoll-Modus - BESTEHT
7. Ziele - BESTEHT
8. Kalorien & Makros - BESTEHT
9. Protokoll-Intensitat - BESTEHT
10. Longevity Settings (Phase 3+) - BESTEHT
11. Coach Persona - BESTEHT
```

### 2. Neue Komponente: LifestyleScreening.tsx

Erfasst Toxin-relevante Lifestyle-Daten:

```text
+------------------------------------------+
| 🚬 LIFESTYLE & TOXINE                    |
+------------------------------------------+
| Rauchst/Vapest du?                       |
| [○ Nein] [○ Gelegentlich] [○ Regelmäßig] |
| Menge (wenn ja): [___ Zigaretten/Tag]    |
+------------------------------------------+
| Wie oft trinkst du Alkohol?              |
| [○ Nie] [○ <2x/Jahr] [○ Monatlich]       |
| [○ Wöchentlich] [○ Täglich]              |
| Menge (wenn ja): [___ Drinks/Woche]      |
+------------------------------------------+
| Konsumierst du andere Substanzen?        |
| [○ Nein] [○ Gelegentlich] [○ Regelmäßig] |
| Welche (optional): [___________]         |
+------------------------------------------+
```

### 3. Neue Komponente: HealthDisclaimer.tsx

Rechtlicher Disclaimer mit Checkbox-Akzeptanz:

```text
+------------------------------------------+
| ⚖️ RECHTLICHER HINWEIS                    |
+------------------------------------------+
| Diese App dient ausschließlich der       |
| Unterhaltung und dem personlichen        |
| Logging. Sie ersetzt KEINEN Arzt oder    |
| medizinische Beratung.                   |
|                                          |
| Bei gesundheitlichen Problemen muss      |
| IMMER ein qualifizierter Arzt            |
| konsultiert werden.                      |
|                                          |
| [✓] Ich bestatige, dass ich für meine    |
|     Gesundheit selbst verantwortlich     |
|     bin und diese App nur zur            |
|     Dokumentation nutze.                 |
|                                          |
| [✓] Ich verstehe, dass diese App keine   |
|     medizinische Beratung darstellt.     |
+------------------------------------------+
```

### 4. Datenbank-Erweiterung

Neue Spalten in `profiles` Tabelle:

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `smoking_status` | text | 'never', 'occasional', 'regular', 'quit' |
| `smoking_amount` | integer | Zigaretten/Tag (nullable) |
| `smoking_quit_date` | date | Aufhördatum (nullable) |
| `vaping_status` | text | 'never', 'occasional', 'regular' |
| `alcohol_frequency` | text | 'never', 'rare', 'monthly', 'weekly', 'daily' |
| `alcohol_drinks_per_week` | integer | Durchschnittliche Drinks/Woche |
| `substance_use` | text | 'none', 'occasional', 'regular' |
| `substance_details` | text | Freitext für Details |
| `disclaimer_accepted_at` | timestamp | Zeitpunkt der Disclaimer-Akzeptanz |
| `lifestyle_screening_completed` | boolean | Flag für Abschluss |

### 5. Phase 0 Checklist Integration

Neues Item in `CHECKLIST_ITEMS`:

```typescript
{
  key: 'profile_complete',
  title: 'Profil vollständig',
  description: 'Basisdaten + Lifestyle + Disclaimer ausgefüllt',
  icon: User,
  autoValidate: true
}
```

Erweiterung von `Phase0Checklist` in `useProtocolStatus.ts`:

```typescript
profile_complete: { 
  completed: boolean; 
  basics_done: boolean;
  lifestyle_done: boolean;
  disclaimer_accepted: boolean;
  validated_at: string | null;
}
```

### 6. Life Impact Data Erweiterung

Neuer Eintrag in `lifeImpactData.ts`:

```typescript
profile_complete: {
  key: 'profile_complete',
  impact: {
    years: 0,
    label: 'Fundament',
    color: 'success',
  },
  whyTitle: 'Dein Ausgangspunkt',
  whyContent: [
    'Ohne vollständiges Profil keine personalisierten Empfehlungen.',
    'Lifestyle-Daten ermöglichen präzise Toxin-Analyse.',
    'Der Disclaimer schützt dich und uns rechtlich.',
  ],
  subItems: [
    { label: 'Basisdaten erfasst', explanation: 'Gewicht, Größe, Alter, Geschlecht' },
    { label: 'Lifestyle-Screening abgeschlossen', explanation: 'Rauchen, Alkohol, Substanzen' },
    { label: 'Disclaimer akzeptiert', explanation: 'Rechtliche Verantwortung bestätigt' },
  ],
  aresQuote: 'Ohne Daten bin ich blind. Gib mir die Infos – dann zeig ich dir den Weg.',
}
```

### 7. Auto-Validierung Logik

In `Phase0Checklist.tsx` neue Validation hinzufügen:

```typescript
// Validate Profile Completion
const { data: profileData } = await supabase
  .from('profiles')
  .select('weight, height, age, gender, activity_level, ' +
          'smoking_status, alcohol_frequency, ' +
          'disclaimer_accepted_at, lifestyle_screening_completed')
  .eq('user_id', user.id)
  .maybeSingle();

if (profileData) {
  const basicsComplete = !!(profileData.weight && profileData.height && 
                           profileData.age && profileData.gender);
  const lifestyleComplete = !!profileData.lifestyle_screening_completed;
  const disclaimerAccepted = !!profileData.disclaimer_accepted_at;
  
  if (basicsComplete && lifestyleComplete && disclaimerAccepted) {
    await updatePhase0Check('profile_complete', {
      completed: true,
      basics_done: true,
      lifestyle_done: true,
      disclaimer_accepted: true,
      validated_at: new Date().toISOString()
    });
  }
}
```

---

## Technische Umsetzung

### Dateien

| Datei | Anderung |
|-------|----------|
| `src/components/profile/LifestyleScreening.tsx` | NEU - Alkohol/Rauchen/Substanzen-Erfassung |
| `src/components/profile/HealthDisclaimer.tsx` | NEU - Disclaimer-Komponente mit Checkboxen |
| `src/pages/Profile.tsx` | Neue Komponenten einfügen, Reihenfolge andern |
| `src/components/protocol/phase-0/Phase0Checklist.tsx` | Neues Item + Auto-Validation |
| `src/components/protocol/phase-0/lifeImpactData.ts` | Neuer Eintrag profile_complete |
| `src/hooks/useProtocolStatus.ts` | Erweiterung Phase0Checklist Interface |
| Datenbank-Migration | Neue Spalten für profiles Tabelle |

### Ablauf für User

1. User öffnet Profil
2. Füllt Basisdaten aus (Gewicht, Größe, etc.)
3. Scrollt zu Lifestyle-Screening → Rauchen, Alkohol, Substanzen
4. Disclaimer wird angezeigt → Checkboxen akzeptieren
5. **Erst jetzt** kann der Disclaimer-Button aktiviert werden
6. Nach Speichern: `lifestyle_screening_completed = true`, `disclaimer_accepted_at = now()`
7. Phase 0 Checklist zeigt "Profil vollstandig" als erfullt

### Verbindung zu Toxin-Free Item

Das bestehende "Toxin-Frei + Sauna" Item bleibt **manuell bestatigbar**, aber die Lifestyle-Daten aus dem Profil können als **Warnung** angezeigt werden:

```text
⚠️ Du hast angegeben, wöchentlich Alkohol zu trinken.
   Für "+15 Jahre" muss Alkohol auf max. 2×/Jahr reduziert werden.
```

---

## Geschatzter Aufwand

30-40 Minuten für die komplette Implementation inkl. DB-Migration.
