
# Cost Per Day Berechnung fuer supplement_database

## Uebersicht

Von den **73 Supplements ohne cost_per_day_eur** koennen wir:
- **54 automatisch berechnen** - basierend auf verlinkten Produkten
- **19 manuell schaetzen** - keine Produktdaten vorhanden

---

## Schritt 1: Automatische Berechnung (54 Supplements)

Folgende Supplements haben verlinkte Produkte und bekommen ihren Durchschnittspreis:

| Supplement | Produkte | Avg Preis/Tag |
|------------|----------|---------------|
| Omega-3 | 37 | 0.40 EUR |
| Magnesium | 35 | 0.35 EUR |
| Vitamin D3 | 32 | 0.11 EUR |
| Probiotika | 26 | 0.74 EUR |
| Zink | 25 | 0.19 EUR |
| Ashwagandha | 23 | 0.22 EUR |
| Curcumin | 21 | 0.36 EUR |
| Creatin | 20 | 0.22 EUR |
| NAC | 18 | 0.15 EUR |
| Vitamin C | 16 | 0.55 EUR |
| Kollagen | 14 | 0.95 EUR |
| Vitamin B12 | 13 | 0.23 EUR |
| Melatonin | 12 | 0.26 EUR |
| Eisen | 11 | 0.10 EUR |
| BCAA | 9 | 0.32 EUR |
| Berberin | 8 | 0.33 EUR |
| Lions Mane | 8 | 0.31 EUR |
| NMN | 6 | 1.49 EUR |
| Resveratrol | 5 | 0.65 EUR |
| ... | ... | ... |

### SQL Migration

```sql
UPDATE supplement_database sd
SET cost_per_day_eur = subquery.avg_price
FROM (
  SELECT 
    sp.supplement_id,
    ROUND(AVG(sp.price_per_serving)::numeric, 2) as avg_price
  FROM supplement_products sp
  WHERE sp.supplement_id IS NOT NULL
  GROUP BY sp.supplement_id
) subquery
WHERE sd.id = subquery.supplement_id
  AND sd.cost_per_day_eur IS NULL;
```

---

## Schritt 2: Manuelle Schaetzungen (19 Supplements)

Diese Supplements haben keine verlinkten Produkte und bekommen realistische Schaetzwerte:

| Supplement | Geschaetzter Preis | Begruendung |
|------------|-------------------|-------------|
| Alpha-Ketoglutarat (AKG) | 0.80 EUR | Aehnlich Ca-AKG |
| CaAKG | 1.50 EUR | Rejuvant Premium |
| Astaxanthin + Coenzym Q10 | 0.70 EUR | Kombi-Praeparat |
| Methylenblau 1% | 0.30 EUR | Tropfen sehr ergiebig |
| HMB 3000 | 0.50 EUR | Sport-Supplement |
| Turkesterone Max | 0.80 EUR | Premium-Preis |
| Vitamin B Komplex | 0.25 EUR | Standard B-Komplex |
| Vitamin D Balance | 0.15 EUR | Aehnlich D3 |
| Vitamin D3 + K2 Tropfen | 0.10 EUR | Tropfen guenstig |
| Magnesiumcitrat | 0.20 EUR | Budget-Magnesium |
| Magnesium Komplex 11 | 0.45 EUR | Premium-Komplex |
| Eisen + Vitamin C | 0.15 EUR | Kombi guenstig |
| Pinienrinden Extrakt | 0.35 EUR | Pycnogenol-Preis |
| Nootropic | 0.60 EUR | Stack-Produkt |
| Pre-Workout Komplex | 0.50 EUR | Sport-Durchschnitt |
| Protein Pulver | 0.80 EUR | 30g Serving |
| Probiona Kulturen | 0.40 EUR | Premium Probiotika |
| Schwarzkuemmeloel 1000 | 0.25 EUR | Kapseln |
| Beauty | 0.50 EUR | Kombipraeparat |

### SQL fuer manuelle Werte

```sql
UPDATE supplement_database
SET cost_per_day_eur = CASE name
  WHEN 'Alpha-Ketoglutarat (AKG)' THEN 0.80
  WHEN 'CaAKG' THEN 1.50
  WHEN 'Astaxanthin + Coenzym Q10' THEN 0.70
  WHEN 'Methylenblau 1%' THEN 0.30
  WHEN 'HMB 3000' THEN 0.50
  WHEN 'Turkesterone Max' THEN 0.80
  WHEN 'Vitamin B Komplex (hochdosiert)' THEN 0.25
  WHEN 'Vitamin D Balance' THEN 0.15
  WHEN 'Vitamin D3 + K2 MK7 Tropfen' THEN 0.10
  WHEN 'Magnesiumcitrat' THEN 0.20
  WHEN 'Magnesium Komplex 11 Ultra' THEN 0.45
  WHEN 'Eisen + Vitamin C' THEN 0.15
  WHEN 'Pinienrinden Extrakt' THEN 0.35
  WHEN 'Nootropic' THEN 0.60
  WHEN 'Pre-Workout Komplex' THEN 0.50
  WHEN 'Protein Pulver' THEN 0.80
  WHEN 'Probiona Kulturen Komplex' THEN 0.40
  WHEN 'Schwarzkümmelöl 1000' THEN 0.25
  WHEN 'Beauty' THEN 0.50
END
WHERE cost_per_day_eur IS NULL
  AND name IN (
    'Alpha-Ketoglutarat (AKG)', 'CaAKG', 'Astaxanthin + Coenzym Q10',
    'Methylenblau 1%', 'HMB 3000', 'Turkesterone Max',
    'Vitamin B Komplex (hochdosiert)', 'Vitamin D Balance',
    'Vitamin D3 + K2 MK7 Tropfen', 'Magnesiumcitrat',
    'Magnesium Komplex 11 Ultra', 'Eisen + Vitamin C',
    'Pinienrinden Extrakt', 'Nootropic', 'Pre-Workout Komplex',
    'Protein Pulver', 'Probiona Kulturen Komplex',
    'Schwarzkümmelöl 1000', 'Beauty'
  );
```

---

## Erwartetes Ergebnis

| Metrik | Vorher | Nachher |
|--------|--------|---------|
| Supplements ohne cost_per_day_eur | 73 | 0 |
| Supplements mit Preisdaten | 38 | 111 (100%) |

Nach der Migration werden alle Protocol-Bundles (Morning, Noon, etc.) korrekte Tageskosten anzeigen.

---

## Technische Details

- Beide Updates werden als eine Migration ausgefuehrt
- Keine Schema-Aenderungen noetig (cost_per_day_eur existiert bereits)
- UI zeigt sofort korrekte Summen in den Protocol Cards
