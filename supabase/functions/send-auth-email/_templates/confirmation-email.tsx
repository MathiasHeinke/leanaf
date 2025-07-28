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

interface ConfirmationEmailProps {
  user_name: string;
  confirmation_url: string;
  app_url: string;
}

export const ConfirmationEmailTemplate = ({ user_name, confirmation_url, app_url }: ConfirmationEmailProps) => (
  <Html>
    <Head />
    <Preview>Bestätigen Sie Ihre E-Mail-Adresse für KaloAI</Preview>
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
        
        <Heading style={h1}>Fast geschafft, {user_name}! 🚀</Heading>
        
        <Text style={text}>
          Vielen Dank für Ihre Registrierung bei KaloAI! Um Ihr Konto zu aktivieren und alle Funktionen zu nutzen, bestätigen Sie bitte Ihre E-Mail-Adresse.
        </Text>
        
        <Section style={ctaSection}>
          <Button href={confirmation_url} style={button}>
            E-Mail-Adresse bestätigen
          </Button>
        </Section>
        
        <Text style={alternativeText}>
          Falls der Button nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:
        </Text>
        <Text style={urlText}>
          {confirmation_url}
        </Text>
        
        <Section style={infoBox}>
          <Text style={infoTitle}>⚡ Was Sie nach der Bestätigung erwartet:</Text>
          <Text style={infoItem}>✅ Vollzugriff auf alle KI-Coaches</Text>
          <Text style={infoItem}>✅ Unbegrenzte Mahlzeiten-Analysen</Text>
          <Text style={infoItem}>✅ Personalisierte Trainings-Empfehlungen</Text>
          <Text style={infoItem}>✅ Detaillierte Fortschritts-Reports</Text>
        </Section>
        
        <Text style={securityText}>
          <strong>🔒 Sicherheitshinweis:</strong> Dieser Link ist aus Sicherheitsgründen nur 24 Stunden gültig. Falls er abgelaufen ist, können Sie über die App eine neue Bestätigung anfordern.
        </Text>
        
        <Text style={footer}>
          Freuen Sie sich auf Ihre Fitness-Reise!<br />
          Ihr KaloAI-Team 💪
        </Text>
        
        <Text style={disclaimer}>
          Sie erhalten diese E-Mail, weil Sie sich bei KaloAI registriert haben. Falls Sie sich nicht registriert haben, ignorieren Sie diese E-Mail einfach.
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

const text = {
  color: '#4a4a4a',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '16px 40px',
  textAlign: 'center' as const,
};

const ctaSection = {
  textAlign: 'center' as const,
  margin: '32px 40px',
};

const button = {
  backgroundColor: '#10b981',
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
  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
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

const infoBox = {
  margin: '32px 40px',
  padding: '24px',
  backgroundColor: '#ecfdf5',
  borderRadius: '8px',
  border: '1px solid #d1fae5',
};

const infoTitle = {
  color: '#1a1a1a',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 16px',
};

const infoItem = {
  color: '#4a4a4a',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '8px 0',
};

const securityText = {
  color: '#dc2626',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '24px 40px',
  padding: '16px',
  backgroundColor: '#fef2f2',
  borderRadius: '8px',
  border: '1px solid #fecaca',
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

export default ConfirmationEmailTemplate;