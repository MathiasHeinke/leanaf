import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useCredits } from '@/hooks/useCredits';

const CreditsSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refresh } = useCredits();
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [details, setDetails] = useState<{ added?: number; balance?: number; message?: string }>({});

  useEffect(() => {
    document.title = 'Zahlung erfolgreich – Credits';
    const sessionId = searchParams.get('session_id');
    if (!sessionId) {
      setState('error');
      setDetails({ message: 'Keine Session-ID gefunden.' });
      return;
    }
    (async () => {
      const { data, error } = await supabase.functions.invoke('apply-credits-after-payment', {
        body: { session_id: sessionId },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });
      if (error) {
        setState('error');
        setDetails({ message: error.message });
      } else {
        setState('success');
        setDetails({ added: data?.credits_added, balance: data?.credits_remaining });
        refresh();
      }
    })();
  }, []);

  return (
    <main className="min-h-screen container mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <CardTitle>Credits Aufladung</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {state === 'loading' && <p>Wird geprüft…</p>}
          {state === 'success' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-green-600"><CheckCircle2 className="h-5 w-5" /> Zahlung erfolgreich!</div>
              <p>Hinzugefügt: <strong>{details.added}</strong> Credits</p>
              <p>Neuer Kontostand: <strong>{details.balance}</strong> Credits</p>
              <Button className="mt-2" onClick={() => navigate('/credits')}>Zurück zu Credits & Packs</Button>
            </div>
          )}
          {state === 'error' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-red-600"><XCircle className="h-5 w-5" /> Fehler</div>
              <p>{details.message || 'Es ist ein Fehler aufgetreten.'}</p>
              <Button variant="outline" className="mt-2" onClick={() => navigate('/credits')}>Zurück</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
};

export default CreditsSuccess;
