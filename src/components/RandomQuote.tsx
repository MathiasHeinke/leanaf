import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Quote {
  id: string;
  quote_text: string;
  author?: string;
}

interface RandomQuoteProps {
  userGender?: string;
  fallbackText?: string;
}

export const RandomQuote = ({ userGender, fallbackText = "Willkommen bei KaloTracker" }: RandomQuoteProps) => {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRandomQuote();
  }, []);

  const loadRandomQuote = async () => {
    try {
      setLoading(true);
      
      // Only load quotes for male users
      if (userGender !== 'male') {
        setQuote(null);
        setLoading(false);
        return;
      }

      // Get random quote from database
      const { data, error } = await supabase
        .from('men_quotes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading quotes:', error);
        setQuote(null);
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        // Select random quote
        const randomIndex = Math.floor(Math.random() * data.length);
        setQuote(data[randomIndex]);
      } else {
        setQuote(null);
      }
    } catch (error) {
      console.error('Error loading random quote:', error);
      setQuote(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <span className="text-muted-foreground text-sm animate-pulse">{fallbackText}</span>;
  }

  // If no quote or not male user, show fallback
  if (!quote || userGender !== 'male') {
    return <span className="text-muted-foreground text-sm">{fallbackText}</span>;
  }

  return (
    <div className="text-muted-foreground text-sm">
      <p className="italic">"{quote.quote_text}"</p>
      {quote.author && (
        <p className="text-xs mt-1 text-right">- {quote.author}</p>
      )}
    </div>
  );
};