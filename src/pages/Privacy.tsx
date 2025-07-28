import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Privacy() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">
          Datenschutzerklärung
        </h1>
        <p className="text-sm text-muted-foreground">
          Gültig ab 01. Januar 2025 | DSGVO-konform
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">1. Verantwortlicher</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              Verantwortlicher für die Datenverarbeitung ist der Betreiber der KaloAI-App. 
              Kontaktdaten finden Sie im Impressum.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">2. Erhobene Daten</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <h4 className="font-medium">Gesundheits- und Körperdaten:</h4>
            <ul className="list-disc pl-6 space-y-1">
              <li>Gewicht, Größe, Alter, Geschlecht</li>
              <li>Körpermaße (Brust, Taille, Hüfte, etc.)</li>
              <li>Körperfettanteil und Muskelmasse</li>
              <li>Blutdruck, Puls (falls eingegeben)</li>
              <li>Schlafqualität und -dauer</li>
              <li>Trainingsaktivitäten und Leistungsdaten</li>
              <li>Ernährungsdaten und Kalorienzufuhr</li>
              <li>Fortschrittsfotos</li>
            </ul>
            
            <h4 className="font-medium mt-4">Nutzungsdaten:</h4>
            <ul className="list-disc pl-6 space-y-1">
              <li>Interaktionen mit der App</li>
              <li>Chat-Verläufe mit KI-Coaches</li>
              <li>Präferenzen und Einstellungen</li>
              <li>Nutzungszeiten und -häufigkeit</li>
            </ul>

            <h4 className="font-medium mt-4">Technische Daten:</h4>
            <ul className="list-disc pl-6 space-y-1">
              <li>IP-Adresse (anonymisiert)</li>
              <li>Geräte-Informationen</li>
              <li>Browser-Typ und -Version</li>
              <li>Betriebssystem</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">3. Zweck der Datenverarbeitung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>Ihre Daten werden verarbeitet für:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Personalisierte Beratung:</strong> KI-gestützte Ernährungs- und Trainingsempfehlungen</li>
              <li><strong>Fortschrittstracking:</strong> Überwachung Ihrer Gesundheits- und Fitnessziele</li>
              <li><strong>App-Funktionalität:</strong> Bereitstellung der Core-Features</li>
              <li><strong>Bildanalyse:</strong> Automatische Erkennung von Mahlzeiten und Körperanalyse</li>
              <li><strong>Wissenschaftliche Auswertung:</strong> Anonymisierte Analyse zur Verbesserung der Algorithmen</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">4. KI und externe Services</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <h4 className="font-medium">OpenAI Integration:</h4>
            <p>
              Wir nutzen OpenAI's API für KI-gestützte Funktionen. Dabei werden folgende Daten übertragen:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Chat-Nachrichten und Anfragen</li>
              <li>Kontextualisierte Gesundheitsdaten für personalisierte Antworten</li>
              <li>Bilder für Mahlzeiten- und Körperanalyse</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-2">
              OpenAI speichert diese Daten gemäß ihrer Datenschutzrichtlinie. 
              Eine Nutzung für das Training ihrer Modelle ist ausgeschlossen.
            </p>

            <h4 className="font-medium mt-4">Supabase (Datenbank):</h4>
            <p>
              Ihre Daten werden sicher in der EU (Frankfurt) auf Supabase-Servern gespeichert.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">5. Rechtsgrundlagen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Art. 6 Abs. 1 lit. a DSGVO:</strong> Einwilligung für Gesundheitsdatenverarbeitung</li>
              <li><strong>Art. 6 Abs. 1 lit. b DSGVO:</strong> Vertragserfüllung für App-Services</li>
              <li><strong>Art. 6 Abs. 1 lit. f DSGVO:</strong> Berechtigtes Interesse für Funktionalität</li>
              <li><strong>Art. 9 Abs. 2 lit. a DSGVO:</strong> Explizite Einwilligung für Gesundheitsdaten</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">6. Datenspeicherung und -löschung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Gesundheitsdaten:</strong> Solange das Konto aktiv ist + 3 Jahre nach Löschung</li>
              <li><strong>Chat-Verläufe:</strong> 2 Jahre nach letzter Aktivität</li>
              <li><strong>Fotos:</strong> Bis zur manuellen Löschung durch den Nutzer</li>
              <li><strong>Anonymisierte Statistiken:</strong> Unbegrenzt für wissenschaftliche Zwecke</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">7. Ihre Rechte</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>Sie haben folgende Rechte bezüglich Ihrer Daten:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Auskunft:</strong> Information über gespeicherte Daten</li>
              <li><strong>Berichtigung:</strong> Korrektur falscher Daten</li>
              <li><strong>Löschung:</strong> Vollständige Entfernung Ihrer Daten</li>
              <li><strong>Einschränkung:</strong> Beschränkung der Verarbeitung</li>
              <li><strong>Datenübertragbarkeit:</strong> Export Ihrer Daten</li>
              <li><strong>Widerspruch:</strong> Gegen KI-Verarbeitung und Profiling</li>
              <li><strong>Widerruf:</strong> Jederzeit Einwilligung zurückziehen</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">8. Datensicherheit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>Wir schützen Ihre Daten durch:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Ende-zu-Ende-Verschlüsselung (AES-256)</li>
              <li>Sichere HTTPS-Verbindungen</li>
              <li>Regelmäßige Sicherheitsaudits</li>
              <li>Minimale Datenspeicherung (Privacy by Design)</li>
              <li>Pseudonymisierung sensibler Daten</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">9. Cookies und Tracking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              Wir verwenden nur technisch notwendige Cookies für die App-Funktionalität. 
              Kein Analytics-Tracking oder Werbecookies.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">10. Kontakt und Beschwerden</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              Bei Fragen zum Datenschutz kontaktieren Sie uns über die Angaben im Impressum.
            </p>
            <p>
              Beschwerderecht bei der zuständigen Datenschutzaufsichtsbehörde gemäß Art. 77 DSGVO.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}