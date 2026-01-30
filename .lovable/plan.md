

# Duplikat-Bereinigung: Korrigierte Liste

## Problem identifiziert

Die ursprüngliche Lösch-Liste enthielt **falsche Produktnamen**. Die Admin-Seite suchte nach Namen wie "Omega-3 1000mg", aber die echten Duplikate haben andere Namen.

## Echte Duplikate gefunden

Nach Analyse der Datenbank hier die **tatsächlichen Duplikat-Paare** (eines behalten, eines löschen):

### ESN (2 Duplikate)
| Behalten | Löschen (ID) |
|----------|--------------|
| Ultrapure Creatine Monohydrate | Ultrapure Creatine Monohydrat (`595c3827-b1cd-4428-a359-16098c1f308e`) |

### Doppelherz (2 Duplikate)
| Behalten | Löschen (ID) |
|----------|--------------|
| Vitamin D3 2000 I.E. | Vitamin D3 2000 IE 60 Tabs (`8eee61c9-8ffb-448f-bf2a-ce779d270944`) |

### MoleQlar NMN (2 Duplikate)
| Behalten | Löschen (ID) |
|----------|--------------|
| NMN Uthever Kapseln 60 Stück | NMN Pur 250mg (`e82f8180-1b4a-41ac-9a0b-6be82a83367b`) |
| NMN Uthever Pulver 60g | NMN 500mg (`962d1dea-6007-4b48-aa6b-d4b7b77db3cf`) |

### MoleQlar Spermidin (1 Duplikat)
| Behalten | Löschen (ID) |
|----------|--------------|
| Spermidin Pur 3mg | Spermidin (`efdaa869-801a-4674-a416-b3b326f80343`) |

### Naturtreu (2 Duplikate)
| Behalten | Löschen (ID) |
|----------|--------------|
| Darmfreund Probiotika 20 Stämme | Darmfreund Probiotika (`47071656-cbc3-43a4-9bed-02925ce7baa3`) |
| Darmfreund Probiotika Kulturen | (einer der anderen) |

### Orthomol (11+ Duplikate - Paare)
| Behalten | Löschen (ID) |
|----------|--------------|
| Orthomol Immun | Orthomol Immun 30 Tagesportionen (`c248e42c-fdae-4194-8f1b-d28c9359df4c`) |
| Orthomol Arthroplus | Orthomol Arthroplus 30 Portions (`8cf916b1-fdf3-411b-8ebe-35e7003326aa`) |
| Orthomol Beauty | Orthomol Beauty 30 Trinkfläschchen (`b900c084-556e-4b91-aeff-b54e9de1d7f0`) |
| Orthomol Cardio | Orthomol Cardio 30 Beutel (`05fec0f0-bfd8-441c-8c4a-4ba5e45c35cb`) |
| Orthomol Mental 30 Caps | Orthomol Mental 30 Portions (`7e62b477-34a3-4216-ace0-2e7c251d3518`) |
| Orthomol Osteo | Orthomol Osteo 30 Portions (`9bdbc344-46ed-4391-9b2e-b745ca16eb90`) |
| Orthomol Sport | Orthomol Sport 30 Trinkfläschchen+Tabs (`a8be0def-d8c0-4802-86a7-96d1e14822ae`) |
| Orthomol Tendo | Orthomol Tendo 30 Granulat (`0a6f1366-1bb2-45b4-918a-b77540d7bcc9`) |
| Orthomol Vital f (Frauen) | Orthomol Vital f 30 Granulat+Kapseln (`8da03c33-6593-4d06-96cf-c306934eb14c`) |
| Orthomol Vital m (Männer) | Orthomol Vital m 30 Granulat+Kapseln (`8de1d522-ad26-4cf8-b39d-9fe715d70540`) |

