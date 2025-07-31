-- Füge Makro-Verteilungsstrategien zur Knowledge Base hinzu
INSERT INTO coach_knowledge_base (
  topic, 
  subtopic, 
  title, 
  content, 
  knowledge_type, 
  source, 
  relevance_score,
  tags
) VALUES 
(
  'Ernährung',
  'Makronährstoff-Verteilung',
  'Optimale Makronährstoff-Verteilungsstrategien',
  '# Makronährstoff-Verteilungsstrategien

## Bewährte Verteilungsmodelle

### AMDR-Basis (DGE/WHO)
- **Kohlenhydrate**: 45-60%
- **Protein**: 15-25%
- **Fett**: 20-35%
- **Einsatz**: Gesunde Durchschnittsernährung
- **Vorteil**: Deckt Mikronährstoffe einfach ab

### Zone/Balanced
- **Kohlenhydrate**: 40%
- **Protein**: 30%
- **Fett**: 30%
- **Einsatz**: Recomp, Alltag, nichts Extremes
- **Vorteil**: Einfach zu merken, stabiler Blutzucker

### High-Protein
- **Kohlenhydrate**: 25-30%
- **Protein**: 35-45%
- **Fett**: 25-30%
- **Einsatz**: Muskelaufbau, Defizitdiäten
- **Vorteil**: Sättigt gut, schützt Muskulatur

### High-Carb
- **Kohlenhydrate**: 55-65%
- **Protein**: 15-20%
- **Fett**: 20-25%
- **Einsatz**: Ausdauersport, Volumen-Tage
- **Vorteil**: Schnell verfügbare Energie

### Low-Carb/Moderate
- **Kohlenhydrate**: 20-30%
- **Protein**: 30-40%
- **Fett**: 30-40%
- **Einsatz**: Fettverlust, Insulinempfindlichkeit
- **Hinweis**: Anfangs Wasserverlust, Elektrolyte im Blick

### Keto
- **Kohlenhydrate**: ≤ 10%
- **Protein**: 20-25%
- **Fett**: 70-75%
- **Einsatz**: Therapeutisch, Epilepsie, Keto-Fans
- **Hinweis**: Adaption 2-3 Wochen, Ballaststoffe schwierig

### Carb-Cycling
- **Verteilung**: Wechselt je nach Trainingstag
- **Einsatz**: Kraft-/HIIT-Athleten
- **Prinzip**: High-Carb an Trainingstagen, Low an Off-Days

## Praktische Faustregeln

1. **Protein zuerst klären**: 1,6-2,2 g/kg Ziel-KG für Muskelerhalt
2. **Carbs nach Aktivität**: Viel Volumen/Ausdauer → höhere Carbs
3. **Fett = Restgröße**: Mindestens 0,8 g/kg für Hormone
4. **Keep it simple**: Mit einem Modell starten, 2 Wochen tracken, dann ±5% justieren
5. **100% sind Pflicht**: Summe muss immer passen

## Praxis-Empfehlungen

### Trainingsphase
- 50% Kohlenhydrate / 30% Protein / 20% Fett

### Diätphase  
- 30% Kohlenhydrate / 40% Protein / 30% Fett

**Wechsel nur bei 2-3 Wochen Stagnation**',
  'scientific',
  'Ernährungswissenschaft - Makronährstoff-Optimierung 2024',
  95,
  ARRAY['makros', 'protein', 'kohlenhydrate', 'fett', 'diät', 'muskelaufbau', 'ernährung', 'verteilung']
);