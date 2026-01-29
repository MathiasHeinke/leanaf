import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Extended ingredient matching with comprehensive manual overrides
const MANUAL_OVERRIDES: Record<string, string[]> = {
  // Vitamins - EXTENDED
  'vit_d3': ['vitamin d3', 'vitamin d', 'cholecalciferol', 'vitamin d3 + k2', 'vitamin d3 + k2 mk7 tropfen', 'vitamin d balance', 'd3 + k2'],
  'vit_k2': ['vitamin k2', 'k2 mk-7', 'k2', 'k2 mk7'],
  'vit_b12': ['vitamin b12', 'b12', 'methylcobalamin'],
  'vit_b_complex': ['b-komplex', 'b komplex', 'vitamin b-komplex'],
  'vit_c': ['vitamin c', 'ascorbinsäure', 'vitamin c liposomal', 'vitamin c (liposomal)'],
  'vit_e': ['vitamin e', 'tocopherol'],
  'folate': ['folat', 'folsaeure', 'methyl folate', '5-mthf', 'methylfolat'],
  'multivitamin': ['multivitamin', 'a-z komplex', 'multi', 'a-z'],
  
  // Minerals - EXTENDED
  'magnesium': ['magnesium', 'magnesiumcitrat', 'magnesium glycinat', 'magnesium bisglycinat', 'mg-glycinat', 'mg-citrat'],
  'mg_threonate': ['magnesium-l-threonat', 'magtein', 'magnesium komplex 11 ultra', 'magnesium komplex'],
  'zinc': ['zink', 'zink bisglycinat', 'zinc complex', 'zink-bisglycinat', 'zinkglycinat'],
  'iron': ['eisen'],
  'calcium': ['calcium', 'kalzium'],
  'selenium': ['selen'],
  'iodine': ['jod'],
  'copper': ['kupfer'],
  'chromium': ['chrom'],
  'boron': ['bor'],
  'potassium': ['kalium'],
  'sodium': ['natrium', 'elektrolyte', 'elektrolyte (lmnt)', 'lmnt'],
  
  // Amino acids - EXTENDED
  'creatine': ['kreatin', 'creatine', 'creatin monohydrat', 'creatine monohydrat', 'creatin'],
  'carnitine': ['carnitin', 'l-carnitin', 'acetyl-l-carnitin'],
  'glutamine': ['glutamin', 'l-glutamin'],
  'arginine': ['arginin', 'l-arginin'],
  'citrulline': ['citrullin', 'l-citrullin', 'citrullin malat'],
  'taurine': ['taurin', 'taurin kardioprotektiv', 'taurin (kardioprotektiv)'],
  'glycine': ['glycin'],
  'theanine': ['theanin', 'l-theanin'],
  'tyrosine': ['tyrosin', 'l-tyrosin'],
  'beta_alanine': ['beta-alanin', 'beta alanin'],
  'hmb': ['hmb', 'hmb 3000'],
  'eaa': ['eaa', 'eaa komplex', 'essential amino acids'],
  'bcaa': ['bcaa'],
  'nac': ['nac', 'n-acetyl-cystein'],
  'glynac': ['glynac', 'gly-nac', 'glycin + nac'],
  'betaine': ['betain', 'tmg', 'trimethylglycin'],
  
  // Fatty acids - EXTENDED
  'omega3_epa': ['omega-3', 'omega 3', 'omega-3 (epa/dha)', 'omega-3 epa/dha'],
  
  // Adaptogens - EXTENDED
  'ashwagandha': ['ashwagandha', 'ashwagandha ksm-66', 'ksm-66', 'ksm66'],
  'rhodiola': ['rhodiola', 'rhodiola rosea'],
  'ginseng': ['ginseng', 'panax ginseng'],
  'maca': ['maca'],
  'curcumin': ['curcumin', 'kurkuma', 'curcumin longvida'],
  'egcg': ['grüntee extrakt', 'gruentee', 'green tea'],
  'resveratrol': ['resveratrol', 'trans-resveratrol', 'liposomales nad+ & trans-resveratrol'],
  'quercetin': ['quercetin'],
  'berberine': ['berberin'],
  'tongkat_ali': ['tongkat ali', 'tongkat'],
  'fisetin': ['fisetin'],
  'shilajit': ['shilajit', 'mumijo'],
  'turkesterone': ['turkesterone', 'turkesteron', 'turkesterone max'],
  
  // Mushrooms
  'lions_mane': ['lions mane', "lion's mane", 'hericium'],
  'reishi': ['reishi'],
  'cordyceps': ['cordyceps'],
  'chaga': ['chaga'],
  
  // Longevity - EXTENDED
  'coq10': ['coq10', 'ubiquinol', 'coq10 ubiquinol', 'astaxanthin + coenzym q10'],
  'ala': ['alpha-liponsäure', 'alpha liponsäure', 'alpha-liponsaeure', 'ala', 'r-ala'],
  'pqq': ['pqq'],
  'astaxanthin': ['astaxanthin'],
  'glutathione': ['glutathion'],
  'nmn': ['nmn', 'nmn sublingual', 'nicotinamid mononukleotid', 'nmn (nicotinamid mononukleotid)'],
  'nr': ['nr', 'nicotinamid ribosid'],
  'spermidine': ['spermidin'],
  'urolithin_a': ['urolithin a', 'mitopure', 'urolithin'],
  'tudca': ['tudca'],
  'pterostilbene': ['pterostilben', 'pterostilbene'],
  'akg': ['alpha-ketoglutarat', 'akg', 'ca-akg', 'caakg', 'alpha-ketoglutarat (akg)', 'rejuvant'],
  
  // Gut health - EXTENDED
  'probiotics': ['probiotika', 'probiona kulturen komplex', 'probiotika multi-strain'],
  'probiotics_lacto': ['probiotika', 'lactobacillus', 'probiona kulturen komplex', 'probiotika multi-strain'],
  'psyllium': ['flohsamenschalen', 'flohsamen', 'psyllium'],
  
  // Joints
  'glucosamine': ['glucosamin'],
  'chondroitin': ['chondroitin'],
  'msm': ['msm'],
  'collagen': ['kollagen', 'collagen', 'kollagen peptide'],
  'collagen_peptides': ['kollagen-peptide', 'collagen peptides', 'kollagen peptide'],
  'hyaluronic_acid': ['hyaluronsäure', 'hyaluron', 'hyaluron & kollagen'],
  
  // Nootropics
  'citicoline': ['citicolin', 'cdp-cholin'],
  'alpha_gpc': ['alpha-gpc', 'alpha gpc'],
  'ps': ['phosphatidylserin'],
  
  // Proteins - EXTENDED
  'whey': ['whey', 'whey protein', 'protein pulver'],
  'casein': ['casein', 'kasein'],
  
  // Other - EXTENDED
  'caffeine': ['koffein', 'caffeine'],
  'melatonin': ['melatonin'],
  'bergamot': ['citrus bergamot', 'bergamot', 'bergamotte'],
  'electrolytes': ['elektrolyte', 'lmnt', 'elektrolyte (lmnt)'],
  'milk_thistle': ['silymarin', 'mariendistel', 'milk thistle'],
  'pine_bark': ['pinienrinden extrakt', 'opc', 'pycnogenol', 'pinienrinden'],
  'black_seed_oil': ['schwarzkuemmeloel 1000', 'schwarzkuemmeloel', 'nigella sativa', 'schwarzkümmelöl'],
  'fadogia': ['fadogia agrestis', 'fadogia'],
  'dim': ['dim'],
  'apigenin': ['apigenin'],
  'bacopa': ['bacopa monnieri', 'bacopa'],
  'gaba': ['gaba'],
  'lecithin': ['lecithin'],
  'chlorella': ['chlorella'],
  'spirulina': ['spirulina'],
};

