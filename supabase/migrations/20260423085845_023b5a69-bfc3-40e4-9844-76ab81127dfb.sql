-- Hot path: daily logs by user + date (Dashboard, Progress, Calorie Engine)
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date
  ON public.daily_logs (user_id, log_date DESC);

-- Weight logs (Progress chart, BMI recompute)
CREATE INDEX IF NOT EXISTS idx_weight_logs_user_date
  ON public.weight_logs (user_id, log_date DESC);

-- Water logs (WaterTracker)
CREATE INDEX IF NOT EXISTS idx_water_logs_user_date
  ON public.water_logs (user_id, log_date DESC);

-- Supplement logs (SupplementsCard)
CREATE INDEX IF NOT EXISTS idx_supplement_logs_user_date
  ON public.supplement_logs (user_id, log_date DESC);

-- Ad impressions / clicks (admin reporting + budget reconciliation)
CREATE INDEX IF NOT EXISTS idx_ad_impressions_campaign_time
  ON public.ad_impressions (campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_user_time
  ON public.ad_impressions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_clicks_campaign_time
  ON public.ad_clicks (campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_clicks_user_time
  ON public.ad_clicks (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_conversions_campaign_time
  ON public.ad_conversions (campaign_id, created_at DESC);

-- Active campaigns (select-ads edge function)
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_status_dates
  ON public.ad_campaigns (status, start_date, end_date)
  WHERE status = 'active';

-- Monika conversation history
CREATE INDEX IF NOT EXISTS idx_monika_conversations_user_time
  ON public.monika_conversations (user_id, created_at DESC);

-- Analytics events
CREATE INDEX IF NOT EXISTS idx_events_user_time
  ON public.events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_name_time
  ON public.events (event_name, created_at DESC);

-- Price alerts (active alerts scan in nightly job)
CREATE INDEX IF NOT EXISTS idx_price_alerts_active
  ON public.price_alerts (user_id, is_active)
  WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_price_alert_notifs_user
  ON public.price_alert_notifications (user_id, is_read, created_at DESC);

-- City prices lookup (Market page)
CREATE INDEX IF NOT EXISTS idx_city_prices_item_city_date
  ON public.city_prices (item_name, city, price_date DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_item_city_date
  ON public.price_history (item_name, city, price_date DESC);

-- Role checks (every RLS call uses has_role / is_owner / is_marketer)
CREATE INDEX IF NOT EXISTS idx_user_roles_user
  ON public.user_roles (user_id);

-- Brand membership checks
CREATE INDEX IF NOT EXISTS idx_brand_members_user
  ON public.brand_members (user_id, brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_members_brand
  ON public.brand_members (brand_id);

-- Audit logs (super_admin viewing)
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_time
  ON public.audit_logs (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_time
  ON public.audit_logs (target_user_id, created_at DESC);

-- API usage (cost dashboard)
CREATE INDEX IF NOT EXISTS idx_api_usage_vendor_time
  ON public.api_usage (vendor, created_at DESC);

-- Event plans (active per user)
CREATE INDEX IF NOT EXISTS idx_event_plans_user_status
  ON public.event_plans (user_id, status);

-- Achievements
CREATE INDEX IF NOT EXISTS idx_user_achievements_user
  ON public.user_achievements (user_id, unlocked_at DESC);

-- Packed products (Market category browse)
CREATE INDEX IF NOT EXISTS idx_packed_products_category
  ON public.packed_products (category, pes_score DESC);
CREATE INDEX IF NOT EXISTS idx_packed_products_barcode
  ON public.packed_products (barcode)
  WHERE barcode IS NOT NULL;