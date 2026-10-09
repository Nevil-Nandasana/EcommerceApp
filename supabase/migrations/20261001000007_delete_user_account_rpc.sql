-- Migration 20261001000007: Account Deletion RPC
-- Governed by GDPR and DPDP Act compliance

ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.orders ALTER COLUMN address_id DROP NOT NULL;
ALTER TABLE public.order_status_history ALTER COLUMN changed_by DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to delete account.';
  END IF;

  -- 1. Anonymize past orders and order history
  UPDATE public.orders
  SET user_id = NULL,
      address_id = NULL
  WHERE user_id = v_user_id;

  UPDATE public.order_status_history
  SET changed_by = NULL
  WHERE changed_by = v_user_id;

  UPDATE public.users
  SET approved_by = NULL
  WHERE approved_by = v_user_id;

  -- 2. Delete addresses
  DELETE FROM public.addresses
  WHERE user_id = v_user_id;

  -- 3. Delete user profile
  DELETE FROM public.users
  WHERE id = v_user_id;

  -- 4. Delete auth identity
  DELETE FROM auth.users
  WHERE id = v_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
