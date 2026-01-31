
# Fix: Produkt-Scraping und Anreicherung

## Problem

Das Scraping liefert unvollständige Daten (keine Preise, Packungsgrößen, Portionen), weil:

1. **Firecrawl** den Seiteninhalt oft ohne dynamische JS-Inhalte lädt
2. **LLM-Extraktion** diese fehlenden Daten nicht "erfinden" kann
3. **Enrichment** zwar läuft, aber mit leeren Eingabedaten arbeitet

Die DB zeigt: `price_eur: null`, `pack_size: null`, `servings: null` für das Clear Whey Produkt.

---

## Lösung: Zweistufige Scraping-Strategie

### A) Primär: Verbesserter Firecrawl-Request

Aktuell wird nur `/extract` verwendet. Der API hat auch einen `/scrape` Endpoint mit erweiterten Optionen:

```typescript
// Statt nur extract, auch mit render/wait-Optionen
const response = await fetch('https://firecrawl-mcp.p.rapidapi.com/scrape', {
  method: 'POST',
  headers: { ... },
  body: JSON.stringify({ 
    url,
    formats: ['markdown', 'html'],
    waitFor: 2000, // Warte 2s für JS-Rendering
    includeTags: ['main', 'article', 'product'], 
  }),
});
```

### B) Fallback: Domain-spezifische Extraktion

Für bekannte Shops (ruehl24.de, esn.com, etc.) können wir strukturierte Selektoren nutzen:

```typescript
const DOMAIN_SELECTORS: Record<string, RegExp[]> = {
  'ruehl24.de': [
    /€?\s*(\d+[,.]\d{2})\s*€?/,           // Preis
    /(\d+)\s*(?:Portion|Serving)/i,        // Portionen
    /(\d+)\s*(?:g|Gramm|ml)/i,             // Packungsgröße
  ],
  // weitere Domains...
};
```

### C) LLM-Prompt Verbesserung

Der aktuelle Prompt ist zu allgemein. Spezifischere Anweisungen helfen:

```text
KRITISCHE DATEN (MUSS extrahiert werden):
1. PREIS: Suche nach "€", "EUR", Zahlen vor/nach Währungssymbolen
2. PACKUNGSGRÖSSE: Anzahl Kapseln/Tabletten, Gramm, ml
3. PORTIONEN: "Portionen", "Servings", "für X Tage"
4. DOSIS: "pro Portion", "per serving", mg/mcg/IU

Falls ein Wert NICHT gefunden wird, setze null - NIEMALS raten!
```

### D) Retry-Mechanismus mit Benutzer-Feedback

Wenn kritische Felder fehlen, dem Admin eine "Manuell ergänzen" Option anbieten:

```typescript
// In ProductSubmissionsReview.tsx
{!submission.extracted_data?.price_eur && (
  <Button onClick={() => openManualEntryDialog(submission.id)}>
    <Edit2 className="mr-2 h-4 w-4" />
    Daten manuell ergänzen
  </Button>
)}
```

---

## Dateien zu ändern

| Datei | Änderung |
|-------|----------|
| `supabase/functions/scrape-product-link/index.ts` | Firecrawl-Optionen verbessern, LLM-Prompt präzisieren |
| `supabase/functions/enrich-product-submission/index.ts` | Stage 1 mit Re-Scrape Fallback erweitern |
| `src/components/admin/ProductSubmissionsReview.tsx` | "Manuell ergänzen" Button für fehlende Felder |
| `src/components/admin/ManualProductEntryDialog.tsx` | NEU - Dialog für manuelle Dateneingabe |

---

## Quick-Fix Option

Falls keine API-Änderungen gewünscht: Nur den **Manuellen Ergänzen Dialog** implementieren, damit Admins fehlende Daten nachtragen können. Das ist schneller (15min) und löst das Problem pragmatisch.

---

## Geschätzter Aufwand

- **Quick-Fix (Manual Entry)**: 15 Minuten
- **Vollständige Lösung (Scraping + Fallbacks)**: 45-60 Minuten

Welche Variante soll ich implementieren?
