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

interface NewsletterProps {
  user_name: string;
  content: string;
  tips: string[];
  app_url: string;
}

export const NewsletterTemplate = ({ user_name, content, tips, app_url }: NewsletterProps) => (
  <Html>
    <Head />
    <Preview>KaloAI Newsletter - Ihre wöchentlichen Fitness-Tipps</Preview>
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
          <Text style={newsletterBadge}>NEWSLETTER</Text>
        </Section>
        
        <Heading style={h1}>Hallo {user_name}! 👋</Heading>
        
        <Text style={text}>
          {content}
        </Text>
        
        <Section style={tipsSection}>
          <Text style={tipsTitle}>💡 Ihre Wochen-Tipps:</Text>
          {tips.map((tip, index) => (
            <Text key={index} style={tipItem}>• {tip}</Text>
          ))}
        </Section>
        
        <Section style={statsSection}>
          <Text style={statsTitle}>📊 Wussten Sie schon?</Text>
          <Text style={statItem}>
            <strong>85%</strong> unserer Nutzer erreichen ihre Ziele schneller mit regelmäßigem Tracking
          </Text>
          <Text style={statItem}>
            <strong>3x</strong> höhere Erfolgsrate bei Nutzern, die täglich ihre Mahlzeiten fotografieren
          </Text>
        </Section>
        
        <Section style={ctaSection}>
          <Button href={app_url} style={button}>
            App öffnen & weitermachen
          </Button>
        </Section>
        
        <Section style={featuredSection}>
          <Text style={featuredTitle}>🌟 Feature der Woche:</Text>
          <Text style={featuredText}>
            <strong>KI-Meal-Prep Assistent</strong> - Lassen Sie unsere KI Ihre Mahlzeiten für die ganze Woche planen! 
            Basierend auf Ihren Vorlieben und Zielen.
          </Text>
          <Button href={`${app_url}/features`} style={secondaryButton}>
            Neue Features entdecken
          </Button>
        </Section>
        
        <Section style={socialSection}>
          <Text style={socialTitle}>📱 Folgen Sie uns:</Text>
          <Link href="#" style={socialLink}>Instagram</Link> • 
          <Link href="#" style={socialLink}>YouTube</Link> • 
          <Link href="#" style={socialLink}>TikTok</Link>
        </Section>
        
        <Text style={footer}>
          Bleiben Sie dran und erreichen Sie Ihre Ziele!<br />
          Ihr KaloAI-Team 💪
        </Text>
        
        <Text style={disclaimer}>
          Sie erhalten diesen Newsletter, weil Sie bei KaloAI angemeldet sind.
          <Link href={`${app_url}/unsubscribe`} style={link}> Abmelden</Link> |
          <Link href={`${app_url}/preferences`} style={link}> E-Mail-Einstellungen</Link>
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
  padding: '32px 40px 24px',
  textAlign: 'center' as const,
  borderBottom: '1px solid #f0f0f0',
  position: 'relative' as const,
};

const logo = {
  margin: '0 auto',
};

const newsletterBadge = {
  backgroundColor: '#3b82f6',
  color: '#ffffff',
  fontSize: '10px',
  fontWeight: '600',
  padding: '4px 8px',
  borderRadius: '4px',
  marginTop: '8px',
  display: 'inline-block',
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

const tipsSection = {
  margin: '32px 40px',
  padding: '24px',
  backgroundColor: '#f0f9ff',
  borderRadius: '8px',
  border: '1px solid #bae6fd',
};

const tipsTitle = {
  color: '#0369a1',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 16px',
};

const tipItem = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '8px 0',
};

const statsSection = {
  margin: '32px 40px',
  padding: '24px',
  backgroundColor: '#fef3c7',
  borderRadius: '8px',
  border: '1px solid #fcd34d',
};

const statsTitle = {
  color: '#92400e',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 16px',
};

const statItem = {
  color: '#451a03',
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

const featuredSection = {
  margin: '32px 40px',
  padding: '24px',
  backgroundColor: '#f3e8ff',
  borderRadius: '8px',
  border: '1px solid #c4b5fd',
  textAlign: 'center' as const,
};

const featuredTitle = {
  color: '#6b21a8',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 12px',
};

const featuredText = {
  color: '#581c87',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 20px',
};

const secondaryButton = {
  backgroundColor: '#8b5cf6',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '10px 24px',
  border: 'none',
  cursor: 'pointer',
};

const socialSection = {
  textAlign: 'center' as const,
  margin: '32px 40px',
  padding: '20px',
  borderTop: '1px solid #f0f0f0',
};

const socialTitle = {
  color: '#6b7280',
  fontSize: '14px',
  fontWeight: '600',
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

export default NewsletterTemplate;