
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from '@/hooks/useTranslation';

interface Quote {
  id: string;
  quote_text: string;
  author?: string;
}

interface RandomQuoteProps {
  userGender?: string;
  fallbackText?: string;
  refreshTrigger?: number;
}

export const RandomQuote = ({ userGender, fallbackText = "Bleib motiviert! 💪", refreshTrigger }: RandomQuoteProps) => {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const { language } = useTranslation();

  useEffect(() => {
    loadRandomQuote();
  }, [userGender, refreshTrigger, language]);

  const loadRandomQuote = async () => {
    try {
      setLoading(true);
      
      // Only load quotes for male and female users
      if (userGender !== 'male' && userGender !== 'female') {
        setQuote(null);
        setLoading(false);
        return;
      }

      // Select the appropriate table based on gender
      const tableName = userGender === 'male' ? 'men_quotes' : 'women_quotes';

      // Get random quote from database filtered by language
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('language', language)
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
    return fallbackText ? <span className="text-muted-foreground text-sm animate-pulse">{fallbackText}</span> : null;
  }

  // If no quote or not male/female user, show fallback only if provided
  if (!quote || (userGender !== 'male' && userGender !== 'female')) {
    return fallbackText ? <span className="text-muted-foreground text-sm">{fallbackText}</span> : null;
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
