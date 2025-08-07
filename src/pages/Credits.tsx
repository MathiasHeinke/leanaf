import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Coins, ShieldCheck, Zap, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useCredits } from '@/hooks/useCredits';

const packs = [
  { id: 'pack_1000', credits: 1000, priceCents: 499, label: '1.000 Credits', price: '4,99€' },
  { id: 'pack_2500', credits: 2500, priceCents: 999, label: '2.500 Credits', price: '9,99€' },
  { id: 'pack_5000', credits: 5000, priceCents: 1799, label: '5.000 Credits', price: '17,99€' },
];

const Credits: React.FC = () => {
  const navigate = useNavigate();
  const { creditsInfo, refresh } = useCredits();

  // Basic SEO
  useEffect(() => {
    document.title = 'Credits & Packs – GetLean AI';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'Credits & Packs für GetLean AI: Lade Credits auf (1.000/2.500/5.000) und nutze Analysen, Coach-Chat und Bilderzeugung.');
    const link = document.querySelector('link[rel="canonical"]') || document.createElement('link');
    link.setAttribute('rel', 'canonical');
    link.setAttribute('href', window.location.origin + '/credits');
    if (!link.isConnected) document.head.appendChild(link);
  }, []);

  const handleBuy = async (packId: string) => {
    const { data, error } = await supabase.functions.invoke('create-credit-payment', {
      body: { pack: packId },
      headers: {
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
      }
    });
    if (error) return console.error(error);
    if (data?.url) {
      window.open(data.url, '_blank');
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <header className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Credits & Packs</h1>
        <p className="text-sm text-muted-foreground mt-1">Flexibel statt Abo: Zahle nur, was du wirklich nutzt – ab 4,99€.</p>
      </header>

      <section className="container mx-auto px-4 sm:px-6 lg:px-8 grid gap-6 md:grid-cols-3">
        {packs.map(p => (
          <Card key={p.id} className="border">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{p.label}</span>
                <span className="text-primary font-semibold">{p.price}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2"><Zap className="h-4 w-4" /> Sofort nutzbar für Analysen & Chat</li>
                <li className="flex items-center gap-2"><Clock className="h-4 w-4" /> Verfällt nicht am Monatsende</li>
                <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Sicher via Stripe</li>
              </ul>
              <Button className="w-full" onClick={() => handleBuy(p.id)}>
                <Coins className="h-4 w-4 mr-2" /> Jetzt kaufen
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Warum Packs monatlich Sinn machen</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>Mit kleinen Beträgen starten (z. B. 5€) und flexibel nachladen. Ideal für Fokus-Phasen, ohne Abo-Zwang.</p>
              <p>Wer das Coaching liebt, holt sich automatisch mehr Credits – transparent, fair, planbar.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Dein aktueller Stand</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <div className="flex items-center justify-between">
                <span>Verfügbare Credits</span>
                <strong>{creditsInfo.remaining}</strong>
              </div>
              <Button variant="outline" className="mt-3" onClick={() => refresh()}>Aktualisieren</Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* JSON-LD structured data for products */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        itemListElement: packs.map((p, i) => ({
          '@type': 'Product',
          position: i + 1,
          name: `${p.credits} Credits Pack`,
          description: 'Credits für AI-Analysen, Coach-Chat und Bilderzeugung',
          offers: {
            '@type': 'Offer',
            priceCurrency: 'EUR',
            price: (p.priceCents / 100).toFixed(2),
            availability: 'https://schema.org/InStock'
          }
        }))
      }) }} />
    </main>
  );
};

export default Credits;
