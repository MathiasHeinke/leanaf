import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';
import { getTaskModel } from '../_shared/openai-config.ts';
import { Resend } from "npm:resend@4.0.0";
import React from 'npm:react@18.3.1';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { NewsletterTemplate } from './_templates/newsletter.tsx';
import { OnboardingTemplate } from './_templates/onboarding.tsx';
import { EngagementTemplate } from './_templates/engagement.tsx';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MarketingEmailRequest {
  type: 'newsletter' | 'onboarding' | 'engagement';
  email: string;
  user_name: string;
  user_id: string;
  template_id?: string;
  custom_content?: {
    subject?: string;
    main_content?: string;
    tips?: string[];
    personalization?: any;
  };
  ai_generate?: boolean;
}

const generatePersonalizedContent = async (user_id: string, email_type: string): Promise<any> => {
  if (!openAIApiKey) {
    return null;
  }

  try {
    // Get user data for personalization
    const { data: userData } = await supabase
      .from('profiles')
      .select('*, daily_goals(*), point_activities(*)')
      .eq('user_id', user_id)
      .single();

    const { data: recentMeals } = await supabase
      .from('meals')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: recentWorkouts } = await supabase
      .from('exercise_sessions')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(3);

    const prompt = `Als GetleanAI Fitness-Coach, erstelle personalisierten deutschen E-Mail-Inhalt für ${email_type}.
    
Nutzer-Daten:
- Name: ${userData?.display_name || 'Fitness-Enthusiast'}
- Ziele: ${userData?.daily_goals?.[0]?.calories || 2000} Kalorien, ${userData?.daily_goals?.[0]?.protein || 150}g Protein
- Letzte Mahlzeiten: ${recentMeals?.length || 0} in den letzten Tagen
- Letzte Workouts: ${recentWorkouts?.length || 0} in den letzten Tagen
- Aktivitätslevel: ${userData?.point_activities?.length || 0} Aktivitäten

Erstelle JSON mit:
{
  "subject": "personalisierte Betreffzeile",
  "greeting": "persönliche Begrüßung",
  "main_content": "hauptinhalt mit bezug zur aktivität",
  "tips": ["tipp1", "tipp2", "tipp3"],
  "motivation": "motivierende nachricht",
  "cta_text": "call-to-action text"
}

Stil: Motivierend, freundlich, auf Deutsch, persönlich aber nicht aufdringlich.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: getTaskModel('send-marketing-email'),
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      }),
    });

    const aiResponse = await response.json();
    const content = JSON.parse(aiResponse.choices[0].message.content);
    return content;
  } catch (error) {
    console.error('AI content generation failed:', error);
    return null;
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, email, user_name, user_id, template_id, custom_content, ai_generate }: MarketingEmailRequest = await req.json();

    let html = '';
    let subject = '';
    let content = custom_content;

    // Generate AI content if requested
    if (ai_generate) {
      const aiContent = await generatePersonalizedContent(user_id, type);
      if (aiContent) {
        content = { ...content, ...aiContent };
      }
    }

    switch (type) {
      case 'newsletter':
        subject = content?.subject || 'GetleanAI Newsletter - Ihre wöchentlichen Fitness-Tipps';
        html = await renderAsync(
          React.createElement(NewsletterTemplate, {
            user_name,
            content: content?.main_content || 'Hier sind Ihre personalisierten Fitness-Tipps für diese Woche!',
            tips: content?.tips || ['Trinken Sie mehr Wasser', 'Bewegen Sie sich regelmäßig', 'Achten Sie auf ausreichend Schlaf'],
            app_url: 'https://gzczjscctgyxjyodhnhk.lovableproject.com'
          })
        );
        break;

      case 'onboarding':
        subject = content?.subject || 'Willkommen bei GetleanAI - Ihre Fitness-Reise beginnt!';
        html = await renderAsync(
          React.createElement(OnboardingTemplate, {
            user_name,
            step: content?.personalization?.step || 1,
            content: content?.main_content || 'Lassen Sie uns gemeinsam Ihre Fitness-Ziele erreichen!',
            app_url: 'https://gzczjscctgyxjyodhnhk.lovableproject.com'
          })
        );
        break;

      case 'engagement':
        subject = content?.subject || 'Wir vermissen Sie! Setzen Sie Ihre Fitness-Reise fort';
        html = await renderAsync(
          React.createElement(EngagementTemplate, {
            user_name,
            days_inactive: content?.personalization?.days_inactive || 7,
            last_activity: content?.personalization?.last_activity || 'Training',
            motivation: content?.motivation || 'Es ist Zeit, wieder aktiv zu werden!',
            app_url: 'https://gzczjscctgyxjyodhnhk.lovableproject.com'
          })
        );
        break;

      default:
        throw new Error('Invalid email type');
    }

    const emailResponse = await resend.emails.send({
      from: "GetleanAI <noreply@getleanai.app>",
      to: [email],
      subject,
      html,
    });

    // Log email to database
    if (emailResponse.data?.id) {
      await supabase
        .from('email_logs')
        .insert({
          user_id,
          email_address: email,
          template_id,
          email_type: type,
          subject,
          status: 'sent',
          external_id: emailResponse.data.id,
          metadata: { type, user_name, ai_generated: !!ai_generate }
        });
    }

    console.log("Marketing email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-marketing-email function:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);