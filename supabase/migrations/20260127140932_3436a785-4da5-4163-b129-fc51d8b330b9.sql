-- Phase 1: Add Inventory Tracking columns to peptide_protocols
ALTER TABLE peptide_protocols
ADD COLUMN IF NOT EXISTS vial_total_doses INTEGER DEFAULT 20,
ADD COLUMN IF NOT EXISTS vial_remaining_doses INTEGER DEFAULT 20,
ADD COLUMN IF NOT EXISTS vial_started_at TIMESTAMPTZ DEFAULT NOW();

-- Phase 2: Create RPC function for atomic vial decrement
CREATE OR REPLACE FUNCTION decrement_vial(p_protocol_id UUID)
RETURNS INTEGER AS $$
DECLARE
  new_remaining INTEGER;
BEGIN
  UPDATE peptide_protocols
  SET vial_remaining_doses = GREATEST(vial_remaining_doses - 1, 0),
      updated_at = NOW()
  WHERE id = p_protocol_id
  RETURNING vial_remaining_doses INTO new_remaining;
  
  RETURN new_remaining;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION decrement_vial(UUID) TO authenticated;