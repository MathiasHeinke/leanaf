-- Lösche inaktive Test-Personas
DELETE FROM coach_personas 
WHERE id IN ('kai', 'lucy', 'vita', 'sascha') 
  AND is_active = false;