

# Community Product Submission System - Umsetzungsplan

## Übersicht

Ein **Link-basiertes Produkt-Einreichungssystem** mit RapidAPI-Firecrawl als Scraping-Backend. User gibt Amazon/Shop-Link ein, System extrahiert automatisch Produktdaten, validiert und pflegt nach Admin-Prüfung in die Datenbank ein.

---

## Architektur

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                    PRODUCT SUBMISSION FLOW                               │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [User gibt Link ein] → [RapidAPI Firecrawl] → [LLM-Klassifizierung]    │
│           ↓                     ↓                      ↓                 │
│   ProductLinkInput      Edge Function:         supplement_database       │
│   (UI Component)        scrape-product-link    Matching                  │
│                                ↓                                         │
│                    product_submissions (Pending)                         │
│                                ↓                                         │
│                    [Admin Review Queue]                                  │
│                                ↓                                         │
│                    supplement_products (Approved)                        │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: RapidAPI Secret + DB-Schema

### 1.1 Secret hinzufügen

Der RapidAPI-Key wird als Supabase Secret gespeichert:

| Secret Name | Wert |
|-------------|------|
| `RAPIDAPI_KEY` | `80087dfa3emshb38a8f7087587e5p1eea46jsn10ba0a1129fd` |

### 1.2 Neue Tabelle: `product_submissions`

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `id` | UUID | Primary Key |
| `user_id` | UUID (FK) | Einreichender User |
| `submitted_url` | TEXT | Original-Link (Amazon, iHerb, etc.) |
| `source_domain` | TEXT | z.B. "amazon.de", "iherb.com" |
| `supplement_id` | UUID (FK) | Wirkstoff-Zuordnung (falls erkannt) |
| `status` | ENUM | 'pending', 'approved', 'rejected', 'duplicate', 'invalid' |
| `extracted_data` | JSONB | Rohes Scraping-Ergebnis |
| `product_name` | TEXT | Extrahierter Produktname |
| `brand_name` | TEXT | Extrahierter Hersteller |
| `price_eur` | NUMERIC | Extrahierter Preis |
| `servings` | INTEGER | Extrahierte Portionen |
| `rejection_reason` | TEXT | Grund bei Ablehnung |
| `reviewed_by` | UUID | Admin-User bei Prüfung |
| `reviewed_at` | TIMESTAMPTZ | Prüfungszeitpunkt |
| `created_product_id` | UUID (FK) | Referenz zum erstellten Produkt |
| `created_at` | TIMESTAMPTZ | Einreichungszeitpunkt |

---

## Phase 2: Edge Function `scrape-product-link`

### 2.1 RapidAPI Integration

Nutzt den bereitgestellten RapidAPI-Endpoint:

```typescript
// Request an RapidAPI Firecrawl
const response = await fetch('https://firecrawl-mcp.p.rapidapi.com/extract', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'firecrawl-mcp',
    'x-rapidapi-host': 'firecrawl-mcp.p.rapidapi.com',
    'x-rapidapi-key': Deno.env.get('RAPIDAPI_KEY')!,
  },
  body: JSON.stringify({ url: submittedUrl })
});
```

### 2.2 Ablauf

1. **URL Validieren**: Whitelist-Check (amazon.de, iherb.com, sunday-natural.de, etc.)
2. **RapidAPI Firecrawl aufrufen**: Markdown/HTML extrahieren
3. **LLM-Klassifizierung**: OpenAI prüft ob Supplement, extrahiert Produktdaten
4. **Wirkstoff-Matching**: Fuzzy-Match gegen `supplement_database.name`
5. **Duplikat-Check**: Gleiches Produkt bereits in `supplement_products`?
6. **Submission erstellen**: In `product_submissions` speichern

### 2.3 Request/Response

```typescript
// Request
POST /scrape-product-link
{ "url": "https://www.amazon.de/dp/B07XYZ123" }

// Success Response
{
  "success": true,
  "is_valid_supplement": true,
  "matched_supplement": { "id": "uuid", "name": "Magnesium-Glycinat" },
  "extracted": {
    "product_name": "Magnesium Glycinat 400mg",
    "brand_name": "Natural Elements",
    "price_eur": 19.99,
    "pack_size": 180,
    "dose_per_serving": 400,
    "dose_unit": "mg",
    "amazon_asin": "B07XYZ123",
    "quality_tags": ["GMP", "Made in Germany", "Vegan"]
  },
  "submission_id": "uuid",
  "is_duplicate": false
}

// Error Response
{
  "success": false,
  "error": "NOT_SUPPLEMENT",
  "message": "Das Produkt scheint kein Nahrungsergänzungsmittel zu sein"
}
```

---

## Phase 3: UI-Komponenten

### 3.1 `ProductLinkSubmissionField.tsx`

Wiederverwendbare Komponente für Link-Eingabe:

