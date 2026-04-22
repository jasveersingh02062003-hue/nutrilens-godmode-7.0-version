// Shared helpers for admin metric calculations.
import { supabase } from '@/integrations/supabase/client';

export const todayISO = (): string => new Date().toISOString().slice(0, 10);

export const daysAgoISO = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

/** Build N-day buckets from today backwards (oldest first). Each bucket is YYYY-MM-DD. */
export function buildDayBuckets(days: number): string[] {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) out.push(daysAgoISO(i));
  return out;
}

/** Count rows per day bucket from a list of ISO timestamps or YYYY-MM-DD strings. */
export function bucketByDay(timestamps: (string | null | undefined)[], days: number): number[] {
  const buckets = buildDayBuckets(days);
  const counts = new Array(days).fill(0);
  const idx = new Map(buckets.map((d, i) => [d, i]));
  for (const ts of timestamps) {
    if (!ts) continue;
    const day = ts.slice(0, 10);
    const i = idx.get(day);
    if (i !== undefined) counts[i]++;
  }
  return counts;
}

/** Percentage change between two windows, returns null if base is 0. */
export function pctDelta(current: number, previous: number): number | null {
  if (!previous) return current ? 100 : null;
  return ((current - previous) / previous) * 100;
}

/** Sum a numeric column across rows. */
export function sumField<T extends Record<string, unknown>>(rows: T[], field: keyof T): number {
  return rows.reduce((s, r) => s + Number(r[field] ?? 0), 0);
}

