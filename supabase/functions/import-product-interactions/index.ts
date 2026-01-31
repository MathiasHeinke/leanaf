import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders, handleOptions, okJson, errJson } from "../_shared/cors.ts";

// Extracted synergy data from PDF
const SYNERGIES_DATA: Array<{ product: string; brand: string; synergies: string[] }> = [
  { product: "5-HTP 200mg", brand: "Natural Elements", synergies: ["b6", "magnesium"] },
  { product: "A-Z Complete Depot 40 Tabletten", brand: "Doppelherz", synergies: ["coq10", "omega 3", "probiotics"] },
  { product: "Acetyl-L-Carnitine 500mg 120 Kapseln", brand: "Doctor's Best", synergies: ["alpha lipoic", "coq10", "b vitamins"] },
  { product: "Alpha Lipoic Acid 600mg 120 Caps", brand: "Bulk", synergies: ["acetyl carnitine", "chromium", "coq10", "nac"] },
  { product: "Biogena Alpha Liponsaeure 200", brand: "Biogena", synergies: ["acetyl l carnitin", "uridine", "fish oil"] },
  { product: "Alpha-Ketoglutarat (Ca-AKG)", brand: "MoleQlar", synergies: ["nmn", "resveratrol", "glycine"] },
  { product: "Alpha-Liponsäure 300mg", brand: "Natural Elements", synergies: ["acetyl carnitine", "chromium", "coq10", "nac"] },
  { product: "Artischocken Extrakt", brand: "Nature Love", synergies: ["mariendistel", "nac", "glutathion"] },
  { product: "Shilajit Capsules - 1300mg per Daily Dos", brand: "Amazon Generic", synergies: ["l theanine", "magnesium", "rhodiola", "vit b complex", "zinc"] },
  { product: "Astaxanthin 12mg 60 Kapseln", brand: "MoleQlar", synergies: ["omega 3", "vitamin e", "coq10"] },
  { product: "Augen Vital 90 Kapseln", brand: "Doppelherz", synergies: ["coq10", "omega 3", "probiotics"] },
  { product: "B-Komplex + Folsäure 45 Tabletten", brand: "Doppelherz", synergies: ["magnesium", "zinc", "omega 3"] },
  { product: "Bacopa Monnieri 300mg 60 Caps", brand: "Sunday Natural", synergies: ["lions mane", "ginkgo", "phosphatidylserin"] },
  { product: "Baldrian + Hopfen", brand: "Nature Love", synergies: ["hopfen", "passionsblume", "melatonin"] },
  { product: "BCAA 2:1:1 500g", brand: "Bulk", synergies: ["creatine", "eaa", "glutamine", "whey protein"] },
  { product: "Orthomol Beauty 30 Trinkfläschchen", brand: "Orthomol", synergies: ["collagen", "copper", "iron", "magnesium", "msm", "quercetin", "vit a", "vit b6"] },
  { product: "BERBERIN HCL 500 mg in Vegetable Capsule", brand: "Amazon Generic", synergies: ["chrom", "alpha liponsaeure", "zimt"] },
  { product: "Biogena Immun 24 7", brand: "Biogena", synergies: ["citrulline", "creatine", "taurine"] },
  { product: "TMG Betaine 300g", brand: "ESN", synergies: ["b12", "folat", "cholin"] },
  { product: "Haar Intensiv", brand: "Doppelherz", synergies: ["zink", "b komplex"] },
  { product: "Rhodiola Rosea Capsules Rose Root Extract", brand: "Amazon Generic", synergies: ["vitamin d", "magnesium", "calcium"] },
  { product: "Biogena Weihrauch 400", brand: "Biogena", synergies: ["curcumin", "omega 3", "msm"] },
  { product: "CaAKG Pulver", brand: "MoleQlar", synergies: ["collagen", "probiotics", "vit d3", "zinc"] },
  { product: "Calcium 1000 + D3 + K2 30 Tabletten", brand: "Doppelherz", synergies: ["magnesium", "omega 3", "vit k2", "zinc"] },
  { product: "Carnosin Pulver 30g", brand: "MoleQlar", synergies: ["beta alanin", "histidin"] },
  { product: "Casein Micellar", brand: "ESN", synergies: ["whey", "kreatin"] },
  { product: "Chlorella Bio", brand: "Natural Elements", synergies: ["fiber", "folate", "glutamine", "vit b12", "vit c", "vit d3", "zinc"] },
  { product: "Phosphatidylcholine from soy lecithin", brand: "Amazon Generic", synergies: ["alpha gpc", "uridine", "omega 3"] },
  { product: "Glucosamin + Chondroitin", brand: "ESN", synergies: ["glucosamin", "msm", "kollagen"] },
  { product: "Biogena Chrom 200", brand: "Biogena", synergies: ["berberin", "zimt", "alpha liponsäure"] },
  { product: "Bergamot Extract", brand: "Doctor's Best", synergies: ["alpha lipoic", "magnesium", "omega 3", "pqq", "vit e"] },
  { product: "Premium Coenzyme Q10 Ubiquinol - 60 CoQ1", brand: "Amazon Generic", synergies: ["pqq", "alpha liponsäure", "carnitin"] },
  { product: "Ubiquinol Coq10 100 Mg Vegan", brand: "Biogena", synergies: ["alpha lipoic", "magnesium", "omega 3", "pqq", "vit e"] },
  { product: "Biogena Cordyceps C", brand: "Biogena", synergies: ["ashwagandha", "rhodiola", "lions mane"] },
  { product: "Creatine Monohydrate Powder", brand: "Bulk", synergies: ["bcaa", "beta alanine", "eaa", "hmb", "whey protein"] },
  { product: "Turmeric Curcumin 500mg 180 Caps", brand: "Bulk", synergies: ["boswellia", "omega 3", "piperine", "quercetin", "resveratrol"] },
  { product: "DIM 200mg 60 Kapseln", brand: "Sunday Natural", synergies: ["copper", "magnesium", "vit a", "vit b6", "vit c"] },
  { product: "Essential Amino Acids", brand: "Bulk", synergies: ["whey", "kreatin", "citrullin"] },
  { product: "Eisen + Vitamin C + Histidin 30 Tablette", brand: "Doppelherz", synergies: ["collagen", "folate", "quercetin", "vit b12", "vit e", "zinc"] },
  { product: "Biogena Osteo Calbon Komplex Gold", brand: "Biogena", synergies: ["magnesium", "kalium", "natrium"] },
  { product: "Bio-Fisetin 30 Vcaps", brand: "Life Extension", synergies: ["bromelain", "coq10", "curcumin", "nac", "vit c", "zinc"] },
  { product: "Flohsamenschalen Bio", brand: "Nature Love", synergies: ["probiotics", "wasser"] },
  { product: "Folsäure 800mcg", brand: "Gloryfeel", synergies: ["b12", "b6", "betain"] },
  { product: "Orthomol Femin 60 Kapseln", brand: "Orthomol", synergies: ["iron", "magnesium", "omega 3", "vit b12", "vit b6", "vit c", "vit k2", "zinc"] },
  { product: "GABA 500mg", brand: "MoleQlar", synergies: ["l theanine", "magnesium", "melatonin"] },
  { product: "Glucosamin 1200 30 Kapseln", brand: "Doppelherz", synergies: ["chondroitin", "collagen", "msm", "omega 3"] },
  { product: "Ginkgo Biloba Extrakt 6000mg", brand: "Nature Love", synergies: ["bacopa", "phosphatidylserin", "omega 3"] },
  { product: "Ginseng Panax", brand: "Natural Elements", synergies: ["ashwagandha", "rhodiola", "ginkgo"] },
  { product: "Knorpelschutz", brand: "Naturtreu", synergies: ["chondroitin", "msm", "kollagen"] },
  { product: "L-Glutathion Reduced Capsules 250 mg Pac", brand: "Amazon Generic", synergies: ["nac", "vitamin c", "alpha liponsäure"] },
  { product: "NAC N-Acetyl-cystein", brand: "Sunday Natural", synergies: ["alpha lipoic", "glycine", "quercetin", "selenium", "vit c"] },
  { product: "Glycine 1000mg 120 Vegan High Dose Capsu", brand: "Amazon Generic", synergies: ["magnesium", "nac", "kollagen"] },
  { product: "GlyNAC Glycin + NAC 120 Kapseln", brand: "MoleQlar", synergies: ["alpha lipoic", "glycine", "quercetin", "selenium", "vit c"] },
  { product: "Grüner Tee EGCG 98%", brand: "Nature Love", synergies: ["ashwagandha", "gaba", "magnesium", "tyrosine", "vit b complex"] },
  { product: "Orthomol Hair Intense 60 Kapseln", brand: "Orthomol", synergies: ["collagen", "iron", "magnesium", "omega 3", "vit a", "vit b6", "vit c"] },
  { product: "Lion's Mane Extrakt", brand: "ProFuel", synergies: ["lions mane", "niacin", "bacopa"] },
  { product: "Immunschild Holunder", brand: "Naturtreu", synergies: ["vitamin c", "zink"] },
  { product: "Huperzine A 200mcg 60 Kapseln", brand: "Now Foods", synergies: ["alpha gpc", "bacopa"] },
  { product: "Biogena Arthro Formula 4 Gold", brand: "Biogena", synergies: ["kollagen", "vitamin c", "msm"] },
  { product: "Wärmewunder Ingwer", brand: "Naturtreu", synergies: ["curcumin", "omega 3"] },
  { product: "Inositol Pulver", brand: "MoleQlar", synergies: ["folat", "cholin", "b komplex"] },
  { product: "Darmflora Inulin", brand: "Naturtreu", synergies: ["probiotics", "flohsamen"] },
  { product: "Jod aus Bio-Kelp", brand: "Natural Elements", synergies: ["selen", "tyrosin"] },
  { product: "Caffeine Caps", brand: "ESN", synergies: ["l theanine", "tyrosin", "vit b komplex"] },
  { product: "Marine Collagen Peptides, 10,000 mg Per", brand: "Amazon Generic", synergies: ["vitamin c", "hyaluronsaeure", "msm"] },
  { product: "Creatine Monohydrate 1kg", brand: "Bulk", synergies: ["beta alanin", "hmb", "whey"] },
  { product: "Krill Öl Premium", brand: "MoleQlar", synergies: ["vitamin d", "astaxanthin"] },
  { product: "Biogena L Arginin 600", brand: "Biogena", synergies: ["citrulline", "vit c", "zinc"] },
  { product: "Biogena L Carnipur 500", brand: "Biogena", synergies: ["coq10", "alpha liponsaeure", "omega 3"] },
  { product: "Citrulline Malate 500g", brand: "Bulk", synergies: ["arginin", "beta alanin", "kreatin"] },
  { product: "L-Glutamine 750 mg 180 Capsules High Dos", brand: "Amazon Generic", synergies: ["zink", "probiotics"] },
  { product: "L-Lysin 1000mg", brand: "Nature Love", synergies: ["vitamin c", "zink"] },
  { product: "L-Theanine Suntheanine 150mg 90 Vcaps", brand: "Doctor's Best", synergies: ["ashwagandha", "caffeine", "gaba", "magnesium"] },
  { product: "L-Tryptophan 500mg", brand: "Nature Love", synergies: ["b6", "magnesium", "zink"] },
  { product: "L-Tyrosine Powder 250g", brand: "Bulk", synergies: ["b6", "jod", "vitamin c"] },
  { product: "Lions Mane Bio", brand: "Natural Elements", synergies: ["alpha gpc", "bacopa", "omega 3", "vit b12"] },
  { product: "Trans-Resveratrol Pulver", brand: "MoleQlar", synergies: ["coq10", "curcumin", "nac", "quercetin"] },
  { product: "Lithiumorotat 5mg 60 Kapseln", brand: "MoleQlar", synergies: ["omega 3", "b komplex"] },
  { product: "MoleQlar ONE Daily Longevity", brand: "MoleQlar", synergies: ["omega 3", "vitamin d"] },
  { product: "Maca Bio", brand: "Nature Love", synergies: ["ashwagandha", "tribulus", "zink"] },
  { product: "Biogena Magnesium 150", brand: "Biogena", synergies: ["potassium", "taurine", "vit b6", "vit b complex", "vit d3", "zinc"] },
  { product: "Maitake Bio Extrakt", brand: "Sunday Natural", synergies: ["reishi", "shiitake", "vitamin d"] },
  { product: "Mariendistel 80% Silymarin", brand: "Natural Elements", synergies: ["nac", "artischocke", "alpha liponsäure"] },
  { product: "MCT Öl C8", brand: "ESN", synergies: ["koffein", "collagen"] },
  { product: "Biogena Melatonin Tropfen", brand: "Biogena", synergies: ["gaba", "glycine", "l theanine", "magnesium", "vit b6"] },
  { product: "Optimsm 1000 mg capsules", brand: "Amazon Generic", synergies: ["glucosamin", "vitamin c", "kollagen"] },
  { product: "Biogena Ester C Gold", brand: "Biogena", synergies: ["tyrosin", "b6", "zink"] },
  { product: "A-Z + Omega-3 All-in-One 60", brand: "Doppelherz", synergies: ["omega 3", "magnesium"] },
  { product: "Biogena Nac 350", brand: "Biogena", synergies: ["alpha lipoic", "glycine", "quercetin", "selenium", "vit c"] },
  { product: "NAD+ Cell Regenerator 300mg 30 Vcaps", brand: "Life Extension", synergies: ["resveratrol", "quercetin", "coq10"] },
  { product: "NR Niagen® 90 Kapseln", brand: "MoleQlar", synergies: ["resveratrol", "pterostilben", "tmg"] },
  { product: "Biogena Nadh 20 Superior M S", brand: "Biogena", synergies: ["alpha lipoic", "coq10", "curcumin", "glycine", "quercetin", "selenium", "vit c"] },
  { product: "Uthever NMN Pulver 100g", brand: "MoleQlar", synergies: ["resveratrol", "tmg", "quercetin"] },
  { product: "NMNH 1000mg - 120 Vegan Capsules, NAD+ A", brand: "Amazon Generic", synergies: ["alpha lipoic", "curcumin", "magnesium", "nac", "omega 3", "pqq", "quercetin", "vit e"] },
  { product: "Orthomol Mental 30 Portions", brand: "Orthomol", synergies: ["iron", "vit b6", "vit b complex", "vit c"] },
  { product: "Biogena Marines Omega 3 Liquid", brand: "Biogena", synergies: ["vitamin e", "curcumin", "astaxanthin"] },
  { product: "Omega 3 Vegan Algenöl", brand: "Natural Elements", synergies: ["vitamin e", "curcumin", "astaxanthin"] },
  { product: "Orthomol Arthroplus", brand: "Orthomol", synergies: ["omega 3"] },
  { product: "NOW Foods - Phosphatidyles Serine Cognit", brand: "Now Foods", synergies: ["omega 3", "ginkgo", "bacopa"] },
  { product: "Biogena Sports Mito Energy Spray", brand: "Biogena", synergies: ["omega 3", "pqq", "vit e"] },
  { product: "Crea-Stack Pre-Workout", brand: "ESN", synergies: ["kreatin", "beta alanin", "citrullin"] },
  { product: "Biogena Prosta Caps", brand: "Biogena", synergies: ["fiber", "glutamine", "vit d3", "zinc"] },
  { product: "Präbiotika Komplex", brand: "MoleQlar", synergies: ["probiotics", "glutamin"] },
  { product: "Pterostilben 50mg", brand: "MoleQlar", synergies: ["resveratrol", "nad booster", "quercetin"] },
  { product: "Quercefit™ 60 Capsules Vegan D", brand: "Amazon Generic", synergies: ["vitamin c", "resveratrol", "bromelain"] },
  { product: "Biogena Reishi C", brand: "Biogena", synergies: ["lions mane", "cordyceps", "ashwagandha"] },
  { product: "Biogena Same 200", brand: "Biogena", synergies: ["coq10", "curcumin", "nac", "quercetin"] },
  { product: "Rhodiola Rosea 500mg", brand: "MoleQlar", synergies: ["ashwagandha", "cordyceps", "ginseng"] },
  { product: "Orthomol Nemuri night 30 Sachets", brand: "Orthomol", synergies: ["gaba", "l theanine", "potassium", "taurine", "vit b6", "vit b complex", "vit d3", "zinc"] },
  { product: "Schwarzes Gold", brand: "Naturtreu", synergies: ["omega 3", "vitamin d"] },
  { product: "Selen 100μg 60 Tabs", brand: "Doppelherz", synergies: ["jod", "vitamin e", "zink"] },
  { product: "Shiitake Bio Extrakt", brand: "Sunday Natural", synergies: ["reishi", "maitake", "vitamin d"] },
  { product: "6mg Spermidin + Vitamin C+B12 (180 Kapseln)", brand: "Amazon Generic", synergies: ["resveratrol", "nad booster", "quercetin"] },
  { product: "Spirulina Bio", brand: "Natural Elements", synergies: ["fiber", "folate", "glutamine", "vit b12", "vit c", "vit d3", "zinc"] },
  { product: "Orthomol Sport 30 Trinkfläschchen+Tabs", brand: "Orthomol", synergies: ["alpha lipoic", "copper", "iron", "omega 3", "potassium", "pqq", "taurine", "vit a"] },
  { product: "Sulforapro Brokkoli-Extrakt 60 Kapseln", brand: "MoleQlar", synergies: ["nrf2 aktivatoren", "curcumin"] },
  { product: "Biogena Taurin 750", brand: "Biogena", synergies: ["caffeine", "magnesium", "zinc"] },
  { product: "Glycine Powder", brand: "Bulk", synergies: ["copper", "hyaluronic acid", "msm", "potassium", "taurine", "vit b6", "vit b complex", "vit c"] },
  { product: "Tongkat Ali 200:1", brand: "MoleQlar", synergies: ["ashwagandha", "zink", "vitamin d"] },
  { product: "TUDCA", brand: "MoleQlar", synergies: ["alpha lipoic", "glycine", "quercetin", "selenium", "vit c"] },
  { product: "Ubiquinol 100mg with Kaneka", brand: "Doctor's Best", synergies: ["pqq", "alpha liponsaeure", "carnitin"] },
  { product: "Mitopure® Urolithin A 30 Kapseln", brand: "MoleQlar", synergies: ["nad booster", "coq10", "pqq"] },
  { product: "Verdauungsen‐zyme", brand: "More Nutrition", synergies: ["probiotics", "hcl"] },
  { product: "B12 Aktiv", brand: "Doppelherz", synergies: ["folate", "iron", "vit b6", "vit b complex"] },
  { product: "R-Alpha-Lipon‐säure 300 mg - mit Vitamin", brand: "Amazon Generic", synergies: ["quercetin", "zink", "eisen"] },
  { product: "Biogena Vitamin D3 Tropfen", brand: "Biogena", synergies: ["calcium", "magnesium", "omega 3", "zinc"] },
  { product: "Biogena Zink Tropfen", brand: "Biogena", synergies: ["calcium", "magnesium", "omega 3", "vit k2", "zinc"] },
  { product: "CoQ10 100mg mit Vitamin E", brand: "Now Foods", synergies: ["vitamin c", "selen", "coq10"] },
  { product: "Natural Vitamin K2 MK-7 100mcg 60 Vcaps", brand: "Doctor's Best", synergies: ["vitamin d3", "calcium", "magnesium"] },
  { product: "Weight Gainer", brand: "ESN", synergies: ["kreatin", "whey"] },
  { product: "Designer Whey Protein", brand: "ESN", synergies: ["kreatin", "leucin", "glutamin"] },
  { product: "Zeolith Detox", brand: "More Nutrition", synergies: ["chlorella", "aktivkohle"] },
  { product: "Wundervoll Zink", brand: "Naturtreu", synergies: ["copper", "magnesium", "vit a", "vit b6", "vit c"] },
  { product: "Zink + C + E 40 Tabs", brand: "Doppelherz", synergies: ["copper", "magnesium", "vit a", "vit b6", "vit c"] },
];

