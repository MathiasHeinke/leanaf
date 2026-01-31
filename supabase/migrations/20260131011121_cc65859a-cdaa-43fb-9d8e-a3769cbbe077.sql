-- Add Amazon Generic brand for generic/white-label products
INSERT INTO supplement_brands (name, slug, country, website, price_tier, description)
VALUES ('Amazon Generic', 'amazon-generic', 'DE', 'amazon.de', 'budget', 
        'Amazon Eigenmarken und generische Produkte')
ON CONFLICT (slug) DO NOTHING;