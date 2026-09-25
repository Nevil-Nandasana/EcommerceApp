-- Migration 20260925000007: Add push_token column to users table
-- Governed by PRD Section 6.3, FR-15, F-18, and T4.3.1 / T4.3.2

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS push_token TEXT;

COMMENT ON COLUMN public.users.push_token IS 'Expo push token (ExponentPushToken[...]) for mobile notifications';

-- Index push_token for fast lookup when checking registration status
CREATE INDEX IF NOT EXISTS idx_users_push_token ON public.users(push_token) WHERE push_token IS NOT NULL;
