-- Insert email templates for registration and double opt-in (corrected template types)

-- 1. Update existing confirmation template with better content
UPDATE public.email_templates 
SET 
  name = 'E-Mail Bestätigung (Registrierung)',
  subject = 'Bestätigen Sie Ihre E-Mail-Adresse für GetleanAI',
  html_content = '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>E-Mail bestätigen</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Ubuntu, sans-serif; background-color: #f6f9fc; margin: 0; padding: 20px;">
  <div style="background-color: #ffffff; margin: 0 auto; max-width: 600px; padding: 20px 0 48px; margin-bottom: 64px; border-radius: 12px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);">
    
    <!-- Logo Section -->
    <div style="padding: 32px 40px; text-align: center; border-bottom: 1px solid #f0f0f0;">
      <img src="{{app_url}}/kai-logo.png" width="120" height="40" alt="GetleanAI" style="margin: 0 auto;">
    </div>
    
    <!-- Main Content -->
    <h1 style="color: #1a1a1a; font-size: 28px; font-weight: 700; margin: 32px 40px 24px; padding: 0; text-align: center;">Fast geschafft, {{user_name}}! 🚀</h1>
    
    <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 16px 40px; text-align: center;">
      Vielen Dank für Ihre Registrierung bei GetleanAI! Um Ihr Konto zu aktivieren und alle Funktionen zu nutzen, bestätigen Sie bitte Ihre E-Mail-Adresse.
    </p>
    
    <!-- CTA Button -->
    <div style="text-align: center; margin: 32px 40px;">
      <a href="{{confirmation_url}}" style="background-color: #10b981; border-radius: 8px; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; text-align: center; display: inline-block; padding: 14px 32px; border: none; cursor: pointer; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
        E-Mail-Adresse bestätigen
      </a>
    </div>
    
    <!-- Alternative Link -->
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 24px 40px 8px; text-align: center;">
      Falls der Button nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:
    </p>
    <p style="color: #3b82f6; font-size: 14px; line-height: 1.6; margin: 0 40px 24px; text-align: center; word-break: break-all; background-color: #f8fafc; padding: 12px; border-radius: 6px;">
      {{confirmation_url}}
    </p>
    
    <!-- Features Info Box -->
    <div style="margin: 32px 40px; padding: 24px; background-color: #ecfdf5; border-radius: 8px; border: 1px solid #d1fae5;">
      <p style="color: #1a1a1a; font-size: 16px; font-weight: 600; margin: 0 0 16px;">⚡ Was Sie nach der Bestätigung erwartet:</p>
      <p style="color: #4a4a4a; font-size: 14px; line-height: 1.6; margin: 8px 0;">✅ Vollzugriff auf alle KI-Coaches</p>
      <p style="color: #4a4a4a; font-size: 14px; line-height: 1.6; margin: 8px 0;">✅ Unbegrenzte Mahlzeiten-Analysen</p>
      <p style="color: #4a4a4a; font-size: 14px; line-height: 1.6; margin: 8px 0;">✅ Personalisierte Trainings-Empfehlungen</p>
      <p style="color: #4a4a4a; font-size: 14px; line-height: 1.6; margin: 8px 0;">✅ Detaillierte Fortschritts-Reports</p>
    </div>
    
    <!-- Security Notice -->
    <p style="color: #dc2626; font-size: 14px; line-height: 1.6; margin: 24px 40px; padding: 16px; background-color: #fef2f2; border-radius: 8px; border: 1px solid #fecaca;">
      <strong>🔒 Sicherheitshinweis:</strong> Dieser Link ist aus Sicherheitsgründen nur 24 Stunden gültig. Falls er abgelaufen ist, können Sie über die App eine neue Bestätigung anfordern.
    </p>
    
    <!-- Footer -->
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 32px 40px 16px; text-align: center;">
      Freuen Sie sich auf Ihre Fitness-Reise!<br>
      Ihr GetleanAI-Team 💪
    </p>
    
    <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; margin: 16px 40px; text-align: center;">
      Sie erhalten diese E-Mail, weil Sie sich bei GetleanAI registriert haben. Falls Sie sich nicht registriert haben, ignorieren Sie diese E-Mail einfach.
    </p>
  </div>
</body>
</html>',
  text_content = 'Fast geschafft, {{user_name}}!

Vielen Dank für Ihre Registrierung bei GetleanAI! Um Ihr Konto zu aktivieren und alle Funktionen zu nutzen, bestätigen Sie bitte Ihre E-Mail-Adresse.

Bestätigungslink: {{confirmation_url}}

Was Sie nach der Bestätigung erwartet:
✅ Vollzugriff auf alle KI-Coaches
✅ Unbegrenzte Mahlzeiten-Analysen  
✅ Personalisierte Trainings-Empfehlungen
✅ Detaillierte Fortschritts-Reports

🔒 Sicherheitshinweis: Dieser Link ist aus Sicherheitsgründen nur 24 Stunden gültig.

