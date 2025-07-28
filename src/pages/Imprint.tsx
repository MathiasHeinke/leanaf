import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Imprint() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">
          Impressum
        </h1>
        <p className="text-sm text-muted-foreground">
          Angaben gemäß § 5 TMG
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Anbieter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="font-medium">KaloAI GmbH</p>
              <p>Musterstraße 123</p>
              <p>12345 Musterstadt</p>
              <p>Deutschland</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Kontakt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p><strong>Telefon:</strong> +49 (0) 123 456789</p>
              <p><strong>E-Mail:</strong> info@kaloai.com</p>
              <p><strong>Website:</strong> www.kaloai.com</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Geschäftsführung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>Max Mustermann</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Handelsregister</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p><strong>Registergericht:</strong> Amtsgericht Musterstadt</p>
              <p><strong>Registernummer:</strong> HRB 12345</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Umsatzsteuer-ID</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:
              <br />
              DE123456789
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Verantwortlich für den Inhalt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV:
              <br />
              Max Mustermann
              <br />
              Musterstraße 123
              <br />
              12345 Musterstadt
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Streitschlichtung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: 
              <a href="https://ec.europa.eu/consumers/odr/" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                https://ec.europa.eu/consumers/odr/
              </a>
            </p>
            <p>
              Unsere E-Mail-Adresse finden Sie oben im Impressum.
            </p>
            <p>
              Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer 
              Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Haftung für Inhalte</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den 
              allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht 
              unter der Verpflichtung, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach 
              Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Haftung für Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. 
              Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten 
              Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Urheberrecht</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen 
              Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der 
              Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Gesundheitshinweis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="font-medium text-amber-600">
              WICHTIGER HINWEIS:
            </p>
            <p>
              Die in der KaloAI-App bereitgestellten Informationen dienen ausschließlich der allgemeinen Information 
              und ersetzen in keinem Fall eine professionelle medizinische Beratung, Diagnose oder Behandlung. 
              Konsultieren Sie bei gesundheitlichen Fragen oder Beschwerden immer einen Arzt oder qualifizierten 
              Gesundheitsdienstleister.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}