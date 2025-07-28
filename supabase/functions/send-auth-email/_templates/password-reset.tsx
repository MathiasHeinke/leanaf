import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface PasswordResetEmailProps {
  user_name: string;
  reset_url: string;
  app_url: string;
}

export const PasswordResetEmailTemplate = ({ user_name, reset_url, app_url }: PasswordResetEmailProps) => (
  <Html>
    <Head />
    <Preview>Passwort zurücksetzen - KaloAI</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img
            src={`${app_url}/kai-logo.png`}
            width="120"
            height="40"
            alt="KaloAI"
            style={logo}
          />
        </Section>
        
        <Heading style={h1}>Passwort zurücksetzen 🔐</Heading>
        
        <Text style={greeting}>
          Hallo {user_name},
        </Text>
        
        <Text style={text}>
          Sie haben eine Anfrage zum Zurücksetzen Ihres KaloAI-Passworts gestellt. Kein Problem - das passiert jedem mal!
        </Text>
        
        <Section style={ctaSection}>
          <Button href={reset_url} style={button}>
            Neues Passwort erstellen
          </Button>
        </Section>
        
        <Text style={alternativeText}>
          Falls der Button nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:
        </Text>
        <Text style={urlText}>
          {reset_url}
        </Text>
        
        <Section style={securityBox}>
          <Text style={securityTitle}>🛡️ Wichtige Sicherheitshinweise:</Text>
          <Text style={securityItem}>• Dieser Link ist nur 1 Stunde gültig</Text>
          <Text style={securityItem}>• Der Link kann nur einmal verwendet werden</Text>
          <Text style={securityItem}>• Wählen Sie ein starkes, neues Passwort</Text>
          <Text style={securityItem}>• Verwenden Sie keine einfachen Passwörter wie "123456"</Text>
        </Section>
        
        <Section style={tipsBox}>
          <Text style={tipsTitle}>💡 Tipps für ein sicheres Passwort:</Text>
          <Text style={tipItem}>✓ Mindestens 12 Zeichen lang</Text>
          <Text style={tipItem}>✓ Kombination aus Groß- und Kleinbuchstaben</Text>
          <Text style={tipItem}>✓ Zahlen und Sonderzeichen verwenden</Text>
          <Text style={tipItem}>✓ Keine persönlichen Informationen</Text>
        </Section>
        
        <Text style={notRequestedText}>
          <strong>Sie haben diese Anfrage nicht gestellt?</strong><br />
          Ignorieren Sie diese E-Mail einfach. Ihr Passwort bleibt unverändert und sicher.
        </Text>
        
        <Text style={footer}>
          Bei Fragen sind wir für Sie da!<br />
          Ihr KaloAI-Team 💪
        </Text>
        
        <Text style={disclaimer}>
          Aus Sicherheitsgründen loggen wir alle Passwort-Änderungen. Falls Sie verdächtige Aktivitäten bemerken, kontaktieren Sie uns sofort.
        </Text>
      </Container>
    </Body>
  </Html>
);

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  borderRadius: '12px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
};

const logoSection = {
  padding: '32px 40px',
  textAlign: 'center' as const,
  borderBottom: '1px solid #f0f0f0',
};

const logo = {
  margin: '0 auto',
};

const h1 = {
  color: '#1a1a1a',
  fontSize: '28px',
  fontWeight: '700',
  margin: '32px 40px 24px',
  padding: '0',
  textAlign: 'center' as const,
};

const greeting = {
  color: '#4a4a4a',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '16px 40px 8px',
};

const text = {
  color: '#4a4a4a',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '8px 40px 24px',
};

const ctaSection = {
  textAlign: 'center' as const,
  margin: '32px 40px',
};

const button = {
  backgroundColor: '#ef4444',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
  border: 'none',
  cursor: 'pointer',
  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
};

const alternativeText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '24px 40px 8px',
  textAlign: 'center' as const,
};

const urlText = {
  color: '#3b82f6',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0 40px 24px',
  textAlign: 'center' as const,
  wordBreak: 'break-all',
  backgroundColor: '#f8fafc',
  padding: '12px',
  borderRadius: '6px',
};

const securityBox = {
  margin: '32px 40px',
  padding: '24px',
  backgroundColor: '#fef2f2',
  borderRadius: '8px',
  border: '1px solid #fecaca',
};

const securityTitle = {
  color: '#dc2626',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 16px',
};

const securityItem = {
  color: '#7f1d1d',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '8px 0',
};

const tipsBox = {
  margin: '32px 40px',
  padding: '24px',
  backgroundColor: '#f0f9ff',
  borderRadius: '8px',
  border: '1px solid #bae6fd',
};

const tipsTitle = {
  color: '#0c4a6e',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 16px',
};

const tipItem = {
  color: '#0369a1',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '8px 0',
};

const notRequestedText = {
  color: '#dc2626',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '24px 40px',
  padding: '16px',
  backgroundColor: '#fef2f2',
  borderRadius: '8px',
  textAlign: 'center' as const,
};

const footer = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '32px 40px 16px',
  textAlign: 'center' as const,
};

const disclaimer = {
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '1.5',
  margin: '16px 40px',
  textAlign: 'center' as const,
};

export default PasswordResetEmailTemplate;