### Sunday Natural (2 Duplikate)
| Behalten | Löschen (ID) |
|----------|--------------|
| Omega-3 Algenöl Vegan DHA+EPA | Omega-3 Algenöl (`0aa7ed83-5095-4d34-a9a0-9b7f4ac81022`) |
| Vitamin D3 + K2 Depot Tropfen | Vitamin D3+K2 Tropfen (`9990e599-1f3b-439a-a716-84f8c65af3f4`) |

### ProFuel (3 Duplikate)
| Behalten | Löschen (ID) |
|----------|--------------|
| Omega 3 vegan DHA+EPA | Omega-3 Algenöl 90 Caps (`f066ea49-0a64-4835-a526-c21313dccdd5`) |
| Vegan Vitamin D3 | Vitamin D3 + K2 vegan (`1a77b854-7a32-4c4a-82b8-40a409c69b69`) |

## Loesung

Die Admin-Seite `/admin/import-csv` muss mit den **korrekten IDs** aktualisiert werden statt Produktnamen zu suchen.

### Dateien die geaendert werden

| Datei | Aenderung |
|-------|-----------|
| `src/pages/AdminImportCSVPage.tsx` | Lösch-Liste durch exakte IDs ersetzen |

### Neue Lösch-Logik

Statt nach Namen zu suchen, werden die Duplikate direkt per UUID gelöscht:

```typescript
const DUPLICATE_IDS_TO_DELETE = [
  // ESN
  '595c3827-b1cd-4428-a359-16098c1f308e', // Ultrapure Creatine Monohydrat
  // Doppelherz
  '8eee61c9-8ffb-448f-bf2a-ce779d270944', // Vitamin D3 2000 IE 60 Tabs
  // MoleQlar NMN
  'e82f8180-1b4a-41ac-9a0b-6be82a83367b', // NMN Pur 250mg
  '962d1dea-6007-4b48-aa6b-d4b7b77db3cf', // NMN 500mg
  // MoleQlar Spermidin
  'efdaa869-801a-4674-a416-b3b326f80343', // Spermidin
  // Naturtreu
  '47071656-cbc3-43a4-9bed-02925ce7baa3', // Darmfreund Probiotika
  // Orthomol (10)
  'c248e42c-fdae-4194-8f1b-d28c9359df4c', // Immun 30 Tagesportionen
  '8cf916b1-fdf3-411b-8ebe-35e7003326aa', // Arthroplus 30 Portions
  'b900c084-556e-4b91-aeff-b54e9de1d7f0', // Beauty 30 Trinkfläschchen
  '05fec0f0-bfd8-441c-8c4a-4ba5e45c35cb', // Cardio 30 Beutel
  '7e62b477-34a3-4216-ace0-2e7c251d3518', // Mental 30 Portions
  '9bdbc344-46ed-4391-9b2e-b745ca16eb90', // Osteo 30 Portions
  'a8be0def-d8c0-4802-86a7-96d1e14822ae', // Sport 30 Trinkfläschchen
  '0a6f1366-1bb2-45b4-918a-b77540d7bcc9', // Tendo 30 Granulat
  '8da03c33-6593-4d06-96cf-c306934eb14c', // Vital f 30 Granulat
  '8de1d522-ad26-4cf8-b39d-9fe715d70540', // Vital m 30 Granulat
  // Sunday Natural
  '0aa7ed83-5095-4d34-a9a0-9b7f4ac81022', // Omega-3 Algenöl
  '9990e599-1f3b-439a-a716-84f8c65af3f4', // Vitamin D3+K2 Tropfen
  // ProFuel
  'f066ea49-0a64-4835-a526-c21313dccdd5', // Omega-3 Algenöl 90 Caps
  '1a77b854-7a32-4c4a-82b8-40a409c69b69', // Vitamin D3 + K2 vegan
];
// Total: 22 Duplikate (weniger als ursprünglich 37, da manche nicht existierten)
```

## Erwartetes Ergebnis

- **Vorher:** 877 Produkte
- **Nachher:** 877 - 22 = **855 Produkte** (alle unique)

