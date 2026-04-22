const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const headers = {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    };

    // Fetch all active alerts
    const alertsRes = await fetch(
      `${supabaseUrl}/rest/v1/price_alerts?is_active=eq.true&select=*`,
      { headers }
    );
    if (!alertsRes.ok) {
      throw new Error(`Failed to fetch alerts: ${await alertsRes.text()}`);
    }
    const alerts = await alertsRes.json();

    if (!alerts || alerts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, checked: 0, triggered: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let triggered = 0;
    const today = new Date().toISOString().split('T')[0];

    for (const alert of alerts) {
      // Get current price for this item+city
      const priceRes = await fetch(
        `${supabaseUrl}/rest/v1/city_prices?city=eq.${encodeURIComponent(alert.city)}&item_name=ilike.%25${encodeURIComponent(alert.item_name)}%25&order=price_date.desc&limit=1`,
        { headers }
      );

      if (!priceRes.ok) continue;
      const prices = await priceRes.json();
      if (!prices || prices.length === 0) continue;

      const currentPrice = Number(prices[0].avg_price);
      const thresholdMet = alert.comparison_type === 'below'
        ? currentPrice <= Number(alert.threshold_price)
        : currentPrice >= Number(alert.threshold_price);

      if (thresholdMet) {
        // Don't re-trigger if already triggered today
        if (alert.last_triggered_at && alert.last_triggered_at.startsWith(today)) continue;

        // Update last_triggered_at
        await fetch(
          `${supabaseUrl}/rest/v1/price_alerts?id=eq.${alert.id}`,
          {
            method: 'PATCH',
            headers: { ...headers, 'Prefer': 'return=minimal' },
            body: JSON.stringify({ last_triggered_at: new Date().toISOString() }),
          }
        );

        // Insert in-app notification row (Phase 2 — Step A)
        await fetch(
          `${supabaseUrl}/rest/v1/price_alert_notifications`,
          {
            method: 'POST',
            headers: { ...headers, 'Prefer': 'return=minimal' },
            body: JSON.stringify({
              user_id: alert.user_id,
              alert_id: alert.id,
              item_name: alert.item_name,
              city: alert.city,
              current_price: currentPrice,
              threshold_price: Number(alert.threshold_price),
              direction: alert.comparison_type,
            }),
          }
        );

        triggered++;
        console.log(JSON.stringify({
          event: 'price_alert_triggered',
          user_id: alert.user_id,
          item: alert.item_name,
          city: alert.city,
          currentPrice,
          threshold: alert.threshold_price,
          direction: alert.comparison_type,
        }));
      }
    }

    console.log(JSON.stringify({
      event: 'alert_check_complete',
      checked: alerts.length,
      triggered,
      timestamp: new Date().toISOString(),
    }));

    return new Response(
      JSON.stringify({ success: true, checked: alerts.length, triggered }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Alert check error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
