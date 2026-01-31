
# Domain-Whitelist Erweiterung: 12 → 85+ Shops

## Ubersicht

Erweiterung der unterstutzten Shop-Domains von aktuell 12 auf uber 85 Domains in zwei Dateien.

---

## Anderung 1: Edge Function

**Datei:** `supabase/functions/scrape-product-link/index.ts`

Die `SUPPORTED_DOMAINS` Liste (Zeile 10-23) wird erweitert auf:

### Kategorien und Domains

| Kategorie | Domains (Anzahl) |
|-----------|------------------|
| Amazon/Marketplace | amazon.de, amazon.com, amazon.co.uk, amazon.at (4) |
| International | iherb.com, vitacost.com, swansonvitamins.com, pipingrock.com, evitamins.com (5) |
| Premium/Longevity Hersteller | sunday-natural.de, moleqlar.de, biogena.com, lifeextension.com, thorne.com, nordicnaturals.com, purecaps.net (12) |
| Mid-Range Hersteller | naturtreu.de, naturelove.de, natural-elements.de, gloryfeel.de, doppelherz.de, orthomol.de, nowfoods.com (11) |
| Sport und Fitness | esn.com, morenutrition.de, profuel.de, gymbeam.de, bodylab24.de, body-attack.de, bulk.com, myprotein.de, fitmart.de, zecplus.de, rocka-nutrition.de, ironmaxx.de, prozis.com (17) |
| Vitaminversand | vitaminversand24.com, vitamin360.com, vitaworld24.de, medicom.de, vit4ever.de, nutri-plus.de, fairvital.com, vitabay.de, biovea.com, vitaminexpress.org, vitamaze.shop, zeinpharma.de, effective-nature.com, nu3.de, vitafy.de (18) |
| Online Apotheken | shop-apotheke.com, docmorris.de, medpex.de, aponeo.de, sanicare.de, apo-rot.de, apodiscounter.de, mycare.de, delmed.de, disapo.de (10) |
| Longevity/Biohacking | braineffect.com, edubily.de, primal-state.de, do-not-age.com, alive-by-science.com, humanx.de, bio360.de (8) |

**Gesamt: 85+ Domains** (inkl. Varianten wie .de/.com)

---

## Anderung 2: UI-Komponente

**Datei:** `src/components/supplements/ProductLinkSubmissionField.tsx`

Zeile 147-149 anpassen:

**Vorher:**
```
Unterstutzt: Amazon, iHerb, Sunday Natural, Moleqlar
```

**Nachher:**
```
Unterstutzt: Amazon, iHerb, Sunday Natural, ESN, More Nutrition, DocMorris, Shop-Apotheke + 50 weitere
```

---

## Technische Details

Die Whitelist dient zur User-Orientierung. Das LLM-basierte Scraping funktioniert auch fur nicht-gelistete Domains (Best-Effort).

### Betroffene Dateien

| Datei | Anderung |
|-------|----------|
| `supabase/functions/scrape-product-link/index.ts` | SUPPORTED_DOMAINS erweitern (Zeile 10-23) |
| `src/components/supplements/ProductLinkSubmissionField.tsx` | Info-Text aktualisieren (Zeile 147-149) |

---

## Geschatzter Aufwand

2-3 Minuten fur beide Anderungen.