```text
┌────────────────────────────────────────────────────────────────┐
│  🔗 Produkt per Link hinzufügen                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  [https://www.amazon.de/dp/...]             [Prüfen]          │
│                                                                │
│  Unterstützt: Amazon, iHerb, Sunday Natural, Moleqlar          │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**States:**
- **Eingabe**: URL-Input mit Paste-Erkennung
- **Loading**: Spinner + "Extrahiere Produktdaten..."
- **Preview**: Extrahierte Daten anzeigen zur Bestätigung
- **Success**: "Produkt zur Prüfung eingereicht"
- **Error**: Fehlermeldung mit Grund

### 3.2 Integration: SupplementDetailSheet.tsx

Nach der Produktliste, am Ende des Sheets:

```text
─────────────────────────────────────────────────────────────────
📦 Produkte für diesen Wirkstoff
[Produktliste...]

┌─────────────────────────────────────────────────────────────────┐
│  💡 Dein Lieblingsprodukt fehlt?                                │
│                                                                 │
│  [🔗 Produkt per Link hinzufügen]                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Integration: SupplementTrackingModal.tsx

Im Schritt "Eigenes Produkt" (Zeile 453-459):

```text
┌─────────────────────────────────────────────────────────────────┐
│  Eigenes Produkt hinzufügen                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Option 1: Per Link (empfohlen)                                 │
│  [🔗 Amazon/Shop-Link einfügen...]                             │
│                                                                 │
│  ─────────────────────────────────────────────────              │
│                                                                 │
│  Option 2: Manuell eingeben                                     │
│  [Manuelle Eingabe öffnen →]                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 4: Admin Review-Queue

### 4.1 Erweiterung: AdminSeedPage.tsx

Neue Sektion für Produkt-Einreichungen:

```text
┌─────────────────────────────────────────────────────────────────┐
│  📋 Produkt-Einreichungen (12 ausstehend)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🟡 Natural Elements - Magnesium 400mg                          │
│     Eingereicht von: user@email.com · vor 2 Stunden             │
│     Wirkstoff: Magnesium-Glycinat (Auto-Match: 94%)             │
│     [Vorschau]  [✓ Freigeben]  [✗ Ablehnen]                    │
│                                                                 │
│  🟡 Sunday Natural - Vitamin D3+K2                              │
│     Eingereicht von: user2@email.com · vor 5 Stunden            │
│     Wirkstoff: Vitamin D3+K2 (Auto-Match: 98%)                  │
│     [Vorschau]  [✓ Freigeben]  [✗ Ablehnen]                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Freigabe-Logik

Bei Klick auf "Freigeben":
1. Extrahierte Daten in `supplement_products` einfügen
2. Big8-Score-Berechnung triggern (optional: Hintergrund-Job)
3. `product_submissions.status` auf 'approved' setzen
4. `product_submissions.created_product_id` verknüpfen

---

## Sicherheits-Validierung

| Check | Aktion |
|-------|--------|
| Keine URL | Fehler: "Bitte gültigen Link eingeben" |
| Domain nicht unterstützt | Warning + Best-Effort Scraping |
| Produkt kein Supplement | Ablehnung: "Kein Nahrungsergänzungsmittel erkannt" |
| Duplikat | Info: "Produkt bereits in Datenbank" |
| Scraping fehlgeschlagen | Fehler: "Produktdaten konnten nicht geladen werden" |

---

## Betroffene Dateien

| Datei | Aktion | Priorität |
|-------|--------|-----------|
| Supabase Secrets | `RAPIDAPI_KEY` hinzufügen | 1 |
| `supabase/migrations/` | Tabelle `product_submissions` | 1 |
| `supabase/functions/scrape-product-link/index.ts` | Neue Edge Function | 2 |
| `src/components/supplements/ProductLinkSubmissionField.tsx` | Neue Komponente | 3 |
| `src/hooks/useProductSubmissions.ts` | Neuer Hook | 3 |
| `src/components/supplements/SupplementDetailSheet.tsx` | Integration | 4 |
| `src/components/SupplementTrackingModal.tsx` | Integration | 4 |
| `src/pages/AdminSeedPage.tsx` | Review-Queue | 5 |

---

## Geschätzter Aufwand

| Phase | Task | Zeit |
|-------|------|------|
| 1 | Secret + DB-Schema | 20 min |
| 2 | Edge Function `scrape-product-link` | 1.5h |
| 3 | `ProductLinkSubmissionField` Komponente | 1h |
| 4 | Integration SupplementDetailSheet | 30 min |
| 5 | Integration SupplementTrackingModal | 30 min |
| 6 | Admin Review-Queue | 1h |
| **Gesamt** | | **~5h** |

---

## Nächster Schritt

**Phase 1 starten**: RapidAPI-Key als Secret speichern + DB-Migration für `product_submissions` erstellen.

