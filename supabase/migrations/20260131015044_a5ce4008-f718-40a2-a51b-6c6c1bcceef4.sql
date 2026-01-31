-- Part 1: Calculate impact_score_big8 for 175 products missing it
UPDATE supplement_products
SET impact_score_big8 = ROUND(
  (COALESCE(quality_bioavailability, 7.0) +
   COALESCE(quality_purity, 7.0) +
   COALESCE(quality_value, 7.0) +
   COALESCE(quality_dosage, 7.0) +
   COALESCE(quality_research, 7.0) +
   COALESCE(quality_transparency, 7.0) +
   COALESCE(quality_form, 7.0) +
   COALESCE(quality_synergy, 7.0)) / 8,
  2
)
WHERE is_deprecated = false
  AND impact_score_big8 IS NULL;

-- Part 2: Link products to supplement_database via keyword matching
-- This uses comprehensive pattern matching for German/English variants
WITH matches AS (
  SELECT DISTINCT ON (sp.id)
    sp.id as product_id,
    sd.id as supplement_id,
    sd.name as supplement_name
  FROM supplement_products sp
  CROSS JOIN supplement_database sd
  WHERE sp.is_deprecated = false 
    AND sp.supplement_id IS NULL
    AND (
      -- Direct name matches (German supplement names)
      LOWER(sp.product_name) LIKE '%' || LOWER(sd.name) || '%'
      
      -- Creatin variants
      OR (sd.name = 'Creatin' AND (
        sp.product_name ILIKE '%kreatin%' 
        OR sp.product_name ILIKE '%creatine%'
        OR sp.product_name ILIKE '%creatin mono%'
      ))
      
      -- Selen
      OR (sd.name = 'Selen' AND sp.product_name ILIKE '%selen%')
      
      -- B-Komplex
      OR (sd.name = 'Vitamin B-Komplex' AND (
        sp.product_name ILIKE '%b-komplex%' 
        OR sp.product_name ILIKE '%b-complex%'
        OR sp.product_name ILIKE '%vitamin b komplex%'
      ))
      
      -- MSM
      OR (sd.name = 'MSM' AND sp.product_name ILIKE '%msm%')
      
      -- Alpha Liponsäure
      OR (sd.name = 'Alpha-Liponsäure' AND (
        sp.product_name ILIKE '%alpha lipon%'
        OR sp.product_name ILIKE '%alpha-lipon%'
        OR sp.product_name ILIKE '%r-liponsäure%'
        OR sp.product_name ILIKE '%r-lipoic%'
      ))
      
      -- Reishi
      OR (sd.name = 'Reishi' AND sp.product_name ILIKE '%reishi%')
      
      -- Glucosamin
      OR (sd.name = 'Glucosamin' AND sp.product_name ILIKE '%glucosamin%')
      
      -- Folat/Folsäure
      OR (sd.name = 'Methyl Folate' AND (
        sp.product_name ILIKE '%folat%'
        OR sp.product_name ILIKE '%folsäure%'
        OR sp.product_name ILIKE '%folic%'
      ))
      
      -- Cordyceps
      OR (sd.name = 'Cordyceps' AND sp.product_name ILIKE '%cordyceps%')
      
      -- Rhodiola
      OR (sd.name = 'Rhodiola' AND (
        sp.product_name ILIKE '%rhodiola%'
        OR sp.product_name ILIKE '%rosenwurz%'
      ))
      
      -- Boswellia/Weihrauch
      OR (sd.name = 'Weihrauch' AND (
        sp.product_name ILIKE '%boswellia%'
        OR sp.product_name ILIKE '%weihrauch%'
      ))
      
      -- L-Carnitin
      OR (sd.name = 'L-Carnitin' AND (
        sp.product_name ILIKE '%l-carnitin%'
        OR sp.product_name ILIKE '%carnitin%'
        OR sp.product_name ILIKE '%acetyl-l-carnitin%'
      ))
      
      -- CoQ10/Ubiquinol
      OR (sd.name = 'CoQ10 Ubiquinol' AND (
        sp.product_name ILIKE '%coq10%'
        OR sp.product_name ILIKE '%ubiquinol%'
        OR sp.product_name ILIKE '%coenzym q10%'
      ))
      
      -- Hyaluron
      OR (sd.name = 'Hyaluron & Kollagen' AND (
        sp.product_name ILIKE '%hyaluron%'
      ))
      
      -- TMG/Betain
      OR (sd.name = 'TMG' AND (
        sp.product_name ILIKE '%tmg%'
        OR sp.product_name ILIKE '%betain%'
      ))
      
      -- NAC
      OR (sd.name = 'NAC' AND sp.product_name ILIKE '%n-acetyl%cystei%')
      
      -- 5-HTP
      OR (sd.name = '5-HTP' AND sp.product_name ILIKE '%5-htp%')
      
      -- Quercetin
      OR (sd.name = 'Quercetin' AND sp.product_name ILIKE '%quercetin%')
      
      -- Probiotika
      OR (sd.name = 'Probiona Kulturen Komplex' AND (
        sp.product_name ILIKE '%probio%'
        OR sp.product_name ILIKE '%lactobac%'
      ))
      
      -- Lions Mane
      OR (sd.name = 'Lions Mane' AND (
        sp.product_name ILIKE '%lions mane%'
        OR sp.product_name ILIKE '%lion''s mane%'
        OR sp.product_name ILIKE '%hericium%'
      ))
      
      -- Ashwagandha
      OR (sd.name IN ('Ashwagandha', 'Ashwagandha KSM-66') AND (
        sp.product_name ILIKE '%ashwagandha%'
        OR sp.product_name ILIKE '%ksm-66%'
        OR sp.product_name ILIKE '%withania%'
      ))
      
      -- NMN
      OR (sd.name IN ('NMN', 'NMN (Nicotinamid Mononukleotid)', 'NMN sublingual') AND (
        sp.product_name ILIKE '%nmn%'
        OR sp.product_name ILIKE '%nicotinamid mono%'
      ))
      
      -- Resveratrol
      OR (sd.name = 'Trans-Resveratrol' AND (
        sp.product_name ILIKE '%resveratrol%'
      ))
      
      -- Vitamin D3
      OR (sd.name = 'Vitamin D3' AND (
        sp.product_name ILIKE '%vitamin d3%'
        OR sp.product_name ILIKE '%vitamin d 3%'
      ))
      
      -- Vitamin K2
      OR (sd.name = 'Vitamin K2' AND sp.product_name ILIKE '%vitamin k2%')
      
      -- Omega-3
      OR (sd.name IN ('Omega-3', 'Omega-3 (EPA/DHA)') AND (
        sp.product_name ILIKE '%omega-3%'
        OR sp.product_name ILIKE '%omega 3%'
        OR sp.product_name ILIKE '%fischöl%'
        OR sp.product_name ILIKE '%fish oil%'
        OR sp.product_name ILIKE '%epa%dha%'
      ))
      
      -- Magnesium variants
      OR (sd.name IN ('Magnesium', 'Magnesium Glycinat', 'Magnesiumcitrat') AND (
        sp.product_name ILIKE '%magnesium%'
      ))
      
      -- Zink
      OR (sd.name = 'Zink' AND sp.product_name ILIKE '%zink%')
      
      -- Curcumin/Kurkuma
      OR (sd.name IN ('Curcumin', 'Curcumin Longvida') AND (
        sp.product_name ILIKE '%curcumin%'
        OR sp.product_name ILIKE '%kurkuma%'
        OR sp.product_name ILIKE '%turmeric%'
      ))
      
      -- Spirulina
      OR (sd.name = 'Spirulina' AND sp.product_name ILIKE '%spirulina%')
      
      -- Chlorella
      OR (sd.name = 'Chlorella' AND sp.product_name ILIKE '%chlorella%')
      
      -- Taurin
      OR (sd.name = 'Taurin' AND sp.product_name ILIKE '%taurin%')
      
      -- Glycin
      OR (sd.name = 'Glycin' AND sp.product_name ILIKE '%glycin%')
      
      -- L-Theanin
      OR (sd.name = 'L-Theanin' AND sp.product_name ILIKE '%theanin%')
      
      -- GABA
      OR (sd.name = 'GABA' AND sp.product_name ILIKE '%gaba%')
      
      -- Melatonin
      OR (sd.name = 'Melatonin' AND sp.product_name ILIKE '%melatonin%')
      
      -- Kollagen
      OR (sd.name IN ('Kollagen', 'Kollagen Peptide') AND (
        sp.product_name ILIKE '%kollagen%'
        OR sp.product_name ILIKE '%collagen%'
      ))
      
      -- OPC
      OR (sd.name = 'OPC' AND sp.product_name ILIKE '%opc%')
      
      -- Grüntee Extrakt
      OR (sd.name = 'Grüntee Extrakt' AND (
        sp.product_name ILIKE '%grüntee%'
        OR sp.product_name ILIKE '%green tea%'
        OR sp.product_name ILIKE '%egcg%'
      ))
      
      -- Berberin
      OR (sd.name = 'Berberin' AND sp.product_name ILIKE '%berberin%')
      
      -- Fisetin
      OR (sd.name = 'Fisetin' AND sp.product_name ILIKE '%fisetin%')
      
      -- Spermidin
      OR (sd.name = 'Spermidin' AND sp.product_name ILIKE '%spermidin%')
      
      -- Apigenin
      OR (sd.name = 'Apigenin' AND sp.product_name ILIKE '%apigenin%')
    )
  ORDER BY sp.id, sd.name
)
UPDATE supplement_products sp
SET supplement_id = m.supplement_id
FROM matches m
WHERE sp.id = m.product_id;