-- Email Marketing System Database Schema

-- Email Templates
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN ('welcome', 'confirmation', 'password_reset', 'newsletter', 'onboarding_sequence', 'activity_encouragement')),
  html_content TEXT NOT NULL,
  text_content TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Email Campaigns
CREATE TABLE public.email_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  template_id UUID REFERENCES public.email_templates(id),
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('newsletter', 'announcement', 'onboarding', 'engagement')),
  target_audience JSONB DEFAULT '{}', -- criteria for targeting users
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
  total_recipients INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User Email Preferences
CREATE TABLE public.user_email_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  newsletter_enabled BOOLEAN DEFAULT true,
  onboarding_emails BOOLEAN DEFAULT true,
  activity_reminders BOOLEAN DEFAULT true,
  marketing_emails BOOLEAN DEFAULT true,
  double_opt_in_confirmed BOOLEAN DEFAULT false,
  double_opt_in_token TEXT,
  double_opt_in_expires_at TIMESTAMP WITH TIME ZONE,
  unsubscribe_token TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Email Logs
CREATE TABLE public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  email_address TEXT NOT NULL,
  template_id UUID REFERENCES public.email_templates(id),
  campaign_id UUID REFERENCES public.email_campaigns(id),
  email_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
  external_id TEXT, -- Resend message ID
  metadata JSONB DEFAULT '{}',
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE
);

-- Onboarding Email Sequences
CREATE TABLE public.onboarding_sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sequence_step INTEGER DEFAULT 1,
  next_email_at TIMESTAMP WITH TIME ZONE,
  completed BOOLEAN DEFAULT false,
  paused BOOLEAN DEFAULT false, -- pause if user becomes active
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_email_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_sequences ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Email Templates - Only admins can manage
CREATE POLICY "Admins can manage email templates" ON public.email_templates
FOR ALL USING (is_super_admin());

-- Email Campaigns - Only admins can manage
CREATE POLICY "Admins can manage email campaigns" ON public.email_campaigns
FOR ALL USING (is_super_admin());

-- User Email Preferences - Users can view/update their own
CREATE POLICY "Users can view their email preferences" ON public.user_email_preferences
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their email preferences" ON public.user_email_preferences
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert email preferences" ON public.user_email_preferences
FOR INSERT WITH CHECK (true);

-- Email Logs - Admins can view all, users can view their own
CREATE POLICY "Admins can view all email logs" ON public.email_logs
FOR SELECT USING (is_super_admin());

CREATE POLICY "Users can view their email logs" ON public.email_logs
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert email logs" ON public.email_logs
FOR INSERT WITH CHECK (true);

-- Onboarding Sequences - System managed
CREATE POLICY "System can manage onboarding sequences" ON public.onboarding_sequences
FOR ALL USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_campaigns_updated_at
BEFORE UPDATE ON public.email_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_email_preferences_updated_at
BEFORE UPDATE ON public.user_email_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_onboarding_sequences_updated_at
BEFORE UPDATE ON public.onboarding_sequences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default email templates
INSERT INTO public.email_templates (name, subject, template_type, html_content, text_content) VALUES
('Welcome Email', 'Willkommen bei KaloAI - Ihre Fitness-Reise beginnt jetzt!', 'welcome', '', 'Willkommen bei KaloAI! Wir freuen uns, Sie auf Ihrer Fitness-Reise zu begleiten.'),
('Email Confirmation', 'Bestätigen Sie Ihre E-Mail-Adresse für KaloAI', 'confirmation', '', 'Bitte bestätigen Sie Ihre E-Mail-Adresse, um alle Funktionen von KaloAI zu nutzen.'),
('Password Reset', 'Passwort zurücksetzen - KaloAI', 'password_reset', '', 'Sie haben eine Passwort-Zurücksetzung für Ihr KaloAI-Konto angefordert.'),
('Newsletter Template', 'KaloAI Newsletter - Ihre wöchentlichen Fitness-Tipps', 'newsletter', '', 'Hier sind Ihre personalisierten Fitness-Tipps für diese Woche!'),
('Onboarding Day 1', 'Tag 1: Starten Sie durch mit KaloAI!', 'onboarding_sequence', '', 'Herzlich willkommen! Lassen Sie uns gemeinsam Ihre Fitness-Ziele erreichen.'),
('Activity Encouragement', 'Wir vermissen Sie! Setzen Sie Ihre Fitness-Reise fort', 'activity_encouragement', '', 'Es ist Zeit, wieder aktiv zu werden! Ihre Ziele warten auf Sie.');

-- Create indexes for performance
CREATE INDEX idx_email_logs_user_id ON public.email_logs(user_id);
CREATE INDEX idx_email_logs_sent_at ON public.email_logs(sent_at);
CREATE INDEX idx_onboarding_sequences_next_email ON public.onboarding_sequences(next_email_at) WHERE NOT completed AND NOT paused;
CREATE INDEX idx_user_email_preferences_user_id ON public.user_email_preferences(user_id);