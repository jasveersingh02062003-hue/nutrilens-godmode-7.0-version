// AUTH: JWT required (validated via getClaims). Admin/super_admin/owner role check enforced in code.
// Admin-only one-shot backfill: queries Open Food Facts to fill missing barcodes
// on packed_products. Idempotent — only touches rows where barcode IS NULL.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";


const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface OFFProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  nutriments?: Record<string, number>;
}

async function searchOFF(brand: string, name: string): Promise<OFFProduct | null> {
  const q = encodeURIComponent(`${brand} ${name}`);
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${q}&search_simple=1&action=process&json=1&page_size=5&countries=india`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "NutriLens-Seeder/1.0 (admin backfill)" },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const products: OFFProduct[] = json.products || [];
    // Prefer one with a 13-digit barcode and a brand match
    const brandLower = brand.toLowerCase();
    const hit = products.find(
      (p) =>
        p.code &&
        /^\d{8,14}$/.test(p.code) &&
        (p.brands || "").toLowerCase().includes(brandLower.split(" ")[0])
    );
    return hit || products.find((p) => p.code && /^\d{8,14}$/.test(p.code)) || null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  const pre = handlePreflight(req);
  if (pre) return pre;

  // Require caller to be admin
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing auth" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await userClient.auth.getUser();
  const user = userData?.user;
  if (!user) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: isAdmin } = await userClient.rpc("has_role", {
    _user_id: user.id,
    _role: "admin",
  });
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "Admin only" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Service-role client for writes
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  const { data: rows, error } = await admin
    .from("packed_products")
    .select("id, brand, product_name")
    .is("barcode", null);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const summary = { total: rows?.length ?? 0, found: 0, missed: 0, errors: 0 };
  const log: Array<{ id: string; brand: string; name: string; barcode?: string; status: string }> = [];

  for (const row of rows ?? []) {
    try {
      const hit = await searchOFF(row.brand, row.product_name);
      if (hit?.code) {
        const { error: upErr } = await admin
          .from("packed_products")
          .update({ barcode: hit.code })
          .eq("id", row.id)
          .is("barcode", null);
        if (upErr) {
          summary.errors++;
          log.push({ id: row.id, brand: row.brand, name: row.product_name, status: `update-error: ${upErr.message}` });
        } else {
          summary.found++;
          log.push({ id: row.id, brand: row.brand, name: row.product_name, barcode: hit.code, status: "matched" });
        }
      } else {
        summary.missed++;
        log.push({ id: row.id, brand: row.brand, name: row.product_name, status: "no-match" });
      }
    } catch (e) {
      summary.errors++;
      log.push({ id: row.id, brand: row.brand, name: row.product_name, status: `exception: ${(e as Error).message}` });
    }
    // OFF policy: max ~1 req/sec from a single client
    await sleep(1100);
  }

  return new Response(JSON.stringify({ summary, log }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
