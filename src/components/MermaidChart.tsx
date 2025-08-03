import { useEffect, useRef } from 'react';

interface MermaidChartProps {
  chart: string;
  className?: string;
}

export default function MermaidChart({ chart, className = '' }: MermaidChartProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !ref.current) return;
    
    // Dynamic import to avoid SSR issues
    import('mermaid').then((mermaid) => {
      mermaid.default.initialize({ 
        startOnLoad: false, 
        theme: 'base',
        themeVariables: {
          primaryColor: 'hsl(var(--primary))',
          primaryTextColor: 'hsl(var(--primary-foreground))',
          primaryBorderColor: 'hsl(var(--border))',
          lineColor: 'hsl(var(--border))',
          secondaryColor: 'hsl(var(--secondary))',
          tertiaryColor: 'hsl(var(--muted))',
          background: 'hsl(var(--background))',
          mainBkg: 'hsl(var(--card))',
          secondBkg: 'hsl(var(--muted))',
          tertiaryBkg: 'hsl(var(--accent))'
        }
      });
      
      const elementId = `mermaid-${Date.now()}`;
      mermaid.default.render(elementId, chart).then((result) => {
        if (ref.current) {
          ref.current.innerHTML = result.svg;
        }
      }).catch((error) => {
        console.error('Mermaid render error:', error);
        if (ref.current) {
          ref.current.innerHTML = '<p class="text-destructive">Chart render failed</p>';
        }
      });
    }).catch((error) => {
      console.error('Mermaid import error:', error);
      if (ref.current) {
        ref.current.innerHTML = '<p class="text-destructive">Chart not available</p>';
      }
    });
  }, [chart]);

  return <div ref={ref} className={`mermaid-container ${className}`} />;
}