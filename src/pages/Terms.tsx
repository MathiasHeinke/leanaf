import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Terms() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">
          Allgemeine Geschäftsbedingungen (AGB)
        </h1>
        <p className="text-sm text-muted-foreground">
          Gültig ab 01. Januar 2025
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">§ 1 Geltungsbereich</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              Diese Allgemeinen Geschäftsbedingungen (nachfolgend "AGB") gelten für die Nutzung der KaloAI-Anwendung 
              (nachfolgend "App"), einem intelligenten Gesundheits- und Fitness-Coach mit KI-Unterstützung.
            </p>
            <p>
              Durch die Registrierung und Nutzung der App erkennen Sie diese AGB als verbindlich an.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">§ 2 Leistungsbeschreibung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              KaloAI bietet folgende Dienstleistungen:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Personalisierte Ernährungs- und Trainingsberatung durch KI-gestützte Coaches</li>
              <li>Analyse von Gesundheits- und Fitnessdaten</li>
              <li>Bildanalyse von Mahlzeiten und Fortschrittsfotos</li>
              <li>Individuelle Empfehlungen basierend auf wissenschaftlichen Erkenntnissen</li>
              <li>Community-Features und Gamification-Elemente</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">§ 3 Gesundheitshinweise</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="font-medium text-amber-600">
              WICHTIGER HINWEIS: Diese App ersetzt keine professionelle medizinische Beratung!
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Die bereitgestellten Informationen dienen ausschließlich der allgemeinen Information</li>
              <li>Bei gesundheitlichen Problemen konsultieren Sie immer einen Arzt</li>
              <li>Die App-Empfehlungen sind nicht für Personen unter 18 Jahren geeignet</li>
              <li>Bei Schwangerschaft, Stillzeit oder chronischen Erkrankungen ist ärztliche Rücksprache erforderlich</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">§ 4 Nutzungsrechte und -pflichten</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>Der Nutzer verpflichtet sich:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Wahrheitsgemäße Angaben zu machen</li>
              <li>Die App nur für den vorgesehenen Zweck zu nutzen</li>
              <li>Keine schädlichen oder illegalen Inhalte hochzuladen</li>
              <li>Die Rechte Dritter zu respektieren</li>
              <li>Seine Zugangsdaten geheim zu halten</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">§ 5 KI und Datenverarbeitung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              Unsere App nutzt fortschrittliche KI-Technologien, einschließlich Services von OpenAI:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Ihre Daten werden zur Bereitstellung personalisierter Empfehlungen verarbeitet</li>
              <li>KI-Analysen erfolgen auf Basis der von Ihnen bereitgestellten Informationen</li>
              <li>Externe KI-Services (OpenAI) verarbeiten Daten gemäß deren Datenschutzbestimmungen</li>
              <li>Sie können der KI-gestützten Analyse jederzeit widersprechen</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">§ 6 Haftung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              Die Haftung von KaloAI ist auf Vorsatz und grobe Fahrlässigkeit beschränkt. 
              Eine Haftung für die Richtigkeit der KI-generierten Empfehlungen wird ausgeschlossen.
            </p>
            <p>
              Insbesondere übernehmen wir keine Haftung für gesundheitliche Schäden, die durch 
              die Befolgung der App-Empfehlungen entstehen könnten.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">§ 7 Kündigung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              Das Nutzungsverhältnis kann von beiden Seiten jederzeit ohne Angabe von Gründen gekündigt werden. 
              Bei kostenpflichtigen Abonnements gelten die jeweiligen Vertragslaufzeiten.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">§ 8 Änderungen der AGB</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              Wir behalten uns vor, diese AGB jederzeit zu ändern. Über wesentliche Änderungen 
              werden Sie rechtzeitig informiert. Widersprechen Sie nicht innerhalb von 4 Wochen, 
              gelten die Änderungen als akzeptiert.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">§ 9 Schlussbestimmungen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              Es gilt deutsches Recht. Sollten einzelne Bestimmungen unwirksam sein, 
              bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}