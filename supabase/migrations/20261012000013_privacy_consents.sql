-- ============================================================================
-- Migration: 20261012000013_privacy_consents.sql
-- Description: Digital Personal Data Protection (DPDP) Act 2023 Consent Audit Records (T5.P.9)
-- Governed by: Planning/VARIABLE_REGISTRY.md and PRD Data Model
-- ============================================================================

CREATE TABLE IF NOT EXISTS consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (
    consent_type IN (
      'terms_of_service',
      'privacy_policy',
      'b2b_medical_data_processing',
      'order_communications'
    )
  ),
  version TEXT NOT NULL DEFAULT 'v1.0',
  is_granted BOOLEAN NOT NULL DEFAULT true,
  ip_address TEXT,
  user_agent TEXT,
  consented_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  withdrawn_at TIMESTAMPTZ
);

-- Indices for rapid lookup by user and consent scope
CREATE INDEX IF NOT EXISTS idx_consent_records_user_id ON consent_records(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_records_type ON consent_records(consent_type);
CREATE INDEX IF NOT EXISTS idx_consent_records_consented_at ON consent_records(consented_at);

-- Enable Row Level Security (RLS)
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;

-- Doctors can read their own consent audit history
CREATE POLICY "Users can read own consent records"
  ON consent_records
  FOR SELECT
  USING (auth.uid() = user_id);

-- Doctors can record their affirmative consent
CREATE POLICY "Users can record own consent"
  ON consent_records
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Doctors can update own consent records (e.g., to record revocation/withdrawal)
CREATE POLICY "Users can update own consent"
  ON consent_records
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all consent audit records across the platform
CREATE POLICY "Admins can view all consent records"
  ON consent_records
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Immutable audit requirement under DPDP Act: Disallow deletion of consent logs
CREATE POLICY "No deletion of consent records"
  ON consent_records
  FOR DELETE
  USING (false);
