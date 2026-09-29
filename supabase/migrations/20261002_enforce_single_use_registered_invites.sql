-- Invite codes are single-use and can only be redeemed by registered accounts.

UPDATE public.mistake_invite_codes
SET
  max_redemptions = 1,
  status = CASE
    WHEN redemption_count >= 1 THEN 'exhausted'
    ELSE status
  END,
  updated_at = now()
WHERE max_redemptions <> 1
   OR (redemption_count >= 1 AND status <> 'exhausted');

ALTER TABLE public.mistake_invite_codes
  ALTER COLUMN max_redemptions SET DEFAULT 1;

ALTER TABLE public.mistake_invite_codes
  DROP CONSTRAINT IF EXISTS mistake_invite_codes_max_redemptions_check;

ALTER TABLE public.mistake_invite_codes
  ADD CONSTRAINT mistake_invite_codes_max_redemptions_check
  CHECK (max_redemptions = 1);

CREATE OR REPLACE FUNCTION public.redeem_invite_code(p_code TEXT)
RETURNS TABLE(available_points BIGINT, granted_points BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_user_id UUID := auth.uid();
  v_code public.mistake_invite_codes%ROWTYPE;
  v_campaign public.mistake_invite_campaigns%ROWTYPE;
  v_redemption_id UUID;
  v_available BIGINT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = v_user_id AND is_anonymous IS TRUE
  ) THEN
    RAISE EXCEPTION 'REGISTERED_ACCOUNT_REQUIRED';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.mistake_invite_redemptions
    WHERE user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'INVITE_ALREADY_REDEEMED';
  END IF;

  SELECT * INTO v_code
  FROM public.mistake_invite_codes
  WHERE code = upper(trim(p_code))
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'INVITE_INVALID'; END IF;
  IF v_code.status = 'exhausted' OR v_code.redemption_count >= 1 THEN
    RAISE EXCEPTION 'INVITE_EXHAUSTED';
  END IF;
  IF v_code.status <> 'active' THEN RAISE EXCEPTION 'INVITE_INACTIVE'; END IF;

  IF v_code.campaign_id IS NOT NULL THEN
    SELECT * INTO v_campaign
    FROM public.mistake_invite_campaigns
    WHERE id = v_code.campaign_id;

    IF v_campaign.status <> 'active'
      OR (v_campaign.starts_at IS NOT NULL AND v_campaign.starts_at > now())
      OR (v_campaign.ends_at IS NOT NULL AND v_campaign.ends_at <= now()) THEN
      RAISE EXCEPTION 'INVITE_CAMPAIGN_INACTIVE';
    END IF;
  END IF;

  IF v_code.expires_at IS NOT NULL AND v_code.expires_at <= now() THEN
    UPDATE public.mistake_invite_codes
    SET status = 'expired', updated_at = now()
    WHERE id = v_code.id;
    RAISE EXCEPTION 'INVITE_EXPIRED';
  END IF;

  INSERT INTO public.mistake_invite_redemptions(
    invite_code_id,
    user_id,
    granted_points
  )
  VALUES (v_code.id, v_user_id, v_code.grant_points)
  RETURNING id INTO v_redemption_id;

  INSERT INTO public.mistake_credit_accounts(
    user_id,
    available_points,
    lifetime_granted
  )
  VALUES (v_user_id, v_code.grant_points, v_code.grant_points)
  ON CONFLICT (user_id) DO UPDATE SET
    status = 'active',
    available_points = public.mistake_credit_accounts.available_points + EXCLUDED.available_points,
    lifetime_granted = public.mistake_credit_accounts.lifetime_granted + EXCLUDED.lifetime_granted,
    updated_at = now()
  RETURNING public.mistake_credit_accounts.available_points INTO v_available;

  UPDATE public.mistake_invite_codes
  SET
    redemption_count = 1,
    status = 'exhausted',
    updated_at = now()
  WHERE id = v_code.id;

  INSERT INTO public.mistake_credit_transactions(
    user_id,
    invite_redemption_id,
    transaction_type,
    available_delta,
    available_after,
    reserved_after,
    description
  )
  SELECT
    v_user_id,
    v_redemption_id,
    'invite_grant',
    v_code.grant_points,
    available_points,
    reserved_points,
    '邀请码试用积分'
  FROM public.mistake_credit_accounts
  WHERE user_id = v_user_id;

  RETURN QUERY SELECT v_available, v_code.grant_points;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_invite_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_invite_code(TEXT) TO authenticated;
