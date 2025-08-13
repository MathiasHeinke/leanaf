import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface OnboardingProps {
  user_name: string;
  step: number;
  content: string;
  app_url: string;
}

export const OnboardingTemplate = ({ user_name, step, content, app_url }: OnboardingProps) => {
  const getStepInfo = (stepNum: number) => {
    switch (stepNum) {
      case 1:
        return {
          title: 'Willkommen bei GetleanAI! 🎉',
          emoji: '🌟',
          description: 'Ihre KI-gestützte Fitness-Reise beginnt jetzt!',
          action: 'Profil vervollständigen'
        };
      case 2:
        return {
          title: 'Lassen Sie uns Ihre Ziele definieren 🎯',
          emoji: '🎯',
          description: 'Gemeinsam erreichen wir Ihre Fitnessziele!',
          action: 'Ziele festlegen'
        };
      case 3:
        return {
          title: 'Erste Mahlzeit erfassen 📸',
          emoji: '🍽️',
          description: 'Starten Sie mit der KI-gestützten Ernährungsanalyse!',
          action: 'Erste Mahlzeit fotografieren'
        };
      default:
        return {
          title: 'Weiter geht\'s! 💪',
          emoji: '🚀',
          description: 'Sie sind auf dem besten Weg zu Ihren Zielen!',
          action: 'Weiter zur App'
        };
    }
  };

  const stepInfo = getStepInfo(step);

  return (
    <Html>
      <Head />
      <Preview>{stepInfo.title}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Img
              src={`${app_url}/kai-logo.png`}
              width="120"
              height="40"
              alt="GetleanAI"
              style={logo}
            />
            <Text style={welcomeBadge}>WILLKOMMEN</Text>
          </Section>
          
          <Section style={heroSection}>
            <Text style={heroEmoji}>{stepInfo.emoji}</Text>
            <Heading style={h1}>Hallo {user_name}!</Heading>
            <Text style={subtitle}>{stepInfo.title}</Text>
          </Section>
          
          <Text style={text}>
            {content}
          </Text>
          
          <Section style={progressSection}>
            <Text style={progressTitle}>📈 Ihr Fortschritt</Text>
            <div style={progressBar}>
              <div style={{...progressFill, width: `${(step / 4) * 100}%`}}></div>
            </div>
            <Text style={progressText}>Schritt {step} von 4 abgeschlossen</Text>
          </Section>
          
          <Section style={ctaSection}>
            <Button href={app_url} style={button}>
              {stepInfo.action}
            </Button>
          </Section>
          
          <Section style={featuresSection}>
            <Text style={featuresTitle}>🔥 Was Sie erwartet:</Text>
            <Text style={featureItem}>🤖 KI-gestützte Mahlzeitenerkennung</Text>
            <Text style={featureItem}>📊 Automatische Nährwert-Analyse</Text>
            <Text style={featureItem}>🎯 Personalisierte Empfehlungen</Text>
            <Text style={featureItem}>📈 Intelligentes Progress-Tracking</Text>
          </Section>
          
          {step === 1 && (
            <Section style={quickStartSection}>
              <Text style={quickStartTitle}>⚡ Quick-Start Tipp:</Text>
              <Text style={quickStartText}>
                Laden Sie die App herunter und machen Sie ein Foto Ihrer nächsten Mahlzeit. 
                Unsere KI analysiert automatisch alle Nährwerte! 📸✨
              </Text>
            </Section>
          )}
          
          <Section style={supportSection}>
            <Text style={supportTitle}>💬 Brauchen Sie Hilfe?</Text>
            <Text style={supportText}>
              Unser Support-Team ist da, wenn Sie Fragen haben. 
              Antworten Sie einfach auf diese E-Mail!
            </Text>
          </Section>
          
          <Text style={footer}>
            Mit freundlichen Grüßen,<br />
            Ihr GetleanAI Team 🌟
            <br />
            <br />
            <Text style={footerNote}>
              Sie erhalten diese E-Mail, weil Sie sich bei GetleanAI registriert haben.
            </Text>
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default OnboardingTemplate;

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const logoSection = {
  padding: '32px 40px',
  textAlign: 'center' as const,
  borderBottom: '1px solid #e2e8f0',
  position: 'relative' as const,
};

const logo = {
  margin: '0 auto',
};

const welcomeBadge = {
  display: 'inline-block',
  position: 'absolute' as const,
  top: '40px',
  right: '40px',
  backgroundColor: '#10b981',
  color: 'white',
  padding: '4px 12px',
  borderRadius: '12px',
  fontSize: '12px',
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
};

const heroSection = {
  padding: '40px 40px 32px',
  textAlign: 'center' as const,
};

const heroEmoji = {
  fontSize: '48px',
  marginBottom: '16px',
  display: 'block',
};

const h1 = {
  color: '#1f2937',
  fontSize: '32px',
  fontWeight: '700',
  margin: '0 0 8px',
  lineHeight: '40px',
};

const subtitle = {
  color: '#6b7280',
  fontSize: '18px',
  margin: '0 0 24px',
  lineHeight: '28px',
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '0 40px 32px',
};

const progressSection = {
  margin: '32px 40px',
  padding: '24px',
  backgroundColor: '#f8fafc',
  borderRadius: '8px',
  textAlign: 'center' as const,
};

const progressTitle = {
  color: '#1f2937',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 16px',
};

const progressBar = {
  width: '100%',
  height: '8px',
  backgroundColor: '#e5e7eb',
  borderRadius: '4px',
  margin: '0 0 8px',
  overflow: 'hidden',
};

const progressFill = {
  height: '100%',
  backgroundColor: '#3b82f6',
  borderRadius: '4px',
  transition: 'width 0.3s ease',
};

const progressText = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0',
};

const ctaSection = {
  textAlign: 'center' as const,
  margin: '32px 40px',
};

const button = {
  backgroundColor: '#3b82f6',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
  margin: '0',
  cursor: 'pointer',
  border: 'none',
};

const featuresSection = {
  margin: '32px 40px',
  padding: '24px',
  backgroundColor: '#fef3c7',
  borderRadius: '8px',
};

const featuresTitle = {
  color: '#1f2937',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 16px',
};

const featureItem = {
  color: '#374151',
  fontSize: '14px',
  margin: '0 0 8px',
  lineHeight: '20px',
};

const quickStartSection = {
  margin: '24px 40px',
  padding: '20px',
  backgroundColor: '#ecfdf5',
  borderRadius: '8px',
  border: '1px solid #10b981',
};

const quickStartTitle = {
  color: '#065f46',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 8px',
};

const quickStartText = {
  color: '#047857',
  fontSize: '14px',
  margin: '0',
  lineHeight: '20px',
};

const supportSection = {
  margin: '32px 40px',
  padding: '20px',
  backgroundColor: '#f1f5f9',
  borderRadius: '8px',
  textAlign: 'center' as const,
};

const supportTitle = {
  color: '#1f2937',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 8px',
};

const supportText = {
  color: '#475569',
  fontSize: '14px',
  margin: '0',
  lineHeight: '20px',
};

const footer = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '24px',
  textAlign: 'center' as const,
  margin: '32px 40px 0',
};

const footerNote = {
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '16px 0 0',
};