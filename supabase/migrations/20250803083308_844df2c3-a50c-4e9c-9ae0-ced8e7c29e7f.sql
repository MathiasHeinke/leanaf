-- Complete the SECURITY DEFINER view fixes with correct column references

-- Create v_supplement_flags with correct column references
CREATE OR REPLACE VIEW v_supplement_flags AS
SELECT 
  usi.user_id,
  usi.date,
  CASE 
    WHEN COUNT(us.id) = 0 THEN 0
    ELSE (COUNT(usi.id)::float / COUNT(us.id) * 100)
  END as compliance_pct
FROM user_supplements us
LEFT JOIN supplement_intake_log usi ON us.id = usi.user_supplement_id 
  AND usi.user_id = us.user_id
WHERE us.is_active = true
GROUP BY usi.user_id, usi.date;