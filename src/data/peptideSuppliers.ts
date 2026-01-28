// ARES Peptid-Bezugsquellen v3.0
// Supplier-Liste mit Qualitäts-Einschätzung

export interface PeptideSupplier {
  name: string;
  country: 'DE' | 'EU' | 'US' | 'UK' | 'RU';
  website: string;
  shipping_to_de: boolean;
  quality_tier: 'verified' | 'standard' | 'unknown';
  specialization: string[];
  notes: string;
}

export const PEPTIDE_SUPPLIERS: PeptideSupplier[] = [
  // EU/DE Supplier
  {
    name: 'BPS Pharma',
    country: 'DE',
    website: 'bps-pharma.de',
    shipping_to_de: true,
    quality_tier: 'verified',
    specialization: ['BPC-157', 'TB-500', 'Epitalon', 'Blends'],
    notes: 'Deutscher Shop. BPC-157 Tropfen (sublingual) und Blends verfügbar.'
  },
  {
    name: 'Peptide Power EU',
    country: 'EU',
    website: 'peptidepowereu.com',
    shipping_to_de: true,
    quality_tier: 'verified',
    specialization: ['GHK-Cu', 'Ipamorelin', 'CJC-1295', 'Pre-filled Pens'],
    notes: 'EU-basiert. Pre-filled Pens für einfache Anwendung.'
  },
  {
    name: 'Verified Peptides',
    country: 'EU',
    website: 'verifiedpeptides.eu',
    shipping_to_de: true,
    quality_tier: 'verified',
    specialization: ['BPC-157', 'TB-500', 'Ipamorelin', 'Blends'],
    notes: 'EU-Shipping. Third-party tested.'
  },
  {
    name: 'Core Peptides',
    country: 'EU',
    website: 'corepeptides.eu',
    shipping_to_de: true,
    quality_tier: 'standard',
    specialization: ['MOTS-c', 'BPC-157', 'TB-500', 'Ipamorelin'],
    notes: 'EU-Lab. Research only.'
  },
  {
    name: 'Cell Peptides',
    country: 'EU',
    website: 'cellpeptides.com',
    shipping_to_de: true,
    quality_tier: 'verified',
    specialization: ['MOTS-c', 'SS-31', 'Longevity Peptides'],
    notes: 'Spezialisiert auf Longevity-Peptide. Premium-Qualität.'
  },
  {
    name: 'PharmaLabGlobal EU',
    country: 'EU',
    website: 'pharmalabglobal.eu',
    shipping_to_de: true,
    quality_tier: 'standard',
    specialization: ['Epitalon', 'Allgemein'],
    notes: 'Breites Sortiment. EU-Shipping.'
  },
  {
    name: 'Beyond Peptides',
    country: 'EU',
    website: 'beyond-peptides.com',
    shipping_to_de: true,
    quality_tier: 'verified',
    specialization: ['BPC-157', 'TB-500', 'GHK-Cu', 'Allgemein'],
    notes: 'EU-Shop. Sehr gute Nutzererfahrungen. Empfohlen.'
  },
  {
    name: 'Primal Peptides',
    country: 'EU',
    website: 'primalpeptides.nl',
    shipping_to_de: true,
    quality_tier: 'verified',
    specialization: ['BPC-157', 'TB-500', 'Ipamorelin', 'Allgemein'],
    notes: 'Niederlande. Sehr gute Nutzererfahrungen. Empfohlen.'
  },
  {
    name: 'Biowell Labs',
    country: 'EU',
    website: 'biowelllabs.com',
    shipping_to_de: true,
    quality_tier: 'unknown',
    specialization: ['Retatrutide', 'GHK-Cu', 'Metabolic'],
    notes: 'EU-Lab. Negative Nutzererfahrungen gemeldet. Vorsicht empfohlen.'
  },
  {
    name: 'DN Research',
    country: 'EU',
    website: 'dnresearch.eu',
    shipping_to_de: true,
    quality_tier: 'verified',
    specialization: ['Retatrutide', 'GLP-1', 'Pre-filled Pens'],
    notes: 'GMP EU. Pre-filled Pens für GLP-1 Agonisten.'
  },
  {
    name: '24Peptides',
    country: 'EU',
    website: '24peptides.com',
    shipping_to_de: true,
    quality_tier: 'standard',
    specialization: ['Retatrutide', 'Allgemein'],
    notes: '99.7%+ Reinheit. Research only.'
  },

  // UK Supplier
  {
    name: 'UK-Peptides',
    country: 'UK',
    website: 'uk-peptides.com',
    shipping_to_de: true,
    quality_tier: 'standard',
    specialization: ['Epitalon', 'BPC-157', 'Allgemein'],
    notes: 'UK-basiert. Günstige Epitalon-Vials.'
  },
  {
    name: 'Peptide Regenesis',
    country: 'UK',
    website: 'peptideregenesis.co.uk',
    shipping_to_de: true,
    quality_tier: 'standard',
    specialization: ['SS-31', 'Longevity'],
    notes: 'UK-Research. SS-31 Spezialist.'
  },

  // US Supplier (EU-Shipping)
  {
    name: 'Peptide Sciences',
    country: 'US',
    website: 'peptidesciences.com',
    shipping_to_de: true,
    quality_tier: 'verified',
    specialization: ['MOTS-c', 'Allgemein', 'Research-Grade'],
    notes: 'US-Premium. Third-party HPLC. Zoll-Risiko bei Import.'
  },
  {
    name: 'Biotech Peptides',
    country: 'US',
    website: 'biotechpeptides.com',
    shipping_to_de: true,
    quality_tier: 'standard',
    specialization: ['Ipamorelin', 'CJC-1295', 'GH-Stack'],
    notes: 'USA-made. Zoll-Risiko.'
  },

  // Nootropics (Russland)
  {
    name: 'Cosmic Nootropic',
    country: 'RU',
    website: 'cosmicnootropic.com',
    shipping_to_de: true,
    quality_tier: 'verified',
    specialization: ['Semax', 'Selank', 'Pinealon', 'DSIP'],
    notes: 'Import aus Russland. Semax/Selank sind dort zugelassene Medikamente. Grauzone EU.'
  },

  // Topical/Specialty
  {
    name: 'Synthagen Labs',
    country: 'EU',
    website: 'synthagenlab.com',
    shipping_to_de: true,
    quality_tier: 'standard',
    specialization: ['GHK-Cu', 'Oral Capsules'],
    notes: 'GHK-Cu als orale Kapseln verfügbar.'
  },
  {
    name: 'BioLabShop',
    country: 'EU',
    website: 'biolabshop.eu',
    shipping_to_de: true,
    quality_tier: 'standard',
    specialization: ['GHK-Cu', 'Allgemein'],
    notes: 'Lyophilisierte Vials.'
  }
];

export const getSuppliersByCountry = (country: PeptideSupplier['country']): PeptideSupplier[] => {
  return PEPTIDE_SUPPLIERS.filter(s => s.country === country);
};

export const getVerifiedSuppliers = (): PeptideSupplier[] => {
  return PEPTIDE_SUPPLIERS.filter(s => s.quality_tier === 'verified');
};

export const getSuppliersBySpecialization = (peptide: string): PeptideSupplier[] => {
  return PEPTIDE_SUPPLIERS.filter(s => 
    s.specialization.some(spec => 
      spec.toLowerCase().includes(peptide.toLowerCase())
    )
  );
};
