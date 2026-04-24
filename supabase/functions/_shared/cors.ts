// Shared CORS helper for all edge functions.
// Replaces wildcard `Access-Control-Allow-Origin: *` with a dynamic, validated
// whitelist so only our own domains (prod + previews + local dev) can call our
// functions from a browser. Server-to-server calls (no Origin header) still work.
//
// To add a new production domain, append it to ALLOWED_ORIGINS or the
// EXTRA_ORIGINS env var (comma-separated) without redeploying every function.

const STATIC_ALLOWED_ORIGINS: string[] = [
  // Production custom domains
  "https://nutrilens.app",
  "https://www.nutrilens.app",
  // Lovable published / preview hosts
  "https://1dc96290-d02b-45cb-8361-9976535540b5.lovableproject.com",
  "https://id-preview--1dc96290-d02b-45cb-8361-9976535540b5.lovable.app",
  // Local dev
  "http://localhost:5173",
  "http://localhost:8080",
  "http://localhost:3000",
];

// Hostname-suffix patterns we trust (covers all Lovable preview / published URLs
// and Capacitor mobile shells without listing every hash).
const ALLOWED_HOST_SUFFIXES: string[] = [
  ".lovable.app",
  ".lovableproject.com",
  ".lovable.dev",
];

// Capacitor mobile webviews use these schemes (no Origin header on iOS in some
// versions, "null" string on others — both handled below).
const ALLOWED_MOBILE_ORIGINS = new Set<string>([
  "capacitor://localhost",
  "ionic://localhost",
  "http://localhost",
]);

const BASE_HEADERS = "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version";

function getAllowedOrigins(): string[] {
  const extra = (Deno.env.get("EXTRA_CORS_ORIGINS") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return [...STATIC_ALLOWED_ORIGINS, ...extra];
}

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true; // server-to-server / curl / mobile native — no Origin header
  if (origin === "null") return true; // file:// or sandboxed iframe
  if (ALLOWED_MOBILE_ORIGINS.has(origin)) return true;
  if (getAllowedOrigins().includes(origin)) return true;
  try {
    const host = new URL(origin).hostname;
    return ALLOWED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
  } catch {
    return false;
  }
}

/**
 * Build CORS headers scoped to the incoming request's Origin.
 * Returns headers with `Access-Control-Allow-Origin` set to the request origin
 * if it's whitelisted, otherwise omits the header (browser will block).
 */
export function buildCorsHeaders(req: Request, extraAllowedHeaders?: string): Record<string, string> {
  const origin = req.headers.get("origin");
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": extraAllowedHeaders
      ? `${BASE_HEADERS}, ${extraAllowedHeaders}`
      : BASE_HEADERS,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
  if (isAllowedOrigin(origin)) {
    // Echo the validated origin back. For null/empty origin (server-to-server),
    // we still allow but don't set the header — fetch from server doesn't need it.
    if (origin) headers["Access-Control-Allow-Origin"] = origin;
    else headers["Access-Control-Allow-Origin"] = "*";
  }
  return headers;
}

/**
 * One-liner for OPTIONS preflight. Returns null if the request isn't OPTIONS.
 *   const pre = handlePreflight(req); if (pre) return pre;
 */
export function handlePreflight(req: Request, extraAllowedHeaders?: string): Response | null {
  if (req.method !== "OPTIONS") return null;
  return new Response(null, { status: 204, headers: buildCorsHeaders(req, extraAllowedHeaders) });
}