const MATRIX_DATA = [
  {"ingredient_id":"vit_d3","ingredient_name":"Vitamin D3","category":"vitamine","base_score":9,"phase_modifiers":{"0":2,"1":1,"2":0,"3":0},"context_modifiers":{"true_natural":1,"enhanced_no_trt":1,"on_trt":1,"on_glp1":1},"goal_modifiers":{"fat_loss":0.5,"muscle_gain":0.5,"longevity":1,"cognitive":0.5,"sleep":0.5,"recomposition":1,"maintenance":1.5},"calorie_modifiers":{"in_surplus":1},"peptide_class_modifiers":{"immune":2,"testo":2.5},"demographic_modifiers":{"age_over_40":1.5,"age_over_50":2.5,"is_female":1.5,"age_over_60":3.2,"is_male":1},"bloodwork_triggers":{"vitamin_d_low":4,"inflammation_high":1,"testosterone_low":1.5},"warnings":{"vitamin_d_low":"Kritischer Mangel – Supplementierung essentiell!"}},
  {"ingredient_id":"vit_k2","ingredient_name":"Vitamin K2 MK-7","category":"vitamine","base_score":8.5,"phase_modifiers":{"0":1,"1":0.5,"2":0,"3":0},"context_modifiers":{"true_natural":0.5,"on_trt":1},"goal_modifiers":{"longevity":1.5,"maintenance":1},"bloodwork_triggers":{"vitamin_d_low":2},"warnings":{"on_blood_thinners":"Vorsicht bei Antikoagulantien – Arzt konsultieren!"}},
  {"ingredient_id":"vit_b12","ingredient_name":"Vitamin B12","category":"vitamine","base_score":8,"phase_modifiers":{"0":1.5,"1":0.5,"2":0,"3":0},"context_modifiers":{"true_natural":0.5,"on_glp1":2},"goal_modifiers":{"cognitive":1,"fat_loss":0.5,"recomposition":0.2,"maintenance":1},"peptide_class_modifiers":{"metabolic":2.5},"demographic_modifiers":{"age_over_40":1.5,"age_over_50":2.5,"is_female":1.5,"age_over_60":3.2},"bloodwork_triggers":{"b12_low":4,"homocysteine_high":2},"compound_synergies":{"retatrutide":2,"tirzepatide":1.5,"semaglutide":1.5},"warnings":{"on_glp1":"GLP-1 Agonisten reduzieren B12-Absorption – Supplementierung wichtig!"}},
  {"ingredient_id":"vit_b_complex","ingredient_name":"Vitamin B-Komplex","category":"vitamine","base_score":8,"phase_modifiers":{"0":1.5,"1":1,"2":0.5,"3":0},"context_modifiers":{"true_natural":1,"on_glp1":2.5},"goal_modifiers":{"cognitive":1,"fat_loss":1,"recomposition":0.5,"maintenance":1},"bloodwork_triggers":{"homocysteine_high":3,"b12_low":2},"compound_synergies":{"retatrutide":3,"tirzepatide":2,"semaglutide":2},"warnings":{"retatrutide":"Essentiell bei Retatrutide wegen erhöhtem Umsatz!"}},
  {"ingredient_id":"vit_c","ingredient_name":"Vitamin C","category":"vitamine","base_score":7.5,"phase_modifiers":{"0":1,"1":0.5,"2":0,"3":0},"context_modifiers":{"true_natural":0.5},"goal_modifiers":{"longevity":0.5,"maintenance":1},"peptide_class_modifiers":{"healing":2,"immune":3,"skin":2},"bloodwork_triggers":{"inflammation_high":1.5,"iron_low":1}},
  {"ingredient_id":"vit_e","ingredient_name":"Vitamin E","category":"vitamine","base_score":6.5,"phase_modifiers":{"0":0.5,"1":0,"2":0,"3":0.5},"context_modifiers":{"on_trt":1},"goal_modifiers":{"longevity":1,"maintenance":1},"bloodwork_triggers":{"ldl_high":1},"warnings":{"high_dose":"Nicht überdosieren – max. 400 IE/Tag"}},
  {"ingredient_id":"vit_a","ingredient_name":"Vitamin A","category":"vitamine","base_score":6,"phase_modifiers":{"0":0.5,"1":0,"2":0,"3":0},"goal_modifiers":{"maintenance":1},"warnings":{"overdose":"Fettlöslich – Überdosierung möglich"}},
  {"ingredient_id":"folate","ingredient_name":"Folat (5-MTHF)","category":"vitamine","base_score":7.5,"phase_modifiers":{"0":1,"1":0.5,"2":0,"3":0},"goal_modifiers":{"cognitive":1,"longevity":0.5},"demographic_modifiers":{"is_female":3},"bloodwork_triggers":{"homocysteine_high":3.5,"b12_low":1}},
  {"ingredient_id":"biotin","ingredient_name":"Biotin","category":"vitamine","base_score":5.5,"phase_modifiers":{"0":0.5,"1":0,"2":0,"3":0},"peptide_class_modifiers":{"skin":2},"warnings":{"lab_interference":"Kann Laborwerte verfälschen – 48h vor Bluttest absetzen"}},
  {"ingredient_id":"niacin","ingredient_name":"Niacin","category":"vitamine","base_score":7,"phase_modifiers":{"0":0.5,"1":1,"2":1,"3":0.5},"context_modifiers":{"on_trt":2},"goal_modifiers":{"longevity":1},"bloodwork_triggers":{"hdl_low":3,"ldl_high":2},"warnings":{"flush":"Flush-Form kann Hautrötung verursachen"}},
  {"ingredient_id":"thiamin","ingredient_name":"Thiamin (B1)","category":"vitamine","base_score":6,"phase_modifiers":{"0":0.5,"1":0,"2":0,"3":0},"goal_modifiers":{"cognitive":0.5},"bloodwork_triggers":{"glucose_high":1}},
  {"ingredient_id":"riboflavin","ingredient_name":"Riboflavin (B2)","category":"vitamine","base_score":5.5,"phase_modifiers":{"0":0.5,"1":0,"2":0,"3":0},"bloodwork_triggers":{"homocysteine_high":1}},
  {"ingredient_id":"pantothenic","ingredient_name":"Pantothensäure (B5)","category":"vitamine","base_score":5.5,"phase_modifiers":{"0":0.5,"1":0,"2":0,"3":0},"goal_modifiers":{"fat_loss":0.5,"recomposition":0.2},"bloodwork_triggers":{"cortisol_high":1}},
  {"ingredient_id":"pyridoxine","ingredient_name":"Pyridoxin (B6)","category":"vitamine","base_score":6.5,"phase_modifiers":{"0":0.5,"1":0.5,"2":0,"3":0},"goal_modifiers":{"cognitive":0.5,"sleep":0.5},"bloodwork_triggers":{"homocysteine_high":2},"warnings":{"overdose":"Nicht >100mg/Tag – Neuropathie-Risiko"}},
  {"ingredient_id":"magnesium","ingredient_name":"Magnesium","category":"mineralien","base_score":9,"phase_modifiers":{"0":2,"1":1,"2":0.5,"3":0},"context_modifiers":{"true_natural":1,"enhanced_no_trt":1.5,"on_trt":1,"on_glp1":2},"goal_modifiers":{"sleep":2,"muscle_gain":1,"cognitive":1,"recomposition":0.5,"maintenance":1.5,"performance":1},"calorie_modifiers":{"in_deficit":1.5,"in_surplus":1},"peptide_class_modifiers":{"gh_secretagogue":2,"testo":2.5,"metabolic":2.5},"demographic_modifiers":{"age_over_40":1.5,"is_female":1.5,"is_male":1},"bloodwork_triggers":{"magnesium_low":4,"cortisol_high":1.5,"glucose_high":1},"compound_synergies":{"retatrutide":2,"tirzepatide":1.5},"warnings":{"retatrutide":"GLP-1 erhöht Magnesiumverlust – Supplementierung kritisch!"}},
  {"ingredient_id":"zinc","ingredient_name":"Zink","category":"mineralien","base_score":8.5,"phase_modifiers":{"0":1.5,"1":1,"2":0.5,"3":0},"context_modifiers":{"true_natural":2,"enhanced_no_trt":1,"on_trt":0.5},"goal_modifiers":{"muscle_gain":1,"recomposition":0.5,"maintenance":1.5},"calorie_modifiers":{"in_surplus":1},"peptide_class_modifiers":{"gh_secretagogue":2,"healing":3,"immune":3,"testo":2.5},"demographic_modifiers":{"is_male":1},"bloodwork_triggers":{"testosterone_low":2.5},"compound_synergies":{"tb_500":2},"warnings":{"copper_depletion":"Bei Langzeit-Einnahme Kupfer supplementieren"}},
  {"ingredient_id":"iron","ingredient_name":"Eisen","category":"mineralien","base_score":5,"phase_modifiers":{"0":0,"1":0,"2":0,"3":0},"context_modifiers":{"on_trt":-2},"goal_modifiers":{"performance":1},"demographic_modifiers":{"is_female":3},"bloodwork_triggers":{"iron_low":5,"ferritin_high":-5},"warnings":{"ferritin_high":"NICHT supplementieren bei hohem Ferritin!","on_trt":"TRT erhöht Erythropoese – Eisenspeicher überwachen"}},
  {"ingredient_id":"calcium","ingredient_name":"Calcium","category":"mineralien","base_score":5.5,"phase_modifiers":{"0":0.5,"1":0,"2":0,"3":0},"goal_modifiers":{"longevity":-0.5},"demographic_modifiers":{"age_over_50":2.5,"is_female":1.5,"age_over_60":3.2},"bloodwork_triggers":{"vitamin_d_low":1},"warnings":{"cardiovascular":"Hohe Dosen ohne K2 können Gefäßverkalkung fördern"}},
  {"ingredient_id":"potassium","ingredient_name":"Kalium","category":"mineralien","base_score":7.5,"phase_modifiers":{"0":1,"1":1.5,"2":1,"3":0.5},"context_modifiers":{"on_glp1":3},"goal_modifiers":{"fat_loss":1.5,"recomposition":0.8},"calorie_modifiers":{"in_deficit":1.5},"peptide_class_modifiers":{"metabolic":2.5},"compound_synergies":{"retatrutide":3,"tirzepatide":2.5,"semaglutide":2},"warnings":{"retatrutide":"Elektrolytverlust bei GLP-1 – Supplementierung essentiell!"}},
  {"ingredient_id":"selenium","ingredient_name":"Selen","category":"mineralien","base_score":7.5,"phase_modifiers":{"0":1,"1":0.5,"2":0,"3":0.5},"context_modifiers":{"true_natural":0.5},"goal_modifiers":{"longevity":1,"maintenance":1},"peptide_class_modifiers":{"immune":2},"bloodwork_triggers":{"thyroid_slow":2.5},"warnings":{"overdose":"Max. 200 µg/Tag – Toxizität bei Überdosierung"}},
  {"ingredient_id":"iodine","ingredient_name":"Jod","category":"mineralien","base_score":6.5,"phase_modifiers":{"0":0.5,"1":0,"2":0,"3":0},"goal_modifiers":{"fat_loss":0.5,"recomposition":0.2},"bloodwork_triggers":{"thyroid_slow":2},"warnings":{"hashimoto":"Vorsicht bei Hashimoto – kann Schub auslösen"}},
  {"ingredient_id":"copper","ingredient_name":"Kupfer","category":"mineralien","base_score":5,"phase_modifiers":{"0":0,"1":0,"2":0,"3":0},"warnings":{"zinc_supplementation":"Nur bei Langzeit-Zink-Einnahme supplementieren"}},
  {"ingredient_id":"manganese","ingredient_name":"Mangan","category":"mineralien","base_score":4.5,"phase_modifiers":{"0":0,"1":0,"2":0,"3":0}},
  {"ingredient_id":"chromium","ingredient_name":"Chrom","category":"mineralien","base_score":6,"phase_modifiers":{"0":0.5,"1":1,"2":0.5,"3":0},"context_modifiers":{"on_glp1":-1},"goal_modifiers":{"fat_loss":1.5,"recomposition":0.8},"bloodwork_triggers":{"glucose_high":2.5,"insulin_resistant":2},"compound_synergies":{"retatrutide":-2,"tirzepatide":-1.5},"warnings":{"on_glp1":"Redundant bei GLP-1 – beide verbessern Insulinsensitivität"}},
  {"ingredient_id":"boron","ingredient_name":"Bor","category":"mineralien","base_score":6.5,"phase_modifiers":{"0":0.5,"1":0.5,"2":0.5,"3":0.5},"context_modifiers":{"true_natural":2,"on_trt":-1},"goal_modifiers":{"muscle_gain":1,"recomposition":0.5},"peptide_class_modifiers":{"testo":2.5},"bloodwork_triggers":{"testosterone_low":2},"warnings":{"on_trt":"Limitierter Nutzen bei exogenem Testosteron"}},
  {"ingredient_id":"silicon","ingredient_name":"Silizium","category":"mineralien","base_score":5,"phase_modifiers":{"0":0,"1":0,"2":0,"3":0.5},"goal_modifiers":{"longevity":0.5},"peptide_class_modifiers":{"skin":2},"compound_synergies":{"bpc_157":1,"tb_500":1}},
  {"ingredient_id":"sodium","ingredient_name":"Natrium","category":"mineralien","base_score":7,"phase_modifiers":{"0":0.5,"1":2,"2":1.5,"3":1},"context_modifiers":{"on_glp1":4},"goal_modifiers":{"fat_loss":2,"recomposition":1},"calorie_modifiers":{"in_deficit":1.5},"peptide_class_modifiers":{"metabolic":2.5},"compound_synergies":{"retatrutide":4,"tirzepatide":3,"semaglutide":2.5},"warnings":{"retatrutide":"KRITISCH bei Retatrutide – Elektrolyte sind Non-Negotiable!"}},
  {"ingredient_id":"phosphorus","ingredient_name":"Phosphor","category":"mineralien","base_score":4,"phase_modifiers":{"0":0,"1":0,"2":0,"3":0},"warnings":{"general":"Meist ausreichend über Ernährung"}},
  {"ingredient_id":"molybdenum","ingredient_name":"Molybdän","category":"mineralien","base_score":4,"phase_modifiers":{"0":0,"1":0,"2":0,"3":0}},
  {"ingredient_id":"creatine","ingredient_name":"Kreatin","category":"aminosaeuren","base_score":9.5,"phase_modifiers":{"0":1,"1":1,"2":0.5,"3":0},"context_modifiers":{"true_natural":1,"enhanced_no_trt":1,"on_trt":0.5},"goal_modifiers":{"muscle_gain":2,"cognitive":1.5,"fat_loss":0.5,"recomposition":1.8,"maintenance":0.5,"performance":2},"calorie_modifiers":{"in_deficit":3,"in_surplus":2},"demographic_modifiers":{"age_over_40":1.5,"age_over_50":2,"age_over_60":2.6,"is_male":1}},
  {"ingredient_id":"carnitine","ingredient_name":"L-Carnitin","category":"aminosaeuren","base_score":7.5,"phase_modifiers":{"0":0.5,"1":1.5,"2":1,"3":0.5},"context_modifiers":{"true_natural":1,"on_trt":1.5},"goal_modifiers":{"fat_loss":2,"cognitive":1.5,"longevity":1,"recomposition":1,"performance":2},"calorie_modifiers":{"in_deficit":2},"warnings":{"on_trt":"TRT erhöht Androgen-Rezeptor-Dichte – L-Carnitin synergistisch!"}},
  {"ingredient_id":"glutamine","ingredient_name":"L-Glutamin","category":"aminosaeuren","base_score":7,"phase_modifiers":{"0":0.5,"1":1,"2":0.5,"3":0},"context_modifiers":{"enhanced_no_trt":2,"on_glp1":2.5},"goal_modifiers":{"gut_health":3,"muscle_gain":0.5,"recomposition":0.2},"calorie_modifiers":{"in_surplus":2},"peptide_class_modifiers":{"gh_secretagogue":2,"healing":3},"bloodwork_triggers":{"inflammation_high":1.5},"compound_synergies":{"retatrutide":2.5,"tirzepatide":2,"bpc_157":2,"tb_500":2},"warnings":{"on_glp1":"GLP-1 kann Darm stressen – Glutamin unterstützt Schleimhaut"}},
  {"ingredient_id":"arginine","ingredient_name":"L-Arginin","category":"aminosaeuren","base_score":6.5,"phase_modifiers":{"0":0.5,"1":0.5,"2":0,"3":0},"context_modifiers":{"true_natural":1.5,"on_trt":-1},"goal_modifiers":{"muscle_gain":0.5,"recomposition":0.2,"performance":2},"peptide_class_modifiers":{"gh_secretagogue":2},"compound_synergies":{"cjc_1295":-3,"ipamorelin":-3},"warnings":{"cjc_ipamorelin":"Redundant bei GH-Sekretagogen – diese nutzen denselben Pathway","on_trt":"Citrullin ist effektiver für NO-Produktion"}},
  {"ingredient_id":"citrulline","ingredient_name":"L-Citrullin","category":"aminosaeuren","base_score":8,"phase_modifiers":{"0":0.5,"1":1,"2":0.5,"3":0},"context_modifiers":{"true_natural":1,"on_trt":1},"goal_modifiers":{"muscle_gain":1.5,"recomposition":0.8,"performance":2}},
  {"ingredient_id":"taurine","ingredient_name":"Taurin","category":"aminosaeuren","base_score":8,"phase_modifiers":{"0":1,"1":1,"2":0.5,"3":0.5},"context_modifiers":{"true_natural":0.5,"on_trt":1,"on_glp1":1.5},"goal_modifiers":{"longevity":2,"cognitive":1,"sleep":1},"bloodwork_triggers":{"inflammation_high":1}},
  {"ingredient_id":"glycine","ingredient_name":"Glycin","category":"aminosaeuren","base_score":7.5,"phase_modifiers":{"0":0.5,"1":1,"2":1,"3":1},"goal_modifiers":{"sleep":2.5,"longevity":1.5},"peptide_class_modifiers":{"gh_secretagogue":2},"bloodwork_triggers":{"homocysteine_high":1}},
  {"ingredient_id":"theanine","ingredient_name":"L-Theanin","category":"aminosaeuren","base_score":8,"phase_modifiers":{"0":1,"1":1,"2":0.5,"3":0},"goal_modifiers":{"cognitive":2,"sleep":1.5},"peptide_class_modifiers":{"nootropic":2},"bloodwork_triggers":{"cortisol_high":2}},
  {"ingredient_id":"tyrosine","ingredient_name":"L-Tyrosin","category":"aminosaeuren","base_score":7,"phase_modifiers":{"0":0.5,"1":1,"2":0.5,"3":0},"context_modifiers":{"on_glp1":1.5},"goal_modifiers":{"cognitive":2,"fat_loss":1,"recomposition":0.5},"bloodwork_triggers":{"thyroid_slow":1.5},"compound_synergies":{"retatrutide":1.5},"warnings":{"thyroid_overactive":"Nicht bei Hyperthyreose"}},
  {"ingredient_id":"tryptophan","ingredient_name":"L-Tryptophan","category":"aminosaeuren","base_score":7,"phase_modifiers":{"0":0.5,"1":0.5,"2":0.5,"3":0.5},"goal_modifiers":{"sleep":2,"cognitive":0.5},"warnings":{"ssri":"Vorsicht bei SSRI-Einnahme – Serotonin-Syndrom möglich"}},
  {"ingredient_id":"5htp","ingredient_name":"5-HTP","category":"aminosaeuren","base_score":6.5,"phase_modifiers":{"0":0.5,"1":0.5,"2":0.5,"3":0},"goal_modifiers":{"sleep":2},"warnings":{"ssri":"KONTRAINDIZIERT bei SSRI – Serotonin-Syndrom!","long_term":"Nicht für Langzeit-Einnahme – kann Dopamin depleten"}},
  {"ingredient_id":"gaba","ingredient_name":"GABA","category":"aminosaeuren","base_score":6,"phase_modifiers":{"0":0.5,"1":0.5,"2":0,"3":0},"goal_modifiers":{"sleep":1.5},"peptide_class_modifiers":{"gh_secretagogue":2},"bloodwork_triggers":{"cortisol_high":1.5},"warnings":{"bioavailability":"Orale Bioverfügbarkeit fraglich – PharmaGABA besser"}},
  {"ingredient_id":"beta_alanine","ingredient_name":"Beta-Alanin","category":"aminosaeuren","base_score":7.5,"phase_modifiers":{"0":0,"1":1,"2":1,"3":0.5},"context_modifiers":{"true_natural":1,"on_trt":0.5},"goal_modifiers":{"muscle_gain":1.5,"recomposition":0.8,"performance":2},"peptide_class_modifiers":{"longevity":2.5},"warnings":{"paresthesia":"Kribbeln normal – harmlos, verschwindet mit Zeit"}},
  {"ingredient_id":"hmb","ingredient_name":"HMB","category":"aminosaeuren","base_score":7,"phase_modifiers":{"0":0.5,"1":2,"2":1,"3":0},"context_modifiers":{"true_natural":3,"enhanced_no_trt":5,"on_trt":-4},"goal_modifiers":{"fat_loss":3,"muscle_gain":1,"recomposition":2.5},"calorie_modifiers":{"in_deficit":3},"peptide_class_modifiers":{"metabolic":2.5},"compound_synergies":{"retatrutide":4,"tirzepatide":3},"warnings":{"on_trt":"TRT schützt Muskeln hormonell – HMB wird redundant","enhanced_no_trt":"KRITISCH bei Peptiden ohne TRT – Muskelabbau-Schutz essentiell!"}},
  {"ingredient_id":"eaa","ingredient_name":"EAA","category":"aminosaeuren","base_score":7.5,"phase_modifiers":{"0":0.5,"1":1.5,"2":1,"3":0.5},"context_modifiers":{"true_natural":1.5,"enhanced_no_trt":3,"on_trt":0},"goal_modifiers":{"muscle_gain":1.5,"fat_loss":1.5,"recomposition":2,"performance":2},"calorie_modifiers":{"in_deficit":3,"in_surplus":2},"peptide_class_modifiers":{"gh_secretagogue":1.5,"metabolic":2.5},"compound_synergies":{"retatrutide":3,"tirzepatide":2},"warnings":{"enhanced_no_trt":"Muskelschutz bei GLP-1 ohne Hormontherapie!"}},
  {"ingredient_id":"bcaa","ingredient_name":"BCAA","category":"aminosaeuren","base_score":6,"phase_modifiers":{"0":0,"1":0.5,"2":0.5,"3":0},"context_modifiers":{"true_natural":0.5,"on_trt":-1},"goal_modifiers":{"muscle_gain":0.5,"recomposition":0.2,"performance":2},"calorie_modifiers":{"in_deficit":3},"peptide_class_modifiers":{"gh_secretagogue":1.5},"warnings":{"general":"EAA sind BCAAs überlegen – enthalten alle essentiellen Aminosäuren"}},
  {"ingredient_id":"lysine","ingredient_name":"L-Lysin","category":"aminosaeuren","base_score":6,"phase_modifiers":{"0":0.5,"1":0.5,"2":0,"3":0},"compound_synergies":{"bpc_157":1.5,"tb_500":1.5}},
  {"ingredient_id":"nac","ingredient_name":"NAC","category":"aminosaeuren","base_score":8,"phase_modifiers":{"0":0.5,"1":1,"2":1,"3":1},"context_modifiers":{"on_trt":1},"goal_modifiers":{"longevity":1.5},"peptide_class_modifiers":{"immune":3},"bloodwork_triggers":{"inflammation_high":2,"homocysteine_high":1.5}},
  {"ingredient_id":"betaine","ingredient_name":"Betain (TMG)","category":"aminosaeuren","base_score":7,"phase_modifiers":{"0":0.5,"1":0.5,"2":0.5,"3":0.5},"context_modifiers":{"true_natural":0.5},"goal_modifiers":{"muscle_gain":1,"longevity":1,"recomposition":0.5},"bloodwork_triggers":{"homocysteine_high":3}},
  {"ingredient_id":"methionine","ingredient_name":"L-Methionin","category":"aminosaeuren","base_score":5,"phase_modifiers":{"0":0,"1":0,"2":0,"3":0},"goal_modifiers":{"longevity":-1},"bloodwork_triggers":{"homocysteine_high":-2},"warnings":{"homocysteine":"Erhöht Homocystein – bei hohen Werten meiden"}},
  {"ingredient_id":"histidine","ingredient_name":"L-Histidin","category":"aminosaeuren","base_score":5,"phase_modifiers":{"0":0,"1":0,"2":0,"3":0}},
  {"ingredient_id":"phenylalanine","ingredient_name":"L-Phenylalanin","category":"aminosaeuren","base_score":5.5,"phase_modifiers":{"0":0,"1":0.5,"2":0,"3":0},"goal_modifiers":{"cognitive":1},"peptide_class_modifiers":{"longevity":2.5},"warnings":{"pku":"Kontraindiziert bei PKU (Phenylketonurie)"}},
  {"ingredient_id":"ornithine","ingredient_name":"L-Ornithin","category":"aminosaeuren","base_score":5.5,"phase_modifiers":{"0":0,"1":0.5,"2":0,"3":0},"context_modifiers":{"true_natural":1},"goal_modifiers":{"sleep":1},"compound_synergies":{"cjc_1295":-2,"ipamorelin":-2},"warnings":{"cjc_ipamorelin":"Redundant bei GH-Sekretagogen"}},
  {"ingredient_id":"threonine","ingredient_name":"L-Threonin","category":"aminosaeuren","base_score":5,"phase_modifiers":{"0":0,"1":0,"2":0,"3":0},"goal_modifiers":{"gut_health":0.5}},
  {"ingredient_id":"leucine","ingredient_name":"L-Leucin","category":"aminosaeuren","base_score":7,"phase_modifiers":{"0":0.5,"1":1,"2":0.5,"3":0},"context_modifiers":{"true_natural":1,"enhanced_no_trt":1.5},"goal_modifiers":{"muscle_gain":1.5,"recomposition":1},"calorie_modifiers":{"in_deficit":2,"in_surplus":1.5}},
  {"ingredient_id":"omega3_epa","ingredient_name":"Omega-3 (EPA/DHA)","category":"fettsaeuren","base_score":9,"phase_modifiers":{"0":1.5,"1":1,"2":0.5,"3":0.5},"context_modifiers":{"true_natural":0.5,"on_trt":1},"goal_modifiers":{"longevity":2,"cognitive":1.5,"fat_loss":1,"recomposition":0.5,"maintenance":1.5},"peptide_class_modifiers":{"nootropic":3,"healing":2},"demographic_modifiers":{"age_over_40":1.5,"age_over_50":2},"bloodwork_triggers":{"inflammation_high":3,"hdl_low":2,"triglycerides_high":3}},
  {"ingredient_id":"omega3_ala","ingredient_name":"Omega-3 (ALA)","category":"fettsaeuren","base_score":5.5,"phase_modifiers":{"0":0.5,"1":0,"2":0,"3":0},"goal_modifiers":{"maintenance":0.5},"warnings":{"conversion":"Konversionsrate zu EPA/DHA sehr gering (<5%)"}},
  {"ingredient_id":"omega6_gla","ingredient_name":"GLA (Gamma-Linolensäure)","category":"fettsaeuren","base_score":5.5,"phase_modifiers":{"0":0.5,"1":0,"2":0,"3":0},"goal_modifiers":{"maintenance":0.5},"peptide_class_modifiers":{"skin":1.5}},
  {"ingredient_id":"mct_oil","ingredient_name":"MCT-Öl","category":"fettsaeuren","base_score":6.5,"phase_modifiers":{"0":0.5,"1":1,"2":0.5,"3":0},"goal_modifiers":{"fat_loss":1.5,"cognitive":1,"recomposition":0.5},"calorie_modifiers":{"in_deficit":1},"warnings":{"calories":"Enthält Kalorien – bei Defizit einrechnen"}},
  {"ingredient_id":"krill_oil","ingredient_name":"Krillöl","category":"fettsaeuren","base_score":8,"phase_modifiers":{"0":1,"1":0.5,"2":0.5,"3":0.5},"goal_modifiers":{"longevity":1.5,"cognitive":1},"bloodwork_triggers":{"inflammation_high":2}},
  {"ingredient_id":"phospholipids","ingredient_name":"Phospholipide","category":"fettsaeuren","base_score":6.5,"phase_modifiers":{"0":0.5,"1":0.5,"2":0,"3":0},"goal_modifiers":{"cognitive":1},"peptide_class_modifiers":{"nootropic":1.5}},
  {"ingredient_id":"ashwagandha","ingredient_name":"Ashwagandha","category":"adaptogene","base_score":8.5,"phase_modifiers":{"0":1,"1":1,"2":0.5,"3":0},"context_modifiers":{"true_natural":2.5,"enhanced_no_trt":1,"on_trt":-2},"goal_modifiers":{"sleep":1.5,"muscle_gain":1,"cognitive":1,"recomposition":0.5},"peptide_class_modifiers":{"testo":1.5},"bloodwork_triggers":{"cortisol_high":3.5,"testosterone_low":2.5,"thyroid_slow":-1},"warnings":{"on_trt":"Bei exogenem Testosteron limitierter Nutzen","thyroid":"Kann Schilddrüse stimulieren – Vorsicht bei Hashimoto/Graves"}},
  {"ingredient_id":"rhodiola","ingredient_name":"Rhodiola Rosea","category":"adaptogene","base_score":7.5,"phase_modifiers":{"0":0.5,"1":1,"2":0.5,"3":0},"goal_modifiers":{"cognitive":1.5,"fat_loss":0.5,"recomposition":0.2,"performance":2},"bloodwork_triggers":{"cortisol_high":2}},
  {"ingredient_id":"ginseng","ingredient_name":"Panax Ginseng","category":"adaptogene","base_score":7,"phase_modifiers":{"0":0.5,"1":1,"2":0.5,"3":0},"context_modifiers":{"true_natural":1},"goal_modifiers":{"cognitive":1,"performance":2},"peptide_class_modifiers":{"testo":1.5},"bloodwork_triggers":{"testosterone_low":1.5}},
  {"ingredient_id":"maca","ingredient_name":"Maca","category":"adaptogene","base_score":6.5,"phase_modifiers":{"0":0.5,"1":0.5,"2":0.5,"3":0.5},"context_modifiers":{"true_natural":1.5,"on_trt":-1},"goal_modifiers":{"muscle_gain":0.5,"recomposition":0.2},"peptide_class_modifiers":{"testo":1}},
  {"ingredient_id":"tongkat_ali","ingredient_name":"Tongkat Ali","category":"adaptogene","base_score":7.5,"phase_modifiers":{"0":1,"1":1,"2":0.5,"3":0},"context_modifiers":{"true_natural":3.5,"enhanced_no_trt":0.5,"on_trt":-4},"goal_modifiers":{"muscle_gain":1.5,"recomposition":1},"peptide_class_modifiers":{"testo":2},"demographic_modifiers":{"is_male":1},"bloodwork_triggers":{"testosterone_low":3.5,"cortisol_high":1.5},"warnings":{"on_trt":"Bei TRT vollständig redundant – exogenes Testosteron macht natürliche Optimierung überflüssig"}},
  {"ingredient_id":"fadogia","ingredient_name":"Fadogia Agrestis","category":"adaptogene","base_score":6,"phase_modifiers":{"0":0.5,"1":0.5,"2":0,"3":0},"context_modifiers":{"true_natural":2,"on_trt":-3},"peptide_class_modifiers":{"testo":1.5},"bloodwork_triggers":{"testosterone_low":2},"warnings":{"on_trt":"Redundant bei TRT","toxicity":"Langzeitsicherheit nicht etabliert – periodisch pausieren"}},
  {"ingredient_id":"schisandra","ingredient_name":"Schisandra","category":"adaptogene","base_score":6.5,"phase_modifiers":{"0":0.5,"1":0.5,"2":0,"3":0.5},"goal_modifiers":{"cognitive":1,"longevity":0.5},"bloodwork_triggers":{"cortisol_high":1.5}},
  {"ingredient_id":"holy_basil","ingredient_name":"Tulsi (Holy Basil)","category":"adaptogene","base_score":6,"phase_modifiers":{"0":0.5,"1":0.5,"2":0,"3":0},"goal_modifiers":{"sleep":1},"bloodwork_triggers":{"cortisol_high":2,"glucose_high":1}},
  {"ingredient_id":"eleuthero","ingredient_name":"Eleuthero","category":"adaptogene","base_score":6,"phase_modifiers":{"0":0.5,"1":0.5,"2":0.5,"3":0},"goal_modifiers":{"performance":2},"bloodwork_triggers":{"cortisol_high":1}},
  {"ingredient_id":"astragalus","ingredient_name":"Astragalus","category":"adaptogene","base_score":6.5,"phase_modifiers":{"0":0.5,"1":0.5,"2":0,"3":0.5},"goal_modifiers":{"longevity":1},"peptide_class_modifiers":{"immune":2}},
  {"ingredient_id":"curcumin","ingredient_name":"Curcumin","category":"polyphenole","base_score":8.5,"phase_modifiers":{"0":1,"1":1,"2":1,"3":1},"context_modifiers":{"on_trt":1.5},"goal_modifiers":{"longevity":2,"cognitive":1},"peptide_class_modifiers":{"healing":3},"demographic_modifiers":{"age_over_40":1.5,"age_over_50":2},"bloodwork_triggers":{"inflammation_high":4},"compound_synergies":{"bpc_157":2,"tb_500":2},"warnings":{"bioavailability":"Ohne Piperin oder Fett schlechte Absorption"}},
  {"ingredient_id":"quercetin","ingredient_name":"Quercetin","category":"polyphenole","base_score":7.5,"phase_modifiers":{"0":0.5,"1":1,"2":0.5,"3":0.5},"goal_modifiers":{"longevity":1.5},"peptide_class_modifiers":{"immune":2.5,"longevity":3},"bloodwork_triggers":{"inflammation_high":2},"compound_synergies":{"epitalon":2}},
  {"ingredient_id":"resveratrol","ingredient_name":"Resveratrol","category":"polyphenole","base_score":7.5,"phase_modifiers":{"0":0.5,"1":0.5,"2":0.5,"3":1},"goal_modifiers":{"longevity":2.5},"peptide_class_modifiers":{"longevity":3},"demographic_modifiers":{"age_over_40":1.5,"age_over_50":2},"bloodwork_triggers":{"inflammation_high":1.5},"compound_synergies":{"epitalon":2}},
  {"ingredient_id":"egcg","ingredient_name":"EGCG (Grüntee)","category":"polyphenole","base_score":7,"phase_modifiers":{"0":0.5,"1":1,"2":0.5,"3":0},"goal_modifiers":{"fat_loss":1.5,"longevity":1,"recomposition":0.8},"calorie_modifiers":{"in_deficit":1},"warnings":{"fasted":"Auf nüchternen Magen kann Übelkeit verursachen"}},
  {"ingredient_id":"pterostilbene","ingredient_name":"Pterostilben","category":"polyphenole","base_score":7,"phase_modifiers":{"0":0.5,"1":0.5,"2":0.5,"3":0.5},"goal_modifiers":{"longevity":2,"cognitive":1},"peptide_class_modifiers":{"longevity":2.5},"demographic_modifiers":{"age_over_40":1.5}},
  {"ingredient_id":"fisetin","ingredient_name":"Fisetin","category":"polyphenole","base_score":7.5,"phase_modifiers":{"0":0.5,"1":0.5,"2":0.5,"3":1},"goal_modifiers":{"longevity":3},"peptide_class_modifiers":{"longevity":3},"demographic_modifiers":{"age_over_40":2,"age_over_50":2.5}},
  {"ingredient_id":"apigenin","ingredient_name":"Apigenin","category":"polyphenole","base_score":7,"phase_modifiers":{"0":0.5,"1":0.5,"2":0.5,"3":0.5},"goal_modifiers":{"sleep":2,"longevity":1},"bloodwork_triggers":{"cortisol_high":1.5}},
  {"ingredient_id":"berberine","ingredient_name":"Berberin","category":"polyphenole","base_score":7.5,"phase_modifiers":{"0":0.5,"1":1.5,"2":1,"3":0.5},"context_modifiers":{"on_glp1":-2},"goal_modifiers":{"fat_loss":2,"longevity":1.5,"recomposition":1},"calorie_modifiers":{"in_deficit":1.5},"bloodwork_triggers":{"glucose_high":3.5,"insulin_resistant":3,"ldl_high":1.5},"compound_synergies":{"retatrutide":-3,"tirzepatide":-2.5},"warnings":{"on_glp1":"Redundant bei GLP-1 – beide senken Blutzucker stark, Hypoglykämie-Risiko!"}},
  {"ingredient_id":"olive_leaf","ingredient_name":"Olivenblattextrakt","category":"polyphenole","base_score":6.5,"phase_modifiers":{"0":0.5,"1":0.5,"2":0.5,"3":0.5},"goal_modifiers":{"longevity":1},"bloodwork_triggers":{"inflammation_high":1.5,"ldl_high":1}},
  {"ingredient_id":"grape_seed","ingredient_name":"Traubenkernextrakt","category":"polyphenole","base_score":6.5,"phase_modifiers":{"0":0.5,"1":0.5,"2":0,"3":0.5},"goal_modifiers":{"longevity":1},"bloodwork_triggers":{"ldl_high":1}},
  {"ingredient_id":"pine_bark","ingredient_name":"Pinienrindenextrakt","category":"polyphenole","base_score":7,"phase_modifiers":{"0":0.5,"1":0.5,"2":0.5,"3":0.5},"goal_modifiers":{"cognitive":1,"longevity":1},"peptide_class_modifiers":{"nootropic":1.5},"bloodwork_triggers":{"inflammation_high":1.5}},
  {"ingredient_id":"citrus_bergamot","ingredient_name":"Citrus Bergamot","category":"polyphenole","base_score":7.5,"phase_modifiers":{"0":0.5,"1":1,"2":1,"3":0.5},"context_modifiers":{"on_trt":2},"goal_modifiers":{"longevity":1},"bloodwork_triggers":{"hdl_low":3.5,"ldl_high":3,"triglycerides_high":2}},
  {"ingredient_id":"lions_mane","ingredient_name":"Lion's Mane","category":"pilze","base_score":8,"phase_modifiers":{"0":1,"1":1,"2":0.5,"3":0.5},"goal_modifiers":{"cognitive":3,"longevity":1},"peptide_class_modifiers":{"nootropic":3.5},"demographic_modifiers":{"age_over_40":1.5,"age_over_50":2}},
  {"ingredient_id":"reishi","ingredient_name":"Reishi","category":"pilze","base_score":7,"phase_modifiers":{"0":0.5,"1":0.5,"2":0.5,"3":0.5},"goal_modifiers":{"sleep":1.5,"longevity":1},"peptide_class_modifiers":{"immune":2},"bloodwork_triggers":{"cortisol_high":1.5}},
  {"ingredient_id":"cordyceps","ingredient_name":"Cordyceps","category":"pilze","base_score":7.5,"phase_modifiers":{"0":0.5,"1":1,"2":0.5,"3":0},"goal_modifiers":{"performance":2.5,"fat_loss":0.5,"recomposition":0.3},"peptide_class_modifiers":{"metabolic":1.5}},
  {"ingredient_id":"chaga","ingredient_name":"Chaga","category":"pilze","base_score":6.5,"phase_modifiers":{"0":0.5,"1":0.5,"2":0,"3":0.5},"goal_modifiers":{"longevity":1},"peptide_class_modifiers":{"immune":2},"bloodwork_triggers":{"inflammation_high":1.5}},
  {"ingredient_id":"turkey_tail","ingredient_name":"Turkey Tail","category":"pilze","base_score":6.5,"phase_modifiers":{"0":0.5,"1":0.5,"2":0,"3":0},"goal_modifiers":{"gut_health":1.5},"peptide_class_modifiers":{"immune":2.5}},
  {"ingredient_id":"shiitake","ingredient_name":"Shiitake","category":"pilze","base_score":5.5,"phase_modifiers":{"0":0.5,"1":0,"2":0,"3":0},"peptide_class_modifiers":{"immune":1.5}},
  {"ingredient_id":"maitake","ingredient_name":"Maitake","category":"pilze","base_score":6,"phase_modifiers":{"0":0.5,"1":0.5,"2":0,"3":0},"peptide_class_modifiers":{"immune":1.5},"bloodwork_triggers":{"glucose_high":1}},
  {"ingredient_id":"coq10","ingredient_name":"CoQ10 / Ubiquinol","category":"longevity","base_score":8.5,"phase_modifiers":{"0":1,"1":1,"2":0.5,"3":0.5},"context_modifiers":{"on_trt":1},"goal_modifiers":{"longevity":2,"cognitive":1},"peptide_class_modifiers":{"longevity":2},"demographic_modifiers":{"age_over_40":2,"age_over_50":3,"age_over_60":4},"bloodwork_triggers":{"inflammation_high":1},"warnings":{"statins":"Bei Statin-Einnahme essentiell – Statine depleten CoQ10"}},
  {"ingredient_id":"pqq","ingredient_name":"PQQ","category":"longevity","base_score":7,"phase_modifiers":{"0":0.5,"1":0.5,"2":0.5,"3":0.5},"goal_modifiers":{"longevity":1.5,"cognitive":1.5},"peptide_class_modifiers":{"longevity":2},"demographic_modifiers":{"age_over_40":1.5}},
  {"ingredient_id":"nmn","ingredient_name":"NMN","category":"longevity","base_score":8,"phase_modifiers":{"0":0.5,"1":0.5,"2":0.5,"3":1},"goal_modifiers":{"longevity":3},"peptide_class_modifiers":{"longevity":3.5},"demographic_modifiers":{"age_over_40":2,"age_over_50":3,"age_over_60":4},"bloodwork_triggers":{"nad_low":4},"compound_synergies":{"epitalon":2,"mots_c":2}},
  {"ingredient_id":"nr","ingredient_name":"NR (Nicotinamid Ribosid)","category":"longevity","base_score":7.5,"phase_modifiers":{"0":0.5,"1":0.5,"2":0.5,"3":0.5},"goal_modifiers":{"longevity":2.5},"peptide_class_modifiers":{"longevity":3},"demographic_modifiers":{"age_over_40":1.5,"age_over_50":2}},
  {"ingredient_id":"ala","ingredient_name":"Alpha-Liponsäure","category":"longevity","base_score":7.5,"phase_modifiers":{"0":0.5,"1":1,"2":0.5,"3":0.5},"goal_modifiers":{"longevity":1.5,"fat_loss":0.5,"recomposition":0.3},"bloodwork_triggers":{"glucose_high":2,"insulin_resistant":1.5}},
  {"ingredient_id":"astaxanthin","ingredient_name":"Astaxanthin","category":"longevity","base_score":7.5,"phase_modifiers":{"0":0.5,"1":0.5,"2":0.5,"3":0.5},"goal_modifiers":{"longevity":1.5,"cognitive":0.5},"peptide_class_modifiers":{"skin":2.5},"bloodwork_triggers":{"inflammation_high":1.5}},
  {"ingredient_id":"glutathione","ingredient_name":"Glutathion","category":"longevity","base_score":8,"phase_modifiers":{"0":0.5,"1":1,"2":1,"3":1},"goal_modifiers":{"longevity":2},"peptide_class_modifiers":{"immune":2},"bloodwork_triggers":{"inflammation_high":2},"warnings":{"form":"Liposomales oder S-Acetyl-L-Glutathion für bessere Absorption"}},
  {"ingredient_id":"spermidine","ingredient_name":"Spermidin","category":"longevity","base_score":8,"phase_modifiers":{"0":0.5,"1":0.5,"2":0.5,"3":1},"goal_modifiers":{"longevity":3},"peptide_class_modifiers":{"longevity":3},"demographic_modifiers":{"age_over_40":2,"age_over_50":2.5,"age_over_60":3},"compound_synergies":{"epitalon":2}},
  {"ingredient_id":"urolithin_a","ingredient_name":"Urolithin A","category":"longevity","base_score":7.5,"phase_modifiers":{"0":0.5,"1":0.5,"2":0.5,"3":0.5},"goal_modifiers":{"longevity":2.5},"peptide_class_modifiers":{"longevity":2.5},"demographic_modifiers":{"age_over_40":1.5,"age_over_50":2},"compound_synergies":{"mots_c":2}},
  {"ingredient_id":"akg","ingredient_name":"Alpha-Ketoglutarat (AKG)","category":"longevity","base_score":7,"phase_modifiers":{"0":0.5,"1":0.5,"2":0.5,"3":0.5},"goal_modifiers":{"longevity":2,"muscle_gain":0.5,"recomposition":0.3},"peptide_class_modifiers":{"longevity":2},"demographic_modifiers":{"age_over_50":2,"age_over_60":2.5}},
  {"ingredient_id":"tudca","ingredient_name":"TUDCA","category":"longevity","base_score":7.5,"phase_modifiers":{"0":0.5,"1":0.5,"2":0.5,"3":1},"context_modifiers":{"on_trt":2},"goal_modifiers":{"longevity":1.5},"bloodwork_triggers":{"liver_stressed":3},"warnings":{"on_trt":"Leberschutz bei oralen Steroiden/erhöhter Leberlast"}},
  {"ingredient_id":"probiotics_lacto","ingredient_name":"Probiotika (Lactobacillus)","category":"gut_health","base_score":7.5,"phase_modifiers":{"0":1,"1":0.5,"2":0.5,"3":0.5},"context_modifiers":{"on_glp1":2},"goal_modifiers":{"gut_health":3,"longevity":0.5},"peptide_class_modifiers":{"metabolic":1.5},"bloodwork_triggers":{"inflammation_high":1},"compound_synergies":{"retatrutide":1.5}},
  {"ingredient_id":"probiotics_bifido","ingredient_name":"Probiotika (Bifidobacterium)","category":"gut_health","base_score":7,"phase_modifiers":{"0":1,"1":0.5,"2":0.5,"3":0.5},"goal_modifiers":{"gut_health":2.5}},
  {"ingredient_id":"probiotics_saccha","ingredient_name":"Saccharomyces Boulardii","category":"gut_health","base_score":6.5,"phase_modifiers":{"0":0.5,"1":0.5,"2":0.5,"3":0.5},"goal_modifiers":{"gut_health":2}},
  {"ingredient_id":"prebiotics","ingredient_name":"Präbiotika (FOS/GOS)","category":"gut_health","base_score":6.5,"phase_modifiers":{"0":0.5,"1":0.5,"2":0.5,"3":0.5},"goal_modifiers":{"gut_health":2}},
  {"ingredient_id":"digestive_enzymes","ingredient_name":"Verdauungsenzyme","category":"gut_health","base_score":6,"phase_modifiers":{"0":0.5,"1":0.5,"2":0.5,"3":0},"context_modifiers":{"on_glp1":1.5},"goal_modifiers":{"gut_health":1.5},"compound_synergies":{"retatrutide":1}},
  {"ingredient_id":"collagen","ingredient_name":"Kollagen","category":"joints","base_score":7.5,"phase_modifiers":{"0":0.5,"1":0.5,"2":0.5,"3":1},"goal_modifiers":{"longevity":0.5},"peptide_class_modifiers":{"healing":2.5,"gh_secretagogue":2,"skin":3},"demographic_modifiers":{"age_over_40":1.5,"is_female":1},"compound_synergies":{"bpc_157":2,"tb_500":1.5,"cjc_1295":1.5,"ipamorelin":1.5}},
  {"ingredient_id":"glucosamine","ingredient_name":"Glucosamin","category":"joints","base_score":6.5,"phase_modifiers":{"0":0.5,"1":0.5,"2":0.5,"3":0.5},"goal_modifiers":{"longevity":0.5},"demographic_modifiers":{"age_over_40":1.5,"age_over_50":2}},
  {"ingredient_id":"chondroitin","ingredient_name":"Chondroitin","category":"joints","base_score":6,"phase_modifiers":{"0":0.5,"1":0.5,"2":0.5,"3":0.5},"demographic_modifiers":{"age_over_40":1,"age_over_50":1.5}},
  {"ingredient_id":"msm","ingredient_name":"MSM","category":"joints","base_score":6.5,"phase_modifiers":{"0":0.5,"1":0.5,"2":0.5,"3":0.5},"goal_modifiers":{"performance":0.5},"peptide_class_modifiers":{"healing":1.5},"bloodwork_triggers":{"inflammation_high":1}},
  {"ingredient_id":"hyaluronic_acid","ingredient_name":"Hyaluronsäure","category":"joints","base_score":6,"phase_modifiers":{"0":0.5,"1":0.5,"2":0.5,"3":0.5},"peptide_class_modifiers":{"skin":2},"demographic_modifiers":{"age_over_40":1,"is_female":1}},
  {"ingredient_id":"boswellia","ingredient_name":"Boswellia","category":"joints","base_score":7,"phase_modifiers":{"0":0.5,"1":0.5,"2":0.5,"3":0.5},"bloodwork_triggers":{"inflammation_high":2.5}},
  {"ingredient_id":"type2_collagen","ingredient_name":"Typ-II-Kollagen (UC-II)","category":"joints","base_score":7,"phase_modifiers":{"0":0.5,"1":0.5,"2":0.5,"3":0.5},"demographic_modifiers":{"age_over_40":1.5}},
  {"ingredient_id":"citicoline","ingredient_name":"Citicolin (CDP-Cholin)","category":"nootropics","base_score":8,"phase_modifiers":{"0":1,"1":1,"2":0.5,"3":0.5},"goal_modifiers":{"cognitive":3},"peptide_class_modifiers":{"nootropic":3}},
  {"ingredient_id":"alpha_gpc","ingredient_name":"Alpha-GPC","category":"nootropics","base_score":7.5,"phase_modifiers":{"0":0.5,"1":1,"2":0.5,"3":0},"goal_modifiers":{"cognitive":2.5,"muscle_gain":0.5,"recomposition":0.2,"performance":2},"peptide_class_modifiers":{"gh_secretagogue":2,"nootropic":2.5}},
  {"ingredient_id":"ps","ingredient_name":"Phosphatidylserin","category":"nootropics","base_score":7.5,"phase_modifiers":{"0":0.5,"1":0.5,"2":0.5,"3":0.5},"goal_modifiers":{"cognitive":2,"sleep":0.5},"peptide_class_modifiers":{"nootropic":2},"demographic_modifiers":{"age_over_40":1.5},"bloodwork_triggers":{"cortisol_high":2.5}},
  {"ingredient_id":"huperzine","ingredient_name":"Huperzin A","category":"nootropics","base_score":6.5,"phase_modifiers":{"0":0.5,"1":0.5,"2":0.5,"3":0},"goal_modifiers":{"cognitive":2},"peptide_class_modifiers":{"nootropic":1.5},"warnings":{"cycling":"Nicht dauerhaft – Pausen einlegen (5 Tage on, 2 off)"}},
  {"ingredient_id":"bacopa","ingredient_name":"Bacopa Monnieri","category":"nootropics","base_score":7,"phase_modifiers":{"0":0.5,"1":0.5,"2":0.5,"3":0.5},"goal_modifiers":{"cognitive":2.5},"peptide_class_modifiers":{"nootropic":2},"warnings":{"onset":"Braucht 8-12 Wochen für volle Wirkung"}},
  {"ingredient_id":"vinpocetine","ingredient_name":"Vinpocetin","category":"nootropics","base_score":6,"phase_modifiers":{"0":0.5,"1":0.5,"2":0,"3":0},"goal_modifiers":{"cognitive":1.5},"peptide_class_modifiers":{"nootropic":1.5}},
  {"ingredient_id":"whey","ingredient_name":"Whey Protein","category":"protein","base_score":8,"phase_modifiers":{"0":0.5,"1":1,"2":1,"3":0.5},"context_modifiers":{"true_natural":1,"enhanced_no_trt":2},"goal_modifiers":{"muscle_gain":2,"fat_loss":1,"recomposition":1.5,"performance":2},"calorie_modifiers":{"in_deficit":2,"in_surplus":1.5},"peptide_class_modifiers":{"metabolic":2},"compound_synergies":{"retatrutide":2.5,"tirzepatide":2},"warnings":{"enhanced_no_trt":"Proteinaufnahme kritisch bei GLP-1 ohne Hormonschutz"}},
  {"ingredient_id":"casein","ingredient_name":"Casein","category":"protein","base_score":7,"phase_modifiers":{"0":0.5,"1":0.5,"2":0.5,"3":0.5},"goal_modifiers":{"muscle_gain":1.5,"fat_loss":0.5,"recomposition":0.8},"calorie_modifiers":{"in_deficit":1.5}},
  {"ingredient_id":"collagen_peptides","ingredient_name":"Kollagen-Peptide","category":"protein","base_score":7,"phase_modifiers":{"0":0.5,"1":0.5,"2":0.5,"3":1},"peptide_class_modifiers":{"healing":2,"skin":2.5},"demographic_modifiers":{"age_over_40":1.5,"is_female":1}},
  {"ingredient_id":"plant_protein","ingredient_name":"Pflanzenprotein","category":"protein","base_score":6.5,"phase_modifiers":{"0":0.5,"1":0.5,"2":0.5,"3":0.5},"goal_modifiers":{"muscle_gain":1,"fat_loss":0.5,"recomposition":0.5},"calorie_modifiers":{"in_deficit":1}},
  {"ingredient_id":"caffeine","ingredient_name":"Koffein","category":"sonstige","base_score":7,"phase_modifiers":{"0":0.5,"1":1.5,"2":1,"3":0},"goal_modifiers":{"fat_loss":1.5,"cognitive":1,"recomposition":0.8,"performance":2},"calorie_modifiers":{"in_deficit":1},"warnings":{"tolerance":"Toleranzentwicklung – periodisch pausieren","sleep":"Nicht nach 14 Uhr bei Schlafproblemen"}},
  {"ingredient_id":"melatonin","ingredient_name":"Melatonin","category":"sonstige","base_score":7,"phase_modifiers":{"0":0.5,"1":0.5,"2":0.5,"3":0.5},"goal_modifiers":{"sleep":3,"longevity":0.5},"demographic_modifiers":{"age_over_50":1.5},"warnings":{"dependency":"Nicht dauerhaft – Pausen einlegen","dose":"Niedrig dosieren (0.3-1mg) für physiologische Wirkung"}},
  {"ingredient_id":"dim","ingredient_name":"DIM","category":"sonstige","base_score":6.5,"phase_modifiers":{"0":0.5,"1":0.5,"2":0.5,"3":0.5},"context_modifiers":{"on_trt":2.5},"goal_modifiers":{"fat_loss":0.5,"recomposition":0.2},"bloodwork_triggers":{"estrogen_high":3},"warnings":{"natural":"Für Naturals oft unnötig – mehr für TRT-User"}},
  {"ingredient_id":"psyllium","ingredient_name":"Flohsamenschalen","category":"sonstige","base_score":6.5,"phase_modifiers":{"0":0.5,"1":0.5,"2":0.5,"3":0.5},"goal_modifiers":{"gut_health":2,"fat_loss":0.5,"recomposition":0.2},"bloodwork_triggers":{"glucose_high":1,"ldl_high":1}},
  {"ingredient_id":"electrolytes","ingredient_name":"Elektrolyte","category":"sonstige","base_score":8,"phase_modifiers":{"0":0.5,"1":2,"2":1.5,"3":0.5},"context_modifiers":{"on_glp1":4},"goal_modifiers":{"fat_loss":2,"performance":2.5,"recomposition":1},"calorie_modifiers":{"in_deficit":2},"peptide_class_modifiers":{"metabolic":3},"compound_synergies":{"retatrutide":4,"tirzepatide":3.5,"semaglutide":3},"warnings":{"retatrutide":"ABSOLUT ESSENTIELL bei Retatrutide – Elektrolytverlust kann gefährlich werden!"}},
  {"ingredient_id":"shilajit","ingredient_name":"Shilajit","category":"sonstige","base_score":6.5,"phase_modifiers":{"0":0.5,"1":0.5,"2":0.5,"3":0.5},"context_modifiers":{"true_natural":1.5,"on_trt":-1},"peptide_class_modifiers":{"testo":1.5},"bloodwork_triggers":{"testosterone_low":1.5}},
  {"ingredient_id":"turkesterone","ingredient_name":"Turkesteron","category":"sonstige","base_score":5.5,"phase_modifiers":{"0":0.5,"1":0.5,"2":0.5,"3":0},"context_modifiers":{"true_natural":1,"on_trt":-2},"goal_modifiers":{"muscle_gain":1,"recomposition":0.5},"warnings":{"evidence":"Begrenzte Evidenz – Wirkung beim Menschen nicht gesichert","on_trt":"Komplett redundant bei TRT"}},
  {"ingredient_id":"milk_thistle","ingredient_name":"Mariendistel (Silymarin)","category":"sonstige","base_score":7,"phase_modifiers":{"0":0.5,"1":0.5,"2":0.5,"3":0.5},"context_modifiers":{"on_trt":2},"goal_modifiers":{"longevity":0.5},"bloodwork_triggers":{"liver_stressed":3},"warnings":{"on_trt":"Leberschutz essentiell bei oralen Steroiden/erhöhter Leberlast"}},
  {"ingredient_id":"black_seed_oil","ingredient_name":"Schwarzkümmelöl","category":"sonstige","base_score":7,"phase_modifiers":{"0":0.5,"1":0.5,"2":0.5,"3":0.5},"goal_modifiers":{"longevity":1},"peptide_class_modifiers":{"immune":1.5},"bloodwork_triggers":{"inflammation_high":1.5,"glucose_high":1}},
  {"ingredient_id":"glynac","ingredient_name":"GlyNAC","category":"sonstige","base_score":8,"phase_modifiers":{"0":0.5,"1":1,"2":1,"3":1},"goal_modifiers":{"longevity":2.5},"peptide_class_modifiers":{"longevity":3},"demographic_modifiers":{"age_over_40":2,"age_over_50":2.5,"age_over_60":3},"bloodwork_triggers":{"inflammation_high":2},"compound_synergies":{"epitalon":1.5},"warnings":{"synergy":"Kombination aus Glycin + NAC – synergistische Glutathion-Produktion"}}
];

