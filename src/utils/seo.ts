// Simple SEO utility to set default title, description and canonical link
export const applyDefaultSEO = () => {
  // Title
  const defaultTitle = 'Food Scribe Coach – Ernährung, Training & Mindset';
  if (document.title.trim().length === 0) {
    document.title = defaultTitle;
  }

  // Meta description (max ~160 chars)
  const defaultDescription = 'Dein intelligenter Coach für Ernährung, Training und Mindset. Ziele erreichen mit Daten, KI-Insights und persönlicher Motivation.';
  let desc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
  if (!desc) {
    desc = document.createElement('meta');
    desc.name = 'description';
    document.head.appendChild(desc);
  }
  if (!desc.content) {
    desc.content = defaultDescription;
  }

  // Canonical link
  const canonicalHref = `${window.location.origin}${window.location.pathname}`;
  let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = canonicalHref;
};
