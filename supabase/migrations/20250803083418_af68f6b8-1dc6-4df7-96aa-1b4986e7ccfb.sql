-- Fix the v_supplement_flags view by dropping and recreating it completely
DROP VIEW IF EXISTS v_supplement_flags CASCADE;

-- Recreate v_supplement_flags with correct column references and data types
CREATE VIEW v_supplement_flags AS
SELECT 
  usi.user_id,
  usi.date,
  CASE 
    WHEN COUNT(us.id) = 0 THEN 0::numeric
    ELSE (COUNT(usi.id)::numeric / COUNT(us.id) * 100)
  END as compliance_pct
FROM user_supplements us
LEFT JOIN supplement_intake_log usi ON us.id = usi.user_supplement_id 
  AND usi.user_id = us.user_id
WHERE us.is_active = true
GROUP BY usi.user_id, usi.date;