/** Pretty currency in INR. */
export function inr(n: number): string {
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

/** MD5 hex of a lowercased trimmed string (Meta CAPI Custom Audience format). */
export async function md5Hex(input: string): Promise<string> {
  // Browser's SubtleCrypto doesn't support MD5. Use a tiny pure-JS impl.
  return md5(input.trim().toLowerCase());
}

// --- Tiny MD5 (RFC 1321) — small, dependency-free ----------------------------
// Adapted from Joseph Myers's public-domain implementation.
function md5(str: string): string {
  function r(n: number, c: number) { return (n << c) | (n >>> (32 - c)); }
  function add(a: number, b: number) { return (a + b) & 0xffffffff; }
  function f(x: number, y: number, z: number) { return (x & y) | (~x & z); }
  function g(x: number, y: number, z: number) { return (x & z) | (y & ~z); }
  function h(x: number, y: number, z: number) { return x ^ y ^ z; }
  function i(x: number, y: number, z: number) { return y ^ (x | ~z); }
  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return add(r(add(add(a, f(b, c, d)), add(x, t)), s), b); }
  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return add(r(add(add(a, g(b, c, d)), add(x, t)), s), b); }
  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return add(r(add(add(a, h(b, c, d)), add(x, t)), s), b); }
  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return add(r(add(add(a, i(b, c, d)), add(x, t)), s), b); }

  const bytes = new TextEncoder().encode(str);
  const len = bytes.length;
  const numBlocks = ((len + 8) >> 6) + 1;
  const m = new Array(numBlocks * 16).fill(0);
  for (let k = 0; k < len; k++) m[k >> 2] |= bytes[k] << ((k % 4) * 8);
  m[len >> 2] |= 0x80 << ((len % 4) * 8);
  m[numBlocks * 16 - 2] = len * 8;

  let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
  for (let k = 0; k < m.length; k += 16) {
    const aa = a, bb = b, cc = c, dd = d;
    a = ff(a, b, c, d, m[k + 0], 7, -680876936); d = ff(d, a, b, c, m[k + 1], 12, -389564586); c = ff(c, d, a, b, m[k + 2], 17, 606105819); b = ff(b, c, d, a, m[k + 3], 22, -1044525330);
    a = ff(a, b, c, d, m[k + 4], 7, -176418897); d = ff(d, a, b, c, m[k + 5], 12, 1200080426); c = ff(c, d, a, b, m[k + 6], 17, -1473231341); b = ff(b, c, d, a, m[k + 7], 22, -45705983);
    a = ff(a, b, c, d, m[k + 8], 7, 1770035416); d = ff(d, a, b, c, m[k + 9], 12, -1958414417); c = ff(c, d, a, b, m[k + 10], 17, -42063); b = ff(b, c, d, a, m[k + 11], 22, -1990404162);
    a = ff(a, b, c, d, m[k + 12], 7, 1804603682); d = ff(d, a, b, c, m[k + 13], 12, -40341101); c = ff(c, d, a, b, m[k + 14], 17, -1502002290); b = ff(b, c, d, a, m[k + 15], 22, 1236535329);
    a = gg(a, b, c, d, m[k + 1], 5, -165796510); d = gg(d, a, b, c, m[k + 6], 9, -1069501632); c = gg(c, d, a, b, m[k + 11], 14, 643717713); b = gg(b, c, d, a, m[k + 0], 20, -373897302);
    a = gg(a, b, c, d, m[k + 5], 5, -701558691); d = gg(d, a, b, c, m[k + 10], 9, 38016083); c = gg(c, d, a, b, m[k + 15], 14, -660478335); b = gg(b, c, d, a, m[k + 4], 20, -405537848);
    a = gg(a, b, c, d, m[k + 9], 5, 568446438); d = gg(d, a, b, c, m[k + 14], 9, -1019803690); c = gg(c, d, a, b, m[k + 3], 14, -187363961); b = gg(b, c, d, a, m[k + 8], 20, 1163531501);
    a = gg(a, b, c, d, m[k + 13], 5, -1444681467); d = gg(d, a, b, c, m[k + 2], 9, -51403784); c = gg(c, d, a, b, m[k + 7], 14, 1735328473); b = gg(b, c, d, a, m[k + 12], 20, -1926607734);
    a = hh(a, b, c, d, m[k + 5], 4, -378558); d = hh(d, a, b, c, m[k + 8], 11, -2022574463); c = hh(c, d, a, b, m[k + 11], 16, 1839030562); b = hh(b, c, d, a, m[k + 14], 23, -35309556);
    a = hh(a, b, c, d, m[k + 1], 4, -1530992060); d = hh(d, a, b, c, m[k + 4], 11, 1272893353); c = hh(c, d, a, b, m[k + 7], 16, -155497632); b = hh(b, c, d, a, m[k + 10], 23, -1094730640);
    a = hh(a, b, c, d, m[k + 13], 4, 681279174); d = hh(d, a, b, c, m[k + 0], 11, -358537222); c = hh(c, d, a, b, m[k + 3], 16, -722521979); b = hh(b, c, d, a, m[k + 6], 23, 76029189);
    a = hh(a, b, c, d, m[k + 9], 4, -640364487); d = hh(d, a, b, c, m[k + 12], 11, -421815835); c = hh(c, d, a, b, m[k + 15], 16, 530742520); b = hh(b, c, d, a, m[k + 2], 23, -995338651);
    a = ii(a, b, c, d, m[k + 0], 6, -198630844); d = ii(d, a, b, c, m[k + 7], 10, 1126891415); c = ii(c, d, a, b, m[k + 14], 15, -1416354905); b = ii(b, c, d, a, m[k + 5], 21, -57434055);
    a = ii(a, b, c, d, m[k + 12], 6, 1700485571); d = ii(d, a, b, c, m[k + 3], 10, -1894986606); c = ii(c, d, a, b, m[k + 10], 15, -1051523); b = ii(b, c, d, a, m[k + 1], 21, -2054922799);
    a = ii(a, b, c, d, m[k + 8], 6, 1873313359); d = ii(d, a, b, c, m[k + 15], 10, -30611744); c = ii(c, d, a, b, m[k + 6], 15, -1560198380); b = ii(b, c, d, a, m[k + 13], 21, 1309151649);
    a = ii(a, b, c, d, m[k + 4], 6, -145523070); d = ii(d, a, b, c, m[k + 11], 10, -1120210379); c = ii(c, d, a, b, m[k + 2], 15, 718787259); b = ii(b, c, d, a, m[k + 9], 21, -343485551);
    a = add(a, aa); b = add(b, bb); c = add(c, cc); d = add(d, dd);
  }
  function hex(n: number) { let s = ''; for (let j = 0; j < 4; j++) s += ((n >> (j * 8 + 4)) & 0xf).toString(16) + ((n >> (j * 8)) & 0xf).toString(16); return s; }
  return hex(a) + hex(b) + hex(c) + hex(d);
}

/** Convenience: load all profiles for admin segmenting (capped). */
export async function loadAdminProfiles() {
  return supabase
    .from('profiles')
    .select('id, name, city, goal, gender, age, weight_kg, daily_calories, onboarding_complete, created_at, marketing_consent, dob')
    .order('created_at', { ascending: false })
    .limit(2000);
}
