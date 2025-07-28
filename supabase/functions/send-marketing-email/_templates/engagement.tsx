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

interface EngagementProps {
  user_name: string;
  days_inactive: number;
  last_activity: string;
  motivation: string;
  app_url: string;
}

export const EngagementTemplate = ({ user_name, days_inactive, last_activity, motivation, app_url }: EngagementProps) => {
  const getMotivationLevel = (days: number) => {
    if (days <= 3) return 'gentle';
    if (days <= 7) return 'encouraging';
    if (days <= 14) return 'motivating';
    return 'strong';
  };

  const motivationLevel = getMotivationLevel(days_inactive);

  const getEmoji = () => {
    switch (motivationLevel) {
      case 'gentle': return '😊';
      case 'encouraging': return '💪';
      case 'motivating': return '🔥';
      case 'strong': return '🚀';
      default: return '💪';
    }
  };

  const getSubjectLine = () => {
    switch (motivationLevel) {
      case 'gentle': return 'Ihre Fitness-Reise wartet auf Sie! 😊';
      case 'encouraging': return 'Zeit für den nächsten Schritt! 💪';
      case 'motivating': return 'Ihr Comeback startet jetzt! 🔥';
      case 'strong': return 'Lassen Sie uns neu durchstarten! 🚀';
      default: return 'Wir vermissen Sie!';
    }
  };

  return (
    <Html>
      <Head />
      <Preview>{getSubjectLine()}</Preview>
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
            <Text style={comebackBadge}>COMEBACK</Text>
          </Section>
          
          <Section style={heroSection}>
            <Text style={heroEmoji}>{getEmoji()}</Text>
            <Heading style={h1}>Wir vermissen Sie, {user_name}!</Heading>
          </Section>
          
          <Text style={text}>
            {motivation}
          </Text>
          
          <Section style={statsSection}>
            <Text style={statsTitle}>📊 Ihre letzte Aktivität:</Text>
            <Text style={statItem}>
              <strong>{last_activity}</strong> vor {days_inactive} Tag{days_inactive !== 1 ? 'en' : ''}
            </Text>
            <Text style={encourageText}>
              {motivationLevel === 'gentle' && 'Kein Problem! Jeder braucht mal eine Pause. 😌'}
              {motivationLevel === 'encouraging' && 'Sie waren auf einem super Weg! Machen Sie da weiter, wo Sie aufgehört haben. 💪'}
              {motivationLevel === 'motivating' && 'Sie haben schon so viel erreicht - lassen Sie es nicht umsonst sein! 🔥'}
              {motivationLevel === 'strong' && 'Ein Neustart ist eine Chance für noch bessere Erfolge! 🚀'}
            </Text>
          </Section>
          
          <Section style={ctaSection}>
            <Button href={app_url} style={button}>
              Jetzt wieder einsteigen
            </Button>
          </Section>
          
          <Section style={motivationSection}>
            <Text style={motivationTitle}>🎯 Warum heute der perfekte Tag ist:</Text>
            <Text style={motivationItem}>✅ Ihre Daten sind noch da - nahtlos weitermachen</Text>
            <Text style={motivationItem}>✅ Neue KI-Features seit Ihrem letzten Besuch</Text>
            <Text style={motivationItem}>✅ Ihre Ziele sind immer noch erreichbar</Text>
            <Text style={motivationItem}>✅ Nur 5 Minuten täglich reichen für den Neustart</Text>
          </Section>
          
          {days_inactive <= 7 && (
            <Section style={quickStartSection}>
              <Text style={quickStartTitle}>⚡ Quick-Start (2 Minuten):</Text>
              <Text style={quickStartStep}>1. Eine Mahlzeit fotografieren</Text>
              <Text style={quickStartStep}>2. Aktuelles Gewicht eintragen</Text>
              <Text style={quickStartStep}>3. Tagesziel checken</Text>
              <Text style={quickStartNote}>Das war's! Sie sind wieder im Spiel! 🎉</Text>
            </Section>
          )}
          
          {days_inactive > 7 && (
            <Section style={freshStartSection}>
              <Text style={freshStartTitle}>🌟 Neuer Start, bessere Ergebnisse:</Text>
              <Text style={freshStartText}>
                Nutzen Sie diese Pause als Chance! Unsere KI hat Ihre Vorlieben gelernt und kann 
                Ihnen jetzt noch personaliertere Empfehlungen geben.
              </Text>
              <Button href={`${app_url}/goals`} style={secondaryButton}>
                Ziele neu definieren
              </Button>
            </Section>
          )}
          
          <Section style={testimonialsSection}>
            <Text style={testimonialsTitle}>💬 Was andere über ihr Comeback sagen:</Text>
            <Text style={testimonial}>
              "Nach 2 Wochen Pause war ich wieder dabei - und habe meine Ziele trotzdem erreicht!" - Sarah K.
            </Text>
            <Text style={testimonial}>
              "Der Wiedereinstieg war einfacher als gedacht. Die App hat alle meine Fortschritte gespeichert." - Marcus T.
            </Text>
          </Section>
          
          <Section style={supportSection}>
            <Text style={supportTitle}>🤖 Ihr KI-Coach wartet auf Sie</Text>
            <Text style={supportText}>
              Fragen Sie unseren Coach nach einem personalisierten Wiedereinstiegsplan. 
              Er kennt Ihre Historie und hilft beim sanften Neustart.
            </Text>
            <Button href={`${app_url}/coach`} style={coachButton}>
              Coach um Hilfe bitten
            </Button>
          </Section>
          
          <Text style={footer}>
            Wir glauben an Sie und Ihre Ziele!<br />
            Ihr GetleanAI-Team {getEmoji()}
          </Text>
          
          <Text style={disclaimer}>
            Sie erhalten diese E-Mail, weil wir Sie bei Ihrer Fitness-Reise unterstützen möchten. 
            Zu viele E-Mails? <a href={`${app_url}/preferences`} style={link}>Häufigkeit anpassen</a>
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

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
  padding: '32px 40px 16px',
  textAlign: 'center' as const,
  borderBottom: '1px solid #f0f0f0',
};

const logo = {
  margin: '0 auto',
};

const comebackBadge = {
  backgroundColor: '#f59e0b',
  color: '#ffffff',
  fontSize: '10px',
  fontWeight: '600',
  padding: '4px 8px',
  borderRadius: '4px',
  marginTop: '8px',
  display: 'inline-block',
};

const heroSection = {
  textAlign: 'center' as const,
  padding: '24px 40px 0',
};

const heroEmoji = {
  fontSize: '48px',
  margin: '0',
  lineHeight: '1',
};

const h1 = {
  color: '#1a1a1a',
  fontSize: '24px',
  fontWeight: '700',
  margin: '16px 0 32px',
  padding: '0',
  textAlign: 'center' as const,
};

const text = {
  color: '#4a4a4a',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '16px 40px 24px',
  textAlign: 'center' as const,
};

const statsSection = {
  margin: '32px 40px',
  padding: '24px',
  backgroundColor: '#fef3c7',
  borderRadius: '8px',
  border: '1px solid #fcd34d',
  textAlign: 'center' as const,
};

const statsTitle = {
  color: '#92400e',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 12px',
};

const statItem = {
  color: '#451a03',
  fontSize: '18px',
  lineHeight: '1.6',
  margin: '8px 0 16px',
};

const encourageText = {
  color: '#92400e',
  fontSize: '14px',
  lineHeight: '1.6',
  fontStyle: 'italic',
  margin: '0',
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

const motivationSection = {
  margin: '32px 40px',
  padding: '24px',
  backgroundColor: '#ecfdf5',
  borderRadius: '8px',
  border: '1px solid #d1fae5',
};

const motivationTitle = {
  color: '#047857',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 16px',
};

const motivationItem = {
  color: '#065f46',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '8px 0',
};

const quickStartSection = {
  margin: '32px 40px',
  padding: '24px',
  backgroundColor: '#f0f9ff',
  borderRadius: '8px',
  border: '1px solid #bae6fd',
};

const quickStartTitle = {
  color: '#0369a1',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 16px',
};

const quickStartStep = {
  color: '#0c4a6e',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '8px 0',
};

const quickStartNote = {
  color: '#0369a1',
  fontSize: '14px',
  fontWeight: '600',
  margin: '16px 0 0',
  textAlign: 'center' as const,
};

const freshStartSection = {
  margin: '32px 40px',
  padding: '24px',
  backgroundColor: '#fdf4ff',
  borderRadius: '8px',
  border: '1px solid #e9d5ff',
  textAlign: 'center' as const,
};

const freshStartTitle = {
  color: '#7c2d12',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 12px',
};

const freshStartText = {
  color: '#581c87',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0 0 20px',
};

const secondaryButton = {
  backgroundColor: '#8b5cf6',
  borderRadius: '6px',
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

const testimonialsSection = {
  margin: '32px 40px',
  padding: '24px',
  backgroundColor: '#f8fafc',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
};

const testimonialsTitle = {
  color: '#374151',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 16px',
  textAlign: 'center' as const,
};

const testimonial = {
  color: '#4b5563',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '12px 0',
  fontStyle: 'italic',
  textAlign: 'center' as const,
};

const supportSection = {
  margin: '32px 40px',
  padding: '24px',
  backgroundColor: '#f3f4f6',
  borderRadius: '8px',
  textAlign: 'center' as const,
};

const supportTitle = {
  color: '#374151',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 12px',
};

const supportText = {
  color: '#4b5563',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0 0 16px',
};

const coachButton = {
  backgroundColor: '#3b82f6',
  borderRadius: '6px',
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

export default EngagementTemplate;