-- Blocker #3: brand_accounts balance protection

DROP POLICY IF EXISTS "Authenticated can insert brands" ON public.brand_accounts;
DROP POLICY IF EXISTS "Authenticated can update brands" ON public.brand_accounts;

-- Only admins can create brand accounts (brand intake flow uses admin approval)
CREATE POLICY "Admins insert brands"
ON public.brand_accounts
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Brand members can update their brand profile fields, NOT balance (trigger enforces)
CREATE POLICY "Brand members update own brand profile"
ON public.brand_accounts
FOR UPDATE
TO authenticated
USING (
  is_brand_member(id)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  is_brand_member(id)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Trigger: block direct balance changes unless caller is admin or service_role
CREATE OR REPLACE FUNCTION public.block_brand_balance_direct_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
  is_service boolean;
BEGIN
  -- Allow if balance unchanged
  IF NEW.balance = OLD.balance THEN
    RETURN NEW;
  END IF;

  -- Allow service_role (used by SECURITY DEFINER RPC and edge functions)
  is_service := current_setting('role', true) = 'service_role';
  IF is_service THEN
    RETURN NEW;
  END IF;

  -- Allow admins/owners
  is_admin := has_role(auth.uid(), 'admin'::app_role)
              OR has_role(auth.uid(), 'super_admin'::app_role)
              OR is_owner(auth.uid());
  IF is_admin THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'brand_accounts.balance cannot be modified directly. Use apply_brand_transaction().'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_block_brand_balance_direct_write ON public.brand_accounts;
CREATE TRIGGER trg_block_brand_balance_direct_write
BEFORE UPDATE OF balance ON public.brand_accounts
FOR EACH ROW
EXECUTE FUNCTION public.block_brand_balance_direct_write();

-- Atomic ledger + balance RPC (only admins can call)
CREATE OR REPLACE FUNCTION public.apply_brand_transaction(
  p_brand_id uuid,
  p_amount numeric,
  p_type text,
  p_reference text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_txn_id uuid;
  v_new_balance numeric;
BEGIN
  IF NOT (
    has_role(v_actor, 'admin'::app_role)
    OR has_role(v_actor, 'super_admin'::app_role)
    OR is_owner(v_actor)
  ) THEN
    RAISE EXCEPTION 'Only admins can apply brand transactions' USING ERRCODE = '42501';
  END IF;

  IF p_type NOT IN ('topup', 'debit', 'refund', 'adjustment') THEN
    RAISE EXCEPTION 'Invalid transaction type: %', p_type USING ERRCODE = '22023';
  END IF;

  -- Lock the brand row
  SELECT balance INTO v_new_balance FROM public.brand_accounts WHERE id = p_brand_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Brand % not found', p_brand_id USING ERRCODE = '02000';
  END IF;

  -- Compute new balance (topup/refund add; debit subtracts; adjustment uses sign of amount)
  IF p_type = 'debit' THEN
    v_new_balance := v_new_balance - abs(p_amount);
  ELSIF p_type IN ('topup', 'refund') THEN
    v_new_balance := v_new_balance + abs(p_amount);
  ELSE
    v_new_balance := v_new_balance + p_amount;
  END IF;

  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient balance for brand %', p_brand_id USING ERRCODE = '23514';
  END IF;

  -- Insert ledger entry
  INSERT INTO public.brand_transactions (brand_id, amount, type, reference, notes, created_by)
  VALUES (p_brand_id, p_amount, p_type, p_reference, p_notes, v_actor)
  RETURNING id INTO v_txn_id;

  -- Update balance (trigger allows because we are SECURITY DEFINER + admin check above)
  UPDATE public.brand_accounts
  SET balance = v_new_balance, updated_at = now()
  WHERE id = p_brand_id;

  RETURN v_txn_id;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_brand_transaction(uuid, numeric, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.apply_brand_transaction(uuid, numeric, text, text, text) TO authenticated;