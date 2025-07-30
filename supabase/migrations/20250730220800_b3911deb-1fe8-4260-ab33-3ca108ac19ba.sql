-- Add Natty Wolverine Stack knowledge to Lucy's RAG database
INSERT INTO public.coach_knowledge_base (
  coach_id,
  title,
  content,
  knowledge_type,
  expertise_area,
  tags,
  priority_level
) VALUES 
(
  'lucy',
  'Natty Wolverine Stack - Supplement-Tabelle',
  'Natty Wolverine Stack – Supplement-Tabelle

Name | Wirkung | Status | Bemerkung
--- | --- | --- | ---
Cissus Quadrangularis | Knochen-, Sehnen-, Bänderheilung; Angiogenese; erhöhte Vaskularität | Legal / pflanzlich | Auch als "Bone Setter" bekannt; stark durchblutungsfördernd
L-Glutamin | Möglicher kurzfristiger HGH-Anstieg; Heilungsförderung | Legal / Aminosäure | Effekt evtl. stärker bei Fasten oder bei Trainingspausen
Trimethylglycin (TMG / Betain) | Methylierung, evtl. HGH- & IGF-1-Steigerung | Legal / natürlicher Metabolit | Mit B6, B12 und Folat kombinieren für optimale Methylierung
UC-II (undenaturiertes Kollagen Typ 2) | Knorpel- und Gelenkregeneration | Legal / Nahrungsergänzung | Fokus auf Typ 2 für Knorpel; andere Typen möglich ergänzend
Joint-Komplex (Glucosamin, Chondroitin, MSM, HA) | Gelenkschmierung & Basisregeneration | Legal / Standardpräparate | Optional, aber empfohlen zur Unterstützung der anderen Wirkstoffe

Einnahmeschema:
- Workout-Tage: Alle Bestandteile als Pulver/Kapseln gemixt direkt nach dem Training
- Restdays: Flexibel über den Tag verteilt',
  'supplement_protocol',
  'regeneration',
  ARRAY['supplements', 'regeneration', 'healing', 'wolverine stack', 'natural', 'legal'],
  2
),
(
  'lucy',
  'Natty Wolverine Stack - Detaillierte Analyse und Hintergrund',
  'Titel: Natty Wolverine Stack – Schnelle Regeneration mit legalen Mitteln

Kurzbeschreibung:
Ein Überblick über natürliche (legale) Alternativen zur schnelleren Heilung von Verletzungen, inspiriert vom sogenannten "Wolverine Stack", der ursprünglich auf BPC-157 und TB500 basiert, zwei mittlerweile verbotenen Peptiden.

Kernaussagen:
• BPC-157 & TB500:
– Frühere Athleten-Erfolge (z. B. Rückkehr nach Achillessehnenriss in 3–5 Monaten) weckten Spekulationen.
– Beide Peptide wurden 2022 von WADA verboten (S0-Kategorie).
– BPC-157: fördert Fibroblasten, Kollagenbildung, Angiogenese.
– TB500: synthetisches Derivat von Thymosin Beta-4, wirkt regenerativ & entzündungshemmend.

• Rechtslage & Kontroverse:
– Nicht zugelassen für den menschlichen Gebrauch (nur Laborzwecke).
– Trotzdem verbreitet in der „Research Chemicals"-Szene.
– Viele „Gym Bros" experimentieren eigenständig, obwohl keine offizielle Zulassung besteht.

Natty Wolverine Stack (legal):
1. Cissus Quadrangularis
– Pflanze, bekannt als „Bone Setter".
– Mögliche Unterstützung bei Knochen-, Sehnen- und Bänderverletzungen.
– Starke Vaskularität als Nebeneffekt → evtl. verbesserte Durchblutung.

2. L-Glutamin
– Trotz Kritik (ausreichend über Nahrung gedeckt), wird es hier wegen möglichem kurzfristigem Anstieg des Wachstumshormons (HGH) eingesetzt.
– Ziel: Unterstützung der Heilung über erhöhte HGH-Level.

3. Trimethylglycin (TMG / Betain)
– Unterstützt Methylierung & evtl. IGF-1- und HGH-Produktion.
– Mögliche synergistische Wirkung mit Glutamin.
– Ergänzt bei Bedarf mit B6, B12 und Folat für optimale Funktion.

4. Undenaturiertes Kollagen Typ 2 (UC-II)
– Fokus auf Knorpel-, Gelenk- und Sehnenregeneration.
– Optional ergänzt durch andere Kollagentypen.

5. Joint-Komplex (optional, aber empfohlen):
– Kombination aus Glucosamin, Chondroitin, MSM, Hyaluronsäure.
– Ziel: Schmierung & Basisregeneration der Gelenke.

Weitere diskutierte Zusätze (noch nicht enthalten):
• Colostrum (Biestmilch): Potenzielle Heilungsbeschleunigung durch Wachstumsfaktoren.
• Deer Antler Velvet: Enthält angeblich IGF-1-artige Faktoren – spekulativ.
• Kurkuma: Wird wegen seiner entzündungshemmenden Wirkung nicht regelmäßig verwendet, da es ggf. Heilungsprozesse nach Training hemmen kann.

Fazit:
Spürbare Verbesserungen bei chronischen Verletzungen, weniger Muskelkater, bessere Regeneration. Die Formel wird als „Open Source" betrachtet – offen für Weiterentwicklung.',
  'protocol_analysis',
  'regeneration',
  ARRAY['regeneration', 'peptides', 'BPC-157', 'TB500', 'natural alternatives', 'healing', 'recovery'],
  1
);