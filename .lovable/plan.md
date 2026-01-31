

# Brand-Daten in Chips - IMPLEMENTIERT ✅

## Zusammenfassung

Die Brand-Daten werden jetzt persistent gespeichert und im Collapsed-Chip angezeigt.

## Umgesetzte Änderungen

### 1. Datenbank-Migration ✅
- Neue Spalte `selected_product_id` in `user_supplements` (UUID, FK zu `supplement_products`)

### 2. Types erweitert ✅
- `UserStackItem` Interface um `selected_product_id` und `selected_product` erweitert

### 3. Hook angepasst ✅
- `useUserStack` joined jetzt `supplement_products` + `supplement_brands` via `selected_product_id`
- `useUpdateSupplement` akzeptiert jetzt `selected_product_id` in den Updates

### 4. Chip UI ✅
- Collapsed-State zeigt Brand-Name nach Dosierung: `Vitamin B Komplex 1Kapsel · Nature Love`
- `selectedProduct` State wird aus persistierten Daten initialisiert
- `handleSave` speichert `selected_product_id` in die Datenbank

## Nutzung

1. Chip öffnen → Hersteller wählen → Speichern
2. Brand wird jetzt in `user_supplements.selected_product_id` gespeichert
3. Beim nächsten Laden wird die Brand automatisch angezeigt