function normalizeForMatch(name: string): string {
  return name.toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findMatch(ingredientId: string, ingredientName: string, dbSupplements: Array<{id: string, name: string}>): {dbId: string, dbName: string, matchType: string} | null {
  // Try manual override first
  const patterns = MANUAL_OVERRIDES[ingredientId];
  if (patterns) {
    for (const pattern of patterns) {
      const normalizedPattern = normalizeForMatch(pattern);
      for (const supp of dbSupplements) {
        const normalizedDb = normalizeForMatch(supp.name);
        if (normalizedDb === normalizedPattern || normalizedDb.includes(normalizedPattern) || normalizedPattern.includes(normalizedDb)) {
          return { dbId: supp.id, dbName: supp.name, matchType: 'manual' };
        }
      }
    }
  }
  
  // Try exact match on ingredient name
  const normalizedImport = normalizeForMatch(ingredientName);
  for (const supp of dbSupplements) {
    const normalizedDb = normalizeForMatch(supp.name);
    if (normalizedDb === normalizedImport) {
      return { dbId: supp.id, dbName: supp.name, matchType: 'exact' };
    }
  }
  
  // Try fuzzy match
  for (const supp of dbSupplements) {
    const normalizedDb = normalizeForMatch(supp.name);
    if (normalizedDb.includes(normalizedImport) || normalizedImport.includes(normalizedDb)) {
      return { dbId: supp.id, dbName: supp.name, matchType: 'fuzzy' };
    }
  }
  
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[Matrix Import] Starting full import with ${MATRIX_DATA.length} ingredients...`);

    // Fetch all supplements from DB
    const { data: dbSupplements, error: fetchError } = await supabase
      .from('supplement_database')
      .select('id, name')
      .order('name');
    
    if (fetchError) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch supplements: ${fetchError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Matrix Import] Found ${dbSupplements?.length || 0} supplements in database`);

    const results = {
      updated: [] as Array<{dbName: string, importName: string, matchType: string}>,
      skipped: [] as Array<{importName: string, reason: string}>,
      errors: [] as string[],
    };

    // Process each ingredient
    for (const ingredient of MATRIX_DATA) {
      const match = findMatch(ingredient.ingredient_id, ingredient.ingredient_name, dbSupplements || []);
      
      if (!match) {
        results.skipped.push({
          importName: ingredient.ingredient_name,
          reason: 'No database match found',
        });
        continue;
      }

      // Build the relevance_matrix object
      const matrix: Record<string, unknown> = {};
      if (ingredient.phase_modifiers) matrix.phase_modifiers = ingredient.phase_modifiers;
      if (ingredient.context_modifiers) matrix.context_modifiers = ingredient.context_modifiers;
      if (ingredient.goal_modifiers) matrix.goal_modifiers = ingredient.goal_modifiers;
      if (ingredient.calorie_modifiers) matrix.calorie_modifiers = ingredient.calorie_modifiers;
      if (ingredient.peptide_class_modifiers) matrix.peptide_class_modifiers = ingredient.peptide_class_modifiers;
      if (ingredient.demographic_modifiers) matrix.demographic_modifiers = ingredient.demographic_modifiers;
      if (ingredient.bloodwork_triggers) matrix.bloodwork_triggers = ingredient.bloodwork_triggers;
      if (ingredient.compound_synergies) matrix.compound_synergies = ingredient.compound_synergies;
      if ((ingredient as any).warnings) matrix.explanation_templates = (ingredient as any).warnings;

      // Update the database
      const { error: updateError } = await supabase
        .from('supplement_database')
        .update({ relevance_matrix: matrix })
        .eq('id', match.dbId);
      
      if (updateError) {
        results.errors.push(`Update failed for ${ingredient.ingredient_name}: ${updateError.message}`);
      } else {
        results.updated.push({
          dbName: match.dbName,
          importName: ingredient.ingredient_name,
          matchType: match.matchType,
        });
      }
    }

    console.log(`[Matrix Import] Complete: ${results.updated.length} updated, ${results.skipped.length} skipped, ${results.errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: results.errors.length === 0,
        totalProcessed: MATRIX_DATA.length,
        totalUpdated: results.updated.length,
        totalSkipped: results.skipped.length,
        totalErrors: results.errors.length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('[Matrix Import] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