// Extracted blocker data from PDF
const BLOCKERS_DATA: Array<{ product: string; brand: string; blockers: string[] }> = [
  { product: "5-HTP 200mg", brand: "Natural Elements", blockers: ["ssri"] },
  { product: "A-Z Complete Depot 40 Tabletten", brand: "Doppelherz", blockers: ["timing dependent"] },
  { product: "Alpha Lipoic Acid 600mg 120 Caps", brand: "Bulk", blockers: ["diabetes medikamente", "schilddrüsenmedikamente"] },
  { product: "Biogena Alpha Liponsaeure 200", brand: "Biogena", blockers: ["schilddrüsenmedikamente"] },
  { product: "Calcium Alpha-Ketoglutarat 90 Kapseln", brand: "MoleQlar", blockers: ["eisen", "zink", "magnesium"] },
  { product: "Shilajit Capsules - 1300mg per Daily Dos", brand: "Amazon Generic", blockers: ["immunsuppressiva", "schilddrüsenmedikamente"] },
  { product: "Augen Vital 90 Kapseln", brand: "Doppelherz", blockers: ["timing dependent"] },
  { product: "B-Vitamin Komplex 60 Tabs", brand: "Doppelherz", blockers: ["blutverdünner (warfarin)"] },
  { product: "Orthomol Beauty 30 Trinkfläschchen", brand: "Orthomol", blockers: ["calcium", "copper", "copper high dose", "iron"] },
  { product: "BERBERIN HCL 500 mg in Vegetable Capsule", brand: "Amazon Generic", blockers: ["cyclosporin", "metformin"] },
  { product: "Haar Vitamine", brand: "Natural Elements", blockers: ["timing dependent"] },
  { product: "Calcium Alpha-Ketoglutarat Kapseln", brand: "MoleQlar", blockers: ["iron", "magnesium", "zinc"] },
  { product: "Calcium 1000 + D3 + K2 30 Tabletten", brand: "Doppelherz", blockers: ["iron", "magnesium", "zinc"] },
  { product: "Chlorella Bio", brand: "Natural Elements", blockers: ["antibiotics", "caffeine", "calcium", "magnesium", "zinc"] },
  { product: "Premium Coenzyme Q10 Ubiquinol", brand: "Amazon Generic", blockers: ["blutverdünner", "chemotherapie"] },
  { product: "Orthomol Energie", brand: "Orthomol", blockers: ["caffeine", "calcium", "iron", "magnesium", "zinc"] },
  { product: "Turmeric Curcumin 500mg", brand: "Bulk", blockers: ["blutverdünner", "gallensteine"] },
  { product: "DIM 200mg", brand: "Sunday Natural", blockers: ["calcium", "copper", "iron"] },
  { product: "Eisen + Vitamin C + Histidin", brand: "Doppelherz", blockers: ["caffeine", "calcium", "copper high dose", "magnesium", "zinc"] },
  { product: "Orthomol Femin", brand: "Orthomol", blockers: ["iron", "magnesium", "zinc"] },
  { product: "Orthomol Arthroplus", brand: "Orthomol", blockers: ["copper high dose"] },
  { product: "Ginkgo Biloba Extrakt 6000mg", brand: "Nature Love", blockers: ["blutverdünner"] },
  { product: "NAC N-Acetylcystein", brand: "Sunday Natural", blockers: ["nitroglycerin"] },
  { product: "Magnesium Glycinat Hochdosiert Kapseln", brand: "Amazon Generic", blockers: ["antibiotika", "calcium"] },
  { product: "GlyNAC Glycin + NAC 120 Kapseln", brand: "MoleQlar", blockers: ["nitroglycerin"] },
  { product: "Grüner Tee EGCG 98%", brand: "Nature Love", blockers: ["iron", "melatonin"] },
  { product: "Orthomol Hair Intense 60 Kapseln", brand: "Orthomol", blockers: ["calcium", "copper", "iron", "zinc"] },
  { product: "Caffeine Caps 200mg", brand: "ESN", blockers: ["iron", "melatonin"] },
  { product: "Orthomol Beauty", brand: "Orthomol", blockers: ["calcium", "copper", "copper high dose", "iron"] },
  { product: "L-Lysin 1000mg", brand: "Nature Love", blockers: ["arginin"] },
  { product: "L-Tryptophan 500mg", brand: "Nature Love", blockers: ["ssri"] },
  { product: "Lecithin + B-Vitamine 40 Kapseln", brand: "Doppelherz", blockers: ["iron"] },
  { product: "Biogena Magnesium 150", brand: "Biogena", blockers: ["calcium", "iron"] },
  { product: "Biogena Melatonin Tropfen", brand: "Biogena", blockers: ["caffeine"] },
  { product: "Biogena Ester C Gold", brand: "Biogena", blockers: ["mao hemmer"] },
  { product: "A-Z + Omega-3 All-in-One 60", brand: "Doppelherz", blockers: ["blutverdünner (hohe Dosen)"] },
  { product: "Biogena Nac 350", brand: "Biogena", blockers: ["nitroglycerin"] },
  { product: "Biogena Nadh 20 Superior M S S", brand: "Biogena", blockers: ["nitroglycerin"] },
  { product: "Biogena Marines Omega 3 Liquid", brand: "Biogena", blockers: ["blutverdünner (hohe Dosen)"] },
  { product: "Omega 3 Vegan Algenöl", brand: "Natural Elements", blockers: ["blutverdünner (hohe Dosen)"] },
  { product: "Biogena Prosta Caps", brand: "Biogena", blockers: ["antibiotics"] },
  { product: "Orthomol Nemuri night 30 Sachets", brand: "Orthomol", blockers: ["caffeine", "calcium", "iron"] },
  { product: "Spirulina Bio", brand: "Natural Elements", blockers: ["antibiotics", "caffeine", "calcium", "magnesium", "zinc"] },
  { product: "Orthomol Sport 30 Trinkfläschchen+Tabs", brand: "Orthomol", blockers: ["calcium", "copper", "iron"] },
  { product: "Tongkat Ali 200:1", brand: "MoleQlar", blockers: ["hormontherapie"] },
  { product: "TUDCA", brand: "MoleQlar", blockers: ["nitroglycerin"] },
  { product: "Nervenglück B12 Methylcobalamin", brand: "Naturtreu", blockers: ["calcium", "iron"] },
  { product: "Biogena Vitamin A 1000", brand: "Biogena", blockers: ["copper high dose"] },
  { product: "Biogena Vitamin D3 Tropfen", brand: "Biogena", blockers: ["warfarin"] },
  { product: "Biogena Zink Tropfen", brand: "Biogena", blockers: ["calcium", "eisen", "kupfer"] },
  { product: "CoQ10 100mg mit Vitamin E", brand: "Now Foods", blockers: ["blutverdünner", "chemotherapie", "statine"] },
  { product: "Natural Vitamin K2 MK-7 100mcg 60 Vcaps", brand: "Doctor's Best", blockers: ["blutverdünner", "warfarin"] },
];

