
# Feature: Erweiterte ExpandableSupplementChip mit Produkten, Impact & ARES-Button

## Status: ✅ IMPLEMENTIERT

## Uebersicht

Die bestehende Chip-Komponente wurde um drei mächtige Features erweitert:
1. **Produkt-Marktplatz** mit Preisen, Qualitaets-Sternen und Zertifizierungen
2. **Impact Score Badge** mit visuellem Fortschrittsbalken
3. **"Frag ARES"-Button** fuer sofortige AI-Stack-Analyse

## Implementierte Aenderungen

### 1. ExpandableSupplementChip.tsx

- **Neue Imports**: `Star`, `Zap`, `MessageSquare`, `Package`, `useNavigate`, `useSupplementProducts`
- **Quality Stars Komponente**: 5-Sterne Rating basierend auf `price_tier` (luxury=5, premium=4, mid=3, budget=2)
- **Impact Score Badge**: Zeigt `impact_score` mit Progress-Bar und `necessity_tier` Badge
- **Produkt-Marktplatz**: Liste verfuegbarer Produkte mit Preis/Tag, Zertifizierungen und "Empfohlen"-Badge
- **ARES Button**: Navigiert zu `/coach/ares` mit vorformuliertem Analyse-Prompt

### 2. Coach.tsx

- **useLocation/useNavigate**: Liest `autoStartPrompt` aus Router-State
- **State Cleanup**: Cleared State nach Lesen um Re-Trigger bei Refresh zu verhindern
- **AresChat Integration**: Reicht `autoStartPrompt` an die Chat-Komponente weiter

## Erwartetes Resultat

1. User oeffnet Supplement-Chip im Layer 3 Timeline ✅
2. Sieht sofort Impact Score (z.B. "8.2 - Essential") mit Fortschrittsbalken ✅
3. Scrollt zu verfuegbaren Produkten mit Preis/Tag, Sterne-Rating und Zertifizierungen ✅
4. Klickt auf "Frag ARES" → Navigiert zu ARES-Chat ✅
5. ARES antwortet automatisch mit personalisierter Stack-Analyse ✅
