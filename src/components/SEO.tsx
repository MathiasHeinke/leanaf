import { useEffect } from 'react';

type Props = {
  title: string;
  description?: string;
  canonical?: string; // path or full URL
};

export default function SEO({ title, description, canonical }: Props) {
  useEffect(() => {
    document.title = title;

    if (description) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'description');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', description);
    }

    if (canonical) {
      const href = canonical.startsWith('http') ? canonical : window.location.origin + canonical;
      let link = document.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', href);
    }
  }, [title, description, canonical]);

  return null;
}
