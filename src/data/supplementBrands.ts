// ARES Supplement-Hersteller Datenbank v3.0
// 16 deutsche/EU Marken mit Metadaten

export interface SupplementBrand {
  name: string;
  slug: string;
  country: 'DE' | 'US' | 'EU' | 'UK';
  website: string;
  price_tier: 'budget' | 'mid' | 'premium' | 'luxury';
  specialization: string[];
  quality_certifications: string[];
  description: string;
}

export const SUPPLEMENT_BRANDS: SupplementBrand[] = [
  // Tier 0: Pharmacy Premium (Neu hinzugefügt)
  {
    name: 'Biogena',
    slug: 'biogena',
    country: 'EU',
    website: 'biogena.com',
    price_tier: 'luxury',
    specialization: ['longevity', 'premium', 'reinsubstanzen'],
    quality_certifications: ['GMP', 'ISO22000', 'HACCP'],
    description: 'Salzburger Premium-Hersteller. Reinsubstanzen ohne Zusätze.'
  },
  
  // Tier 1: Premium Longevity & Qualität
  {
    name: 'Sunday Natural',
    slug: 'sunday-natural',
    country: 'DE',
    website: 'sunday.de',
    price_tier: 'premium',
    specialization: ['longevity', 'premium', 'vegan'],
    quality_certifications: ['GMP', 'ISO', 'vegan'],
    description: 'Premium Vitamine & Longevity-Supplements aus Deutschland. Höchste Qualitätsstandards.'
  },
  {
    name: 'MoleQlar',
    slug: 'moleqlar',
    country: 'DE',
    website: 'moleqlar.com',
    price_tier: 'luxury',
    specialization: ['longevity', 'research', 'nmn'],
    quality_certifications: ['GMP', 'pharma-grade'],
    description: 'Longevity-Spezialist. NMN, Resveratrol, Spermidin. Wissenschaftlich fundiert.'
  },
  {
    name: 'Naturtreu',
    slug: 'naturtreu',
    country: 'DE',
    website: 'naturtreu.de',
    price_tier: 'mid',
    specialization: ['natural', 'vegan', 'clean'],
    quality_certifications: ['vegan', 'organic', 'made-in-de'],
    description: 'Natürlich, vegan, Made in Germany. Gutes Preis-Leistungs-Verhältnis.'
  },
  {
    name: 'Lebenskraft-pur',
    slug: 'lebenskraft-pur',
    country: 'DE',
    website: 'lebenskraft-pur.de',
    price_tier: 'premium',
    specialization: ['holistic', 'naturopathy'],
    quality_certifications: ['organic', 'vegan'],
    description: 'Ganzheitliche Naturheilkunde. Premium-Qualität.'
  },

  // Tier 2: Sport & Fitness
  {
    name: 'ESN',
    slug: 'esn',
    country: 'DE',
    website: 'esn.com',
    price_tier: 'mid',
    specialization: ['sport', 'fitness', 'protein'],
    quality_certifications: ['GMP', 'made-in-de'],
    description: 'Sport-Supplements, Kreatin, EAAs. Deutschlands größter Sport-Supplement-Hersteller.'
  },
  {
    name: 'More Nutrition',
    slug: 'more-nutrition',
    country: 'DE',
    website: 'morenutrition.de',
    price_tier: 'mid',
    specialization: ['sport', 'influencer', 'fitness'],
    quality_certifications: ['GMP', 'made-in-de'],
    description: 'Sport-Supplements, Influencer-Brand. Bekannt durch Christian Giesemann.'
  },
  {
    name: 'ProFuel',
    slug: 'profuel',
    country: 'DE',
    website: 'profuel.de',
    price_tier: 'budget',
    specialization: ['sport', 'vegan'],
    quality_certifications: ['vegan', 'made-in-de'],
    description: 'Vegane Sport-Supplements. Günstig und qualitativ.'
  },
  {
    name: 'Bulk',
    slug: 'bulk',
    country: 'UK',
    website: 'bulk.com',
    price_tier: 'budget',
    specialization: ['sport', 'basics', 'budget'],
    quality_certifications: ['GMP'],
    description: 'Günstige Basics. Kreatin, Aminosäuren, Proteine. Beste Preis-Leistung.'
  },

  // Tier 3: Apotheke & Klassisch
  {
    name: 'Centrum',
    slug: 'centrum',
    country: 'US',
    website: 'centrum.de',
    price_tier: 'mid',
    specialization: ['multivitamin', 'classic', 'pharmacy'],
    quality_certifications: ['GMP', 'pharma-grade'],
    description: 'Weltweit führender Multivitamin-Hersteller. Apotheken-Qualität.'
  },
  {
    name: 'Doppelherz',
    slug: 'doppelherz',
    country: 'DE',
    website: 'doppelherz.de',
    price_tier: 'mid',
    specialization: ['pharmacy', 'classic'],
    quality_certifications: ['pharma-grade'],
    description: 'Klassiker in deutschen Apotheken. Seit über 100 Jahren.'
  },
  {
    name: 'Orthomol',
    slug: 'orthomol',
    country: 'DE',
    website: 'orthomol.de',
    price_tier: 'luxury',
    specialization: ['pharmacy', 'medical', 'premium'],
    quality_certifications: ['pharma-grade', 'medical'],
    description: 'Apotheken-Premium. Orthomolekulare Medizin. Höchste Standards.'
  },
  {
    name: 'Nature Love',
    slug: 'nature-love',
    country: 'DE',
    website: 'naturelove.de',
    price_tier: 'mid',
    specialization: ['amazon', 'vegan', 'natural'],
    quality_certifications: ['vegan', 'made-in-de'],
    description: 'Amazon-Bestseller. Gute Qualität, faire Preise.'
  },

  // Tier 4: International (in DE verfügbar)
  {
    name: 'Now Foods',
    slug: 'now-foods',
    country: 'US',
    website: 'nowfoods.com',
    price_tier: 'budget',
    specialization: ['basics', 'budget', 'broad'],
    quality_certifications: ['GMP', 'kosher'],
    description: 'Breites Sortiment, günstig. Über Amazon DE verfügbar.'
  },
  {
    name: 'Life Extension',
    slug: 'life-extension',
    country: 'US',
    website: 'lifeextensioneurope.de',
    price_tier: 'premium',
    specialization: ['longevity', 'research', 'premium'],
    quality_certifications: ['GMP', 'research-grade'],
    description: 'Longevity-Fokus, US-Qualität. Wissenschaftlich fundiert.'
  },
  {
    name: 'Thorne',
    slug: 'thorne',
    country: 'US',
    website: 'thorne.com',
    price_tier: 'luxury',
    specialization: ['premium', 'sport', 'medical'],
    quality_certifications: ['NSF-certified', 'pharma-grade'],
    description: 'Premium, Profi-Sport. NSF-zertifiziert. Höchste Reinheit.'
  },
  {
    name: 'Nordic Naturals',
    slug: 'nordic-naturals',
    country: 'US',
    website: 'nordicnaturals.com',
    price_tier: 'premium',
    specialization: ['omega-3', 'fish-oil'],
    quality_certifications: ['IFOS', 'sustainable'],
    description: 'Omega-3 Spezialist. Höchste Reinheit, nachhaltig gefischt.'
  },
  {
    name: "Doctor's Best",
    slug: 'doctors-best',
    country: 'US',
    website: 'drbvitamins.com',
    price_tier: 'mid',
    specialization: ['research', 'quality', 'value'],
    quality_certifications: ['GMP', 'research-grade'],
    description: 'Qualität und Forschung. Gutes Preis-Leistungs-Verhältnis.'
  }
];

export const getBrandBySlug = (slug: string): SupplementBrand | undefined => {
  return SUPPLEMENT_BRANDS.find(b => b.slug === slug);
};

export const getBrandsByTier = (tier: SupplementBrand['price_tier']): SupplementBrand[] => {
  return SUPPLEMENT_BRANDS.filter(b => b.price_tier === tier);
};

export const getGermanBrands = (): SupplementBrand[] => {
  return SUPPLEMENT_BRANDS.filter(b => b.country === 'DE');
};
