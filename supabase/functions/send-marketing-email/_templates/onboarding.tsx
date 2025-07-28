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
  const getStepInfo = (stepNumber: number) => {
    const steps = {
      1: {
        title: 'Tag 1: Willkommen bei KaloAI! 🎉',
        emoji: '🎯',
        action: 'Profil vervollständigen',
        nextSteps: ['Ziele festlegen', 'Erste Mahlzeit fotografieren', 'App erkunden']
      },
      2: {
        title: 'Tag 3: Erste Erfolge! 💪',
        emoji: '📸',
        action: 'Erste Mahlzeit analysieren',
        nextSteps: ['Trainings-Routine starten', 'Fortschritt verfolgen', 'Coach-Tipps nutzen']
      },
      3: {
        title: 'Woche 1: Sie sind auf dem richtigen Weg! 🚀',
        emoji: '🏋️',
        action: 'Erstes Workout starten',
        nextSteps: ['Wöchentliche Ziele setzen', 'Mess-Routine etablieren', 'Community beitreten']
      },
    };
    return steps[stepNumber as keyof typeof steps] || steps[1];
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
              alt="KaloAI"
              style={logo}
            />
            <Text style={stepBadge}>SCHRITT {step}</Text>
          </Section>
          
          <Section style={heroSection}>
            <Text style={heroEmoji}>{stepInfo.emoji}</Text>
            <Heading style={h1}>{stepInfo.title}</Heading>
          </Section>
          
          <Text style={greeting}>
            Hallo {user_name},
          </Text>
          
          <Text style={text}>
            {content}
          </Text>
          
          <Section style={actionSection}>
            <Text style={actionTitle}>🎯 Ihr nächster Schritt:</Text>
            <Text style={actionText}>{stepInfo.action}</Text>
            <Button href={app_url} style={button}>
              Jetzt {stepInfo.action.toLowerCase()}
            </Button>
          </Section>
          
          <Section style={nextStepsSection}>
            <Text style={nextStepsTitle}>📋 Das kommt als nächstes:</Text>
            {stepInfo.nextSteps.map((nextStep, index) => (
              <Text key={index} style={nextStepItem}>
                {index + 1}. {nextStep}
              </Text>
            ))}
          </Section>
          
          {step === 1 && (
            <Section style={tipsSection}>
              <Text style={tipsTitle}>💡 Profi-Tipps für den Start:</Text>
              <Text style={tipItem}>📱 Fotografieren Sie jede Mahlzeit für beste Ergebnisse</Text>
              <Text style={tipItem}>⏰ Nutzen Sie die Erinnerungen für regelmäßiges Tracking</Text>
              <Text style={tipItem}>🎯 Setzen Sie realistische, erreichbare Ziele</Text>
              <Text style={tipItem}>📊 Schauen Sie täglich in Ihre Fortschritte</Text>
            </Section>
          )}
          
          {step === 2 && (
            <Section style={progressSection}>
              <Text style={progressTitle}>🏆 Ihre bisherigen Erfolge:</Text>
              <Text style={progressItem}>✅ Profil erfolgreich eingerichtet</Text>
              <Text style={progressItem}>✅ Erste Mahlzeiten getrackt</Text>
              <Text style={progressItem}>✅ Mit der App vertraut gemacht</Text>
              <Text style={progressMotive}>Sie machen das großartig! Weiter so! 💪</Text>
            </Section>
          )}
          
          {step === 3 && (
            <Section style={milestoneSection}>
              <Text style={milestoneTitle}>🌟 Meilenstein erreicht!</Text>
              <Text style={milestoneText}>
                Sie sind bereits eine ganze Woche dabei! Das zeigt echtes Engagement. 
                Nutzer, die die erste Woche schaffen, erreichen zu 85% ihre langfristigen Ziele.
              </Text>
            </Section>
          )}
          
          <Section style={supportSection}>
            <Text style={supportTitle}>🤝 Brauchen Sie Hilfe?</Text>
            <Text style={supportText}>
              Unser KI-Coach ist 24/7 für Sie da. Stellen Sie Fragen, holen Sie sich Tipps oder lassen Sie sich motivieren!
            </Text>
            <Button href={`${app_url}/coach`} style={secondaryButton}>
              Mit Coach chatten
            </Button>
          </Section>
          
          <Text style={footer}>
            Wir begleiten Sie auf jedem Schritt!<br />
            Ihr KaloAI-Team 🚀
          </Text>
          
          <Text style={disclaimer}>
            Sie erhalten diese Onboarding-Serie, weil Sie sich bei KaloAI registriert haben. 
            Die Serie pausiert automatisch, sobald Sie aktiv sind.
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

const stepBadge = {
  backgroundColor: '#10b981',
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

const actionSection = {
  margin: '32px 40px',
  padding: '24px',
  backgroundColor: '#ecfdf5',
  borderRadius: '8px',
  border: '2px solid #10b981',
  textAlign: 'center' as const,
};

const actionTitle = {
  color: '#047857',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 12px',
};

const actionText = {
  color: '#065f46',
  fontSize: '16px',
  fontWeight: '500',
  margin: '0 0 20px',
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

const nextStepsSection = {
  margin: '32px 40px',
  padding: '24px',
  backgroundColor: '#f8fafc',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
};

const nextStepsTitle = {
  color: '#374151',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 16px',
};

const nextStepItem = {
  color: '#4b5563',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '8px 0',
};

const tipsSection = {
  margin: '32px 40px',
  padding: '24px',
  backgroundColor: '#fef3c7',
  borderRadius: '8px',
  border: '1px solid #fcd34d',
};

const tipsTitle = {
  color: '#92400e',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 16px',
};

const tipItem = {
  color: '#451a03',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '8px 0',
};

const progressSection = {
  margin: '32px 40px',
  padding: '24px',
  backgroundColor: '#f0f9ff',
  borderRadius: '8px',
  border: '1px solid #bae6fd',
};

const progressTitle = {
  color: '#0369a1',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 16px',
};

const progressItem = {
  color: '#0c4a6e',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '8px 0',
};

const progressMotive = {
  color: '#0369a1',
  fontSize: '15px',
  fontWeight: '600',
  margin: '16px 0 0',
  textAlign: 'center' as const,
};

const milestoneSection = {
  margin: '32px 40px',
  padding: '24px',
  backgroundColor: '#fdf4ff',
  borderRadius: '8px',
  border: '1px solid #e9d5ff',
  textAlign: 'center' as const,
};

const milestoneTitle = {
  color: '#7c2d12',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 12px',
};

const milestoneText = {
  color: '#581c87',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0',
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

const secondaryButton = {
  backgroundColor: '#6b7280',
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

export default OnboardingTemplate;