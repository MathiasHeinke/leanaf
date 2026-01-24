-- Coach-Access for Peptide Protocols: ARES can read protocols for coaching context
CREATE POLICY "Coaches can view peptide protocols for coaching"
ON peptide_protocols
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM coach_conversations
    WHERE coach_conversations.user_id = peptide_protocols.user_id
  )
);

-- Coach-Access for Peptide Intake Log: ARES can read intake history for compliance analysis
CREATE POLICY "Coaches can view peptide intake for coaching"
ON peptide_intake_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM coach_conversations
    WHERE coach_conversations.user_id = peptide_intake_log.user_id
  )
);