-- Delete user account mathias@mathiasheinke.de
-- This will cascade delete all related data due to foreign key constraints
DELETE FROM auth.users WHERE email = 'mathias@mathiasheinke.de';

-- Note: The second email Mathias.heinke@ekd-solar.de was not found in the system