function normalizeForMatch(name: string): string {
  return name.toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .trim();
}

function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleOptions(req);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all products with brand info
    const { data: products, error: fetchError } = await supabase
      .from('supplement_products')
      .select(`
        id,
        product_name,
        brand_id,
        supplement_brands!inner(name, slug)
      `);

    if (fetchError) {
      return errJson(`Failed to fetch products: ${fetchError.message}`, req, 500);
    }

    const results = {
      synergiesUpdated: 0,
      blockersUpdated: 0,
      synergiesMatched: [] as string[],
      blockersMatched: [] as string[],
      synergiesUnmatched: [] as string[],
      blockersUnmatched: [] as string[],
    };

    // Process synergies
    for (const entry of SYNERGIES_DATA) {
      const normalizedProduct = normalizeForMatch(entry.product);
      const normalizedBrand = normalizeForMatch(entry.brand);
      
      let bestMatch: { id: string; score: number; name: string } | null = null;
      
      for (const product of products || []) {
        const normalizedDbProduct = normalizeForMatch(product.product_name);
        const brandInfo = product.supplement_brands as unknown as { name: string; slug: string };
        const normalizedDbBrand = normalizeForMatch(brandInfo?.name || '');
        
        // Check brand match first
        const brandMatches = normalizedDbBrand.includes(normalizedBrand) || 
                           normalizedBrand.includes(normalizedDbBrand) ||
                           brandInfo?.slug?.includes(normalizedBrand.replace(/\s+/g, '-'));
        
        if (!brandMatches) continue;
        
        // Calculate product name similarity
        let score = 0;
        
        // Exact match
        if (normalizedDbProduct === normalizedProduct) {
          score = 100;
        }
        // Contains match
        else if (normalizedDbProduct.includes(normalizedProduct) || normalizedProduct.includes(normalizedDbProduct)) {
          score = 80;
        }
        // Fuzzy match
        else {
          const distance = levenshteinDistance(normalizedDbProduct, normalizedProduct);
          const maxLen = Math.max(normalizedDbProduct.length, normalizedProduct.length);
          const similarity = 1 - (distance / maxLen);
          if (similarity > 0.7) {
            score = Math.floor(similarity * 60);
          }
        }
        
        if (score > 0 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { id: product.id, score, name: product.product_name };
        }
      }
      
      if (bestMatch) {
        const { error: updateError } = await supabase
          .from('supplement_products')
          .update({ synergies: entry.synergies })
          .eq('id', bestMatch.id);
        
        if (!updateError) {
          results.synergiesUpdated++;
          results.synergiesMatched.push(`${entry.product} -> ${bestMatch.name}`);
        }
      } else {
        results.synergiesUnmatched.push(entry.product);
      }
    }

    // Process blockers
    for (const entry of BLOCKERS_DATA) {
      const normalizedProduct = normalizeForMatch(entry.product);
      const normalizedBrand = normalizeForMatch(entry.brand);
      
      let bestMatch: { id: string; score: number; name: string } | null = null;
      
      for (const product of products || []) {
        const normalizedDbProduct = normalizeForMatch(product.product_name);
        const brandInfo = product.supplement_brands as unknown as { name: string; slug: string };
        const normalizedDbBrand = normalizeForMatch(brandInfo?.name || '');
        
        const brandMatches = normalizedDbBrand.includes(normalizedBrand) || 
                           normalizedBrand.includes(normalizedDbBrand) ||
                           brandInfo?.slug?.includes(normalizedBrand.replace(/\s+/g, '-'));
        
        if (!brandMatches) continue;
        
        let score = 0;
        if (normalizedDbProduct === normalizedProduct) {
          score = 100;
        } else if (normalizedDbProduct.includes(normalizedProduct) || normalizedProduct.includes(normalizedDbProduct)) {
          score = 80;
        } else {
          const distance = levenshteinDistance(normalizedDbProduct, normalizedProduct);
          const maxLen = Math.max(normalizedDbProduct.length, normalizedProduct.length);
          const similarity = 1 - (distance / maxLen);
          if (similarity > 0.7) {
            score = Math.floor(similarity * 60);
          }
        }
        
        if (score > 0 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { id: product.id, score, name: product.product_name };
        }
      }
      
      if (bestMatch) {
        const { error: updateError } = await supabase
          .from('supplement_products')
          .update({ blockers: entry.blockers })
          .eq('id', bestMatch.id);
        
        if (!updateError) {
          results.blockersUpdated++;
          results.blockersMatched.push(`${entry.product} -> ${bestMatch.name}`);
        }
      } else {
        results.blockersUnmatched.push(entry.product);
      }
    }

    return okJson({
      success: true,
      summary: {
        synergiesProcessed: SYNERGIES_DATA.length,
        synergiesUpdated: results.synergiesUpdated,
        synergiesUnmatched: results.synergiesUnmatched.length,
        blockersProcessed: BLOCKERS_DATA.length,
        blockersUpdated: results.blockersUpdated,
        blockersUnmatched: results.blockersUnmatched.length,
      },
      details: {
        synergiesMatched: results.synergiesMatched.slice(0, 20),
        synergiesUnmatched: results.synergiesUnmatched,
        blockersMatched: results.blockersMatched.slice(0, 20),
        blockersUnmatched: results.blockersUnmatched,
      }
    }, req);

  } catch (error) {
    return errJson(error instanceof Error ? error.message : "Unknown error", req, 500);
  }
});
