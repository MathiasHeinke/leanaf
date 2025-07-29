-- Korrigiere alle KaloAI-Referenzen zu GetleanAI in den E-Mail-Templates
UPDATE email_templates 
SET 
  html_content = REPLACE(REPLACE(html_content, 'KaloAI', 'GetleanAI'), 'Kalo AI', 'GetleanAI'),
  text_content = REPLACE(REPLACE(text_content, 'KaloAI', 'GetleanAI'), 'Kalo AI', 'GetleanAI'),
  subject = REPLACE(REPLACE(subject, 'KaloAI', 'GetleanAI'), 'Kalo AI', 'GetleanAI'),
  updated_at = now()
WHERE 
  html_content ILIKE '%KaloAI%' 
  OR html_content ILIKE '%Kalo AI%'
  OR text_content ILIKE '%KaloAI%' 
  OR text_content ILIKE '%Kalo AI%'
  OR subject ILIKE '%KaloAI%' 
  OR subject ILIKE '%Kalo AI%';