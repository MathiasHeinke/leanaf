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

interface WelcomeEmailProps {
  user_name: string;
  app_url: string;
}

export const WelcomeEmailTemplate = ({ user_name, app_url }: WelcomeEmailProps) => (
  <Html>
    <Head />
    <Preview>Willkommen bei KaloAI - Ihre Fitness-Reise beginnt jetzt!</Preview>
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
        
        <Heading style={h1}>Willkommen bei KaloAI, {user_name}! 🎉</Heading>
        
        <Text style={text}>
          Herzlich willkommen in der KaloAI-Community! Wir freuen uns riesig, Sie auf Ihrer Fitness-Reise zu begleiten.
        </Text>
        
        <Text style={text}>
          <strong>Was Sie als nächstes erwartet:</strong>
        </Text>
        
        <Section style={featuresSection}>
          <Text style={featureItem}>🍎 <strong>Intelligente Mahlzeiten-Analyse</strong> - Fotografieren Sie Ihr Essen und erhalten Sie sofortige Nährwertangaben</Text>
          <Text style={featureItem}>🏋️ <strong>Personalisierte Trainings-Pläne</strong> - Workouts, die sich an Ihre Ziele anpassen</Text>
          <Text style={featureItem}>🤖 <strong>KI-Coaches</strong> - Experten-Beratung rund um die Uhr</Text>
          <Text style={featureItem}>📊 <strong>Fortschritts-Tracking</strong> - Sehen Sie Ihre Erfolge in übersichtlichen Grafiken</Text>
        </Section>
        
        <Section style={ctaSection}>
          <Button href={app_url} style={button}>
            Jetzt durchstarten
          </Button>
        </Section>
        
        <Text style={tipText}>
          <strong>💡 Profi-Tipp:</strong> Starten Sie mit dem Fotografieren Ihrer nächsten Mahlzeit - unsere KI-Analyse wird Sie begeistern!
        </Text>
        
        <Section style={socialSection}>
          <Text style={socialText}>Folgen Sie uns für tägliche Fitness-Tipps:</Text>
          <Link href="#" style={socialLink}>Instagram</Link> • 
          <Link href="#" style={socialLink}>YouTube</Link> • 
          <Link href="#" style={socialLink}>TikTok</Link>
        </Section>
        
        <Text style={footer}>
          Mit sportlichen Grüßen,<br />
          Ihr KaloAI-Team 💪
        </Text>
        
        <Text style={disclaimer}>
          Sie erhalten diese E-Mail, weil Sie sich bei KaloAI registriert haben. 
          <Link href={`${app_url}/unsubscribe`} style={link}>Abmelden</Link>
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
};

const featuresSection = {
  margin: '32px 40px',
  padding: '24px',
  backgroundColor: '#f8fafc',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
};

const featureItem = {
  color: '#4a4a4a',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '12px 0',
};

const ctaSection = {
  textAlign: 'center' as const,
  margin: '32px 40px',
};

const button = {
  backgroundColor: '#3b82f6',
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
  boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
};

const tipText = {
  ...text,
  backgroundColor: '#fef3c7',
  padding: '16px',
  borderRadius: '8px',
  borderLeft: '4px solid #f59e0b',
  margin: '24px 40px',
};

const socialSection = {
  textAlign: 'center' as const,
  margin: '32px 40px',
  padding: '20px',
  borderTop: '1px solid #f0f0f0',
};

const socialText = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0 0 8px',
};

const socialLink = {
  color: '#3b82f6',
  textDecoration: 'none',
  fontSize: '14px',
  margin: '0 8px',
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

const link = {
  color: '#3b82f6',
  textDecoration: 'underline',
};

export default WelcomeEmailTemplate;