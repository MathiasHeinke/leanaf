-- Add RLS policy for marketing users to access email templates
CREATE POLICY "Marketing users can manage email templates" 
ON public.email_templates 
FOR ALL 
USING (current_user_has_role('marketing'))
WITH CHECK (current_user_has_role('marketing'));

-- Add RLS policy for marketing users to access email campaigns  
CREATE POLICY "Marketing users can manage email campaigns" 
ON public.email_campaigns 
FOR ALL 
USING (current_user_has_role('marketing'))
WITH CHECK (current_user_has_role('marketing'));

-- Add RLS policy for marketing users to access email logs
CREATE POLICY "Marketing users can view email logs" 
ON public.email_logs 
FOR SELECT 
USING (current_user_has_role('marketing'));