-- Invite-gated access, credit ledger, versioned AI pricing, and usage metering.

CREATE TABLE IF NOT EXISTS public.mistake_invite_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'xiaohongshu',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'ended')),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mistake_invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.mistake_invite_campaigns(id) ON DELETE SET NULL,
  code TEXT NOT NULL UNIQUE CHECK (code = upper(trim(code))),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'exhausted', 'expired')),
  grant_points BIGINT NOT NULL CHECK (grant_points > 0),
  max_redemptions INTEGER NOT NULL DEFAULT 1 CHECK (max_redemptions > 0),
  redemption_count INTEGER NOT NULL DEFAULT 0 CHECK (redemption_count >= 0),
  expires_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mistake_credit_accounts (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'frozen', 'closed')),
  available_points BIGINT NOT NULL DEFAULT 0 CHECK (available_points >= 0),
  reserved_points BIGINT NOT NULL DEFAULT 0 CHECK (reserved_points >= 0),
  lifetime_granted BIGINT NOT NULL DEFAULT 0 CHECK (lifetime_granted >= 0),
  lifetime_spent BIGINT NOT NULL DEFAULT 0 CHECK (lifetime_spent >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mistake_invite_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code_id UUID NOT NULL REFERENCES public.mistake_invite_codes(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_points BIGINT NOT NULL CHECK (granted_points > 0),
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id),
  UNIQUE (invite_code_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.mistake_ai_model_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CNY',
  input_cost_micros_per_million BIGINT,
  output_cost_micros_per_million BIGINT,
  request_cost_micros BIGINT,
  image_cost_micros BIGINT,
  input_points_per_million BIGINT NOT NULL DEFAULT 0 CHECK (input_points_per_million >= 0),
  output_points_per_million BIGINT NOT NULL DEFAULT 0 CHECK (output_points_per_million >= 0),
  total_points_per_million BIGINT NOT NULL DEFAULT 0 CHECK (total_points_per_million >= 0),
  request_points BIGINT NOT NULL DEFAULT 0 CHECK (request_points >= 0),
  image_points BIGINT NOT NULL DEFAULT 0 CHECK (image_points >= 0),
  minimum_points BIGINT NOT NULL DEFAULT 1 CHECK (minimum_points >= 0),
  reservation_points BIGINT NOT NULL CHECK (reservation_points > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'retired')),
  effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_to TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (effective_to IS NULL OR effective_to > effective_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS mistake_ai_model_prices_one_active_idx
  ON public.mistake_ai_model_prices(operation, provider, model)
  WHERE status = 'active' AND effective_to IS NULL;

CREATE TABLE IF NOT EXISTS public.mistake_ai_usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pricing_id UUID NOT NULL REFERENCES public.mistake_ai_model_prices(id) ON DELETE RESTRICT,
  operation TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'succeeded', 'failed')),
  idempotency_key TEXT NOT NULL,
  provider_request_id TEXT,
  input_tokens BIGINT NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
  output_tokens BIGINT NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
  total_tokens BIGINT NOT NULL DEFAULT 0 CHECK (total_tokens >= 0),
  image_count INTEGER NOT NULL DEFAULT 0 CHECK (image_count >= 0),
  request_count INTEGER NOT NULL DEFAULT 1 CHECK (request_count >= 0),
  reserved_points BIGINT NOT NULL CHECK (reserved_points > 0),
  calculated_points BIGINT,
  charged_points BIGINT,
  raw_usage JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  settled_at TIMESTAMPTZ,
  UNIQUE (user_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.mistake_credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_id UUID REFERENCES public.mistake_ai_usage_records(id) ON DELETE SET NULL,
  invite_redemption_id UUID REFERENCES public.mistake_invite_redemptions(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('invite_grant', 'purchase', 'admin_grant', 'reserve', 'settle', 'release', 'refund')),
  available_delta BIGINT NOT NULL DEFAULT 0,
  reserved_delta BIGINT NOT NULL DEFAULT 0,
  available_after BIGINT NOT NULL CHECK (available_after >= 0),
  reserved_after BIGINT NOT NULL CHECK (reserved_after >= 0),
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mistake_credit_transactions_user_created_idx
  ON public.mistake_credit_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS mistake_ai_usage_records_user_created_idx
  ON public.mistake_ai_usage_records(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS mistake_invite_codes_campaign_idx ON public.mistake_invite_codes(campaign_id);

ALTER TABLE public.mistake_invite_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mistake_invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mistake_invite_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mistake_credit_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mistake_credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mistake_ai_model_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mistake_ai_usage_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credit account" ON public.mistake_credit_accounts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own credit transactions" ON public.mistake_credit_transactions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own invite redemption" ON public.mistake_invite_redemptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own AI usage" ON public.mistake_ai_usage_records
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

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

  IF EXISTS (SELECT 1 FROM public.mistake_invite_redemptions WHERE user_id = v_user_id) THEN
    RAISE EXCEPTION 'INVITE_ALREADY_REDEEMED';
  END IF;

  SELECT * INTO v_code
  FROM public.mistake_invite_codes
  WHERE code = upper(trim(p_code))
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'INVITE_INVALID'; END IF;
  IF v_code.status <> 'active' THEN RAISE EXCEPTION 'INVITE_INACTIVE'; END IF;
  IF v_code.campaign_id IS NOT NULL THEN
    SELECT * INTO v_campaign FROM public.mistake_invite_campaigns
    WHERE id = v_code.campaign_id;
    IF v_campaign.status <> 'active'
      OR (v_campaign.starts_at IS NOT NULL AND v_campaign.starts_at > now())
      OR (v_campaign.ends_at IS NOT NULL AND v_campaign.ends_at <= now()) THEN
      RAISE EXCEPTION 'INVITE_CAMPAIGN_INACTIVE';
    END IF;
  END IF;
  IF v_code.expires_at IS NOT NULL AND v_code.expires_at <= now() THEN
    UPDATE public.mistake_invite_codes SET status = 'expired', updated_at = now() WHERE id = v_code.id;
    RAISE EXCEPTION 'INVITE_EXPIRED';
  END IF;
  IF v_code.redemption_count >= v_code.max_redemptions THEN
    UPDATE public.mistake_invite_codes SET status = 'exhausted', updated_at = now() WHERE id = v_code.id;
    RAISE EXCEPTION 'INVITE_EXHAUSTED';
  END IF;

  INSERT INTO public.mistake_invite_redemptions(invite_code_id, user_id, granted_points)
  VALUES (v_code.id, v_user_id, v_code.grant_points)
  RETURNING id INTO v_redemption_id;

  INSERT INTO public.mistake_credit_accounts(user_id, available_points, lifetime_granted)
  VALUES (v_user_id, v_code.grant_points, v_code.grant_points)
  ON CONFLICT (user_id) DO UPDATE SET
    status = 'active',
    available_points = public.mistake_credit_accounts.available_points + EXCLUDED.available_points,
    lifetime_granted = public.mistake_credit_accounts.lifetime_granted + EXCLUDED.lifetime_granted,
    updated_at = now()
  RETURNING public.mistake_credit_accounts.available_points INTO v_available;

  UPDATE public.mistake_invite_codes SET
    redemption_count = redemption_count + 1,
    status = CASE WHEN redemption_count + 1 >= max_redemptions THEN 'exhausted' ELSE status END,
    updated_at = now()
  WHERE id = v_code.id;

  INSERT INTO public.mistake_credit_transactions(
    user_id, invite_redemption_id, transaction_type, available_delta,
    available_after, reserved_after, description
  )
  SELECT v_user_id, v_redemption_id, 'invite_grant', v_code.grant_points,
    available_points, reserved_points, '邀请码试用积分'
  FROM public.mistake_credit_accounts WHERE user_id = v_user_id;

  RETURN QUERY SELECT v_available, v_code.grant_points;
END;
$$;

CREATE OR REPLACE FUNCTION public.reserve_ai_credits(
  p_operation TEXT,
  p_provider TEXT,
  p_model TEXT,
  p_idempotency_key TEXT
)
RETURNS TABLE(usage_id UUID, reserved_points BIGINT, available_points BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_user_id UUID := auth.uid();
  v_price public.mistake_ai_model_prices%ROWTYPE;
  v_account public.mistake_credit_accounts%ROWTYPE;
  v_usage_id UUID;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;

  SELECT * INTO v_price FROM public.mistake_ai_model_prices
  WHERE operation = p_operation AND provider = p_provider AND model = p_model
    AND status = 'active' AND effective_from <= now()
    AND (effective_to IS NULL OR effective_to > now())
  ORDER BY effective_from DESC LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'PRICING_NOT_CONFIGURED'; END IF;

  SELECT * INTO v_account FROM public.mistake_credit_accounts
  WHERE user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVITE_REQUIRED'; END IF;
  IF v_account.status <> 'active' THEN RAISE EXCEPTION 'CREDIT_ACCOUNT_INACTIVE'; END IF;
  IF v_account.available_points < v_price.reservation_points THEN
    RAISE EXCEPTION 'INSUFFICIENT_CREDITS';
  END IF;

  INSERT INTO public.mistake_ai_usage_records(
    user_id, pricing_id, operation, provider, model, idempotency_key, reserved_points
  ) VALUES (
    v_user_id, v_price.id, p_operation, p_provider, p_model,
    p_idempotency_key, v_price.reservation_points
  ) RETURNING id INTO v_usage_id;

  UPDATE public.mistake_credit_accounts SET
    available_points = available_points - v_price.reservation_points,
    reserved_points = reserved_points + v_price.reservation_points,
    updated_at = now()
  WHERE user_id = v_user_id
  RETURNING * INTO v_account;

  INSERT INTO public.mistake_credit_transactions(
    user_id, usage_id, transaction_type, available_delta, reserved_delta,
    available_after, reserved_after, description
  ) VALUES (
    v_user_id, v_usage_id, 'reserve', -v_price.reservation_points,
    v_price.reservation_points, v_account.available_points,
    v_account.reserved_points, p_operation || ' 预冻结'
  );

  RETURN QUERY SELECT v_usage_id, v_price.reservation_points, v_account.available_points;
END;
$$;

CREATE OR REPLACE FUNCTION public.settle_ai_credits(
  p_usage_id UUID,
  p_input_tokens BIGINT DEFAULT 0,
  p_output_tokens BIGINT DEFAULT 0,
  p_total_tokens BIGINT DEFAULT 0,
  p_image_count INTEGER DEFAULT 0,
  p_request_count INTEGER DEFAULT 1,
  p_provider_request_id TEXT DEFAULT NULL,
  p_raw_usage JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(charged_points BIGINT, available_points BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_user_id UUID := auth.uid();
  v_usage public.mistake_ai_usage_records%ROWTYPE;
  v_price public.mistake_ai_model_prices%ROWTYPE;
  v_account public.mistake_credit_accounts%ROWTYPE;
  v_calculated BIGINT;
  v_charged BIGINT;
  v_available_delta BIGINT;
  v_extra BIGINT;
BEGIN
  SELECT * INTO v_usage FROM public.mistake_ai_usage_records
  WHERE id = p_usage_id AND user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'USAGE_NOT_FOUND'; END IF;
  IF v_usage.status <> 'reserved' THEN RAISE EXCEPTION 'USAGE_ALREADY_SETTLED'; END IF;

  SELECT * INTO v_price FROM public.mistake_ai_model_prices WHERE id = v_usage.pricing_id;
  SELECT * INTO v_account FROM public.mistake_credit_accounts WHERE user_id = v_user_id FOR UPDATE;

  v_calculated := GREATEST(
    v_price.minimum_points,
    v_price.request_points * GREATEST(p_request_count, 0)
      + v_price.image_points * GREATEST(p_image_count, 0)
      + CEIL(GREATEST(p_input_tokens, 0)::numeric * v_price.input_points_per_million / 1000000)::bigint
      + CEIL(GREATEST(p_output_tokens, 0)::numeric * v_price.output_points_per_million / 1000000)::bigint
      + CEIL(GREATEST(p_total_tokens, 0)::numeric * v_price.total_points_per_million / 1000000)::bigint
  );

  v_extra := GREATEST(v_calculated - v_usage.reserved_points, 0);
  v_charged := v_usage.reserved_points + LEAST(v_extra, v_account.available_points);
  IF v_calculated <= v_usage.reserved_points THEN v_charged := v_calculated; END IF;
  v_available_delta := v_usage.reserved_points - v_charged;

  UPDATE public.mistake_credit_accounts SET
    available_points = available_points + v_available_delta,
    reserved_points = reserved_points - v_usage.reserved_points,
    lifetime_spent = lifetime_spent + v_charged,
    updated_at = now()
  WHERE user_id = v_user_id RETURNING * INTO v_account;

  UPDATE public.mistake_ai_usage_records SET
    status = 'succeeded', input_tokens = GREATEST(p_input_tokens, 0),
    output_tokens = GREATEST(p_output_tokens, 0), total_tokens = GREATEST(p_total_tokens, 0),
    image_count = GREATEST(p_image_count, 0), request_count = GREATEST(p_request_count, 0),
    provider_request_id = p_provider_request_id, raw_usage = COALESCE(p_raw_usage, '{}'::jsonb),
    calculated_points = v_calculated, charged_points = v_charged, settled_at = now()
  WHERE id = p_usage_id;

  INSERT INTO public.mistake_credit_transactions(
    user_id, usage_id, transaction_type, available_delta, reserved_delta,
    available_after, reserved_after, description,
    metadata
  ) VALUES (
    v_user_id, p_usage_id, 'settle', v_available_delta, -v_usage.reserved_points,
    v_account.available_points, v_account.reserved_points, v_usage.operation || ' 结算',
    jsonb_build_object('calculated_points', v_calculated, 'charged_points', v_charged)
  );

  RETURN QUERY SELECT v_charged, v_account.available_points;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_ai_credits(p_usage_id UUID, p_error_code TEXT DEFAULT NULL)
RETURNS TABLE(released_points BIGINT, available_points BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_user_id UUID := auth.uid();
  v_usage public.mistake_ai_usage_records%ROWTYPE;
  v_account public.mistake_credit_accounts%ROWTYPE;
BEGIN
  SELECT * INTO v_usage FROM public.mistake_ai_usage_records
  WHERE id = p_usage_id AND user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'USAGE_NOT_FOUND'; END IF;
  IF v_usage.status <> 'reserved' THEN RAISE EXCEPTION 'USAGE_ALREADY_SETTLED'; END IF;

  UPDATE public.mistake_credit_accounts SET
    available_points = available_points + v_usage.reserved_points,
    reserved_points = reserved_points - v_usage.reserved_points,
    updated_at = now()
  WHERE user_id = v_user_id RETURNING * INTO v_account;

  UPDATE public.mistake_ai_usage_records SET status = 'failed', error_code = p_error_code,
    charged_points = 0, settled_at = now() WHERE id = p_usage_id;

  INSERT INTO public.mistake_credit_transactions(
    user_id, usage_id, transaction_type, available_delta, reserved_delta,
    available_after, reserved_after, description
  ) VALUES (
    v_user_id, p_usage_id, 'release', v_usage.reserved_points, -v_usage.reserved_points,
    v_account.available_points, v_account.reserved_points, v_usage.operation || ' 失败解冻'
  );

  RETURN QUERY SELECT v_usage.reserved_points, v_account.available_points;
END;
$$;

-- Releases reservations left behind by an interrupted Railway process. Invoke
-- this from a trusted Supabase cron job; it is never exposed to app users.
CREATE OR REPLACE FUNCTION public.release_stale_ai_reservations(
  p_older_than INTERVAL DEFAULT interval '15 minutes'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_usage public.mistake_ai_usage_records%ROWTYPE;
  v_account public.mistake_credit_accounts%ROWTYPE;
  v_released INTEGER := 0;
BEGIN
  FOR v_usage IN
    SELECT * FROM public.mistake_ai_usage_records
    WHERE status = 'reserved' AND created_at < now() - p_older_than
    ORDER BY created_at
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.mistake_credit_accounts SET
      available_points = available_points + v_usage.reserved_points,
      reserved_points = reserved_points - v_usage.reserved_points,
      updated_at = now()
    WHERE user_id = v_usage.user_id
    RETURNING * INTO v_account;

    UPDATE public.mistake_ai_usage_records SET
      status = 'failed', error_code = 'STALE_RESERVATION',
      charged_points = 0, settled_at = now()
    WHERE id = v_usage.id;

    INSERT INTO public.mistake_credit_transactions(
      user_id, usage_id, transaction_type, available_delta, reserved_delta,
      available_after, reserved_after, description
    ) VALUES (
      v_usage.user_id, v_usage.id, 'release', v_usage.reserved_points,
      -v_usage.reserved_points, v_account.available_points,
      v_account.reserved_points, v_usage.operation || ' 超时解冻'
    );
    v_released := v_released + 1;
  END LOOP;

  RETURN v_released;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_invite_code(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reserve_ai_credits(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.settle_ai_credits(UUID, BIGINT, BIGINT, BIGINT, INTEGER, INTEGER, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_ai_credits(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_stale_ai_reservations(INTERVAL) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_invite_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_ai_credits(TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.settle_ai_credits(UUID, BIGINT, BIGINT, BIGINT, INTEGER, INTEGER, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_ai_credits(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_stale_ai_reservations(INTERVAL) TO service_role;

-- Clients may only read their own account history through RLS. All balance
-- mutations must go through the SECURITY DEFINER functions above.
REVOKE ALL ON TABLE public.mistake_invite_campaigns FROM anon, authenticated;
REVOKE ALL ON TABLE public.mistake_invite_codes FROM anon, authenticated;
REVOKE ALL ON TABLE public.mistake_ai_model_prices FROM anon, authenticated;
REVOKE ALL ON TABLE public.mistake_invite_redemptions FROM anon, authenticated;
REVOKE ALL ON TABLE public.mistake_credit_accounts FROM anon, authenticated;
REVOKE ALL ON TABLE public.mistake_credit_transactions FROM anon, authenticated;
REVOKE ALL ON TABLE public.mistake_ai_usage_records FROM anon, authenticated;
GRANT SELECT ON TABLE public.mistake_invite_redemptions TO authenticated;
GRANT SELECT ON TABLE public.mistake_credit_accounts TO authenticated;
GRANT SELECT ON TABLE public.mistake_credit_transactions TO authenticated;
GRANT SELECT ON TABLE public.mistake_ai_usage_records TO authenticated;

-- Initial product tariffs. These are points, not claims about provider list
-- prices. Update monetary cost columns and point rates before paid launch.
INSERT INTO public.mistake_ai_model_prices(
  operation, provider, model, request_points, total_points_per_million,
  image_points, minimum_points, reservation_points
) VALUES
  -- Nominally 6 points, then increases with total token usage.
  ('image_recognition', 'alibaba', 'qwen3.6-plus', 5, 1000, 0, 6, 6),
  -- Legacy OCR + text-analysis mode keeps its own tariff.
  ('image_recognition_text', 'deepseek', 'deepseek-v4-flash', 5, 500, 5, 10, 10),
  -- These Baidu endpoints currently expose no token usage, so they charge 6/request.
  ('image_recognition', 'baidu', 'image-understanding', 6, 0, 0, 6, 6),
  ('image_recognition', 'baidu', 'paper-cut', 6, 0, 0, 6, 6),
  -- Nominally 4 points; larger responses increase the final charge.
  ('mistake_analysis', 'deepseek', 'deepseek-v4-pro', 3, 500, 0, 4, 4),
  ('variation_generation', 'deepseek', 'deepseek-v4-pro', 0, 500, 0, 4, 4)
ON CONFLICT DO NOTHING;