Freuen Sie sich auf Ihre Fitness-Reise!
Ihr GetleanAI-Team 💪

Sie erhalten diese E-Mail, weil Sie sich bei GetleanAI registriert haben.'
WHERE template_type = 'confirmation';

-- 2. Add new Newsletter Double Opt-in Template
INSERT INTO public.email_templates (
  name,
  subject,
  html_content,
  text_content,
  template_type,
  is_active
) VALUES (
  'Newsletter Double Opt-in',
  'Bitte bestätigen Sie Ihr Newsletter-Abonnement',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Newsletter bestätigen</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Ubuntu, sans-serif; background-color: #f6f9fc; margin: 0; padding: 20px;">
  <div style="background-color: #ffffff; margin: 0 auto; max-width: 600px; padding: 20px 0 48px; margin-bottom: 64px; border-radius: 12px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);">
    
    <!-- Logo Section -->
    <div style="padding: 32px 40px; text-align: center; border-bottom: 1px solid #f0f0f0;">
      <img src="{{app_url}}/kai-logo.png" width="120" height="40" alt="GetleanAI" style="margin: 0 auto;">
    </div>
    
    <!-- Main Content -->
    <h1 style="color: #1a1a1a; font-size: 28px; font-weight: 700; margin: 32px 40px 24px; padding: 0; text-align: center;">Noch ein kleiner Schritt, {{user_name}}! 📧</h1>
    
    <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 16px 40px; text-align: center;">
      Sie haben sich für unseren GetleanAI Newsletter angemeldet. Um sicherzustellen, dass Sie unsere wertvollen Fitness-Tipps erhalten, bestätigen Sie bitte Ihr Abonnement.
    </p>
    
    <!-- CTA Button -->
    <div style="text-align: center; margin: 32px 40px;">
      <a href="{{confirmation_url}}" style="background-color: #f59e0b; border-radius: 8px; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; text-align: center; display: inline-block; padding: 14px 32px; border: none; cursor: pointer; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);">
        Newsletter-Abonnement bestätigen
      </a>
    </div>
    
    <!-- What to expect -->
    <div style="margin: 32px 40px; padding: 24px; background-color: #fffbeb; border-radius: 8px; border: 1px solid #fed7aa;">
      <p style="color: #1a1a1a; font-size: 16px; font-weight: 600; margin: 0 0 16px;">📬 Was Sie in unserem Newsletter erwartet:</p>
      <p style="color: #4a4a4a; font-size: 14px; line-height: 1.6; margin: 8px 0;">🥗 Wöchentliche Ernährungs-Tipps</p>
      <p style="color: #4a4a4a; font-size: 14px; line-height: 1.6; margin: 8px 0;">💪 Effektive Workout-Routinen</p>
      <p style="color: #4a4a4a; font-size: 14px; line-height: 1.6; margin: 8px 0;">🎯 Motivation und Erfolgsstories</p>
      <p style="color: #4a4a4a; font-size: 14px; line-height: 1.6; margin: 8px 0;">🔬 Neueste Fitness-Wissenschaft</p>
    </div>
    
    <!-- Alternative -->
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 24px 40px 8px; text-align: center;">
      Falls der Button nicht funktioniert, kopieren Sie diesen Link:
    </p>
    <p style="color: #3b82f6; font-size: 14px; line-height: 1.6; margin: 0 40px 24px; text-align: center; word-break: break-all; background-color: #f8fafc; padding: 12px; border-radius: 6px;">
      {{confirmation_url}}
    </p>
    
    <!-- Footer -->
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 32px 40px 16px; text-align: center;">
      Ihr GetleanAI-Team freut sich auf Sie! 🚀<br>
      Ihr GetleanAI-Team 💪
    </p>
    
    <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; margin: 16px 40px; text-align: center;">
      Sie erhalten diese E-Mail, weil Sie sich für unseren Newsletter angemeldet haben. Falls das ein Versehen war, ignorieren Sie diese E-Mail einfach.
    </p>
  </div>
</body>
</html>',
  'Noch ein kleiner Schritt, {{user_name}}! 📧

Sie haben sich für unseren GetleanAI Newsletter angemeldet. Um sicherzustellen, dass Sie unsere wertvollen Fitness-Tipps erhalten, bestätigen Sie bitte Ihr Abonnement.

Bestätigungslink: {{confirmation_url}}

📬 Was Sie in unserem Newsletter erwartet:
🥗 Wöchentliche Ernährungs-Tipps
💪 Effektive Workout-Routinen  
🎯 Motivation und Erfolgsstories
🔬 Neueste Fitness-Wissenschaft

Ihr GetleanAI-Team freut sich auf Sie! 🚀
Ihr GetleanAI-Team 💪

Sie erhalten diese E-Mail, weil Sie sich für unseren Newsletter angemeldet haben.',
  'newsletter',
  true
);