import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';
import { Resend } from "npm:resend@4.0.0";
import React from 'npm:react@18.3.1';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { WelcomeEmailTemplate } from './_templates/welcome-email.tsx';
import { ConfirmationEmailTemplate } from './_templates/confirmation-email.tsx';
import { PasswordResetEmailTemplate } from './_templates/password-reset.tsx';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AuthEmailRequest {
  type: 'welcome' | 'confirmation' | 'password_reset';
  email: string;
  user_name?: string;
  confirmation_url?: string;
  reset_url?: string;
  user_id?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, email, user_name, confirmation_url, reset_url, user_id }: AuthEmailRequest = await req.json();

    let html = '';
    let subject = '';
    let templateType = '';

    switch (type) {
      case 'welcome':
        subject = 'Willkommen bei KaloAI - Ihre Fitness-Reise beginnt jetzt!';
        templateType = 'welcome';
        html = await renderAsync(
          React.createElement(WelcomeEmailTemplate, {
            user_name: user_name || 'Fitness-Enthusiast',
            app_url: 'https://gzczjscctgyxjyodhnhk.lovableproject.com'
          })
        );
        break;

      case 'confirmation':
        subject = 'Bestätigen Sie Ihre E-Mail-Adresse für KaloAI';
        templateType = 'confirmation';
        html = await renderAsync(
          React.createElement(ConfirmationEmailTemplate, {
            user_name: user_name || 'Fitness-Enthusiast',
            confirmation_url: confirmation_url || '',
            app_url: 'https://gzczjscctgyxjyodhnhk.lovableproject.com'
          })
        );
        break;

      case 'password_reset':
        subject = 'Passwort zurücksetzen - KaloAI';
        templateType = 'password_reset';
        html = await renderAsync(
          React.createElement(PasswordResetEmailTemplate, {
            user_name: user_name || 'Fitness-Enthusiast',
            reset_url: reset_url || '',
            app_url: 'https://gzczjscctgyxjyodhnhk.lovableproject.com'
          })
        );
        break;

      default:
        throw new Error('Invalid email type');
    }

    const emailResponse = await resend.emails.send({
      from: "KaloAI <noreply@kaloai.app>",
      to: [email],
      subject,
      html,
    });

    // Log email to database
    if (emailResponse.data?.id) {
      await supabase
        .from('email_logs')
        .insert({
          user_id: user_id || null,
          email_address: email,
          email_type: templateType,
          subject,
          status: 'sent',
          external_id: emailResponse.data.id,
          metadata: { type, user_name }
        });
    }

    console.log("Auth email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-auth-email function:", error);
    
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