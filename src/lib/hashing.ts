// Hashing helpers for Meta Custom Audience exports.
// Meta requires SHA-256 of normalized email/phone.

/** SHA-256 hex of input. Browser SubtleCrypto. */
export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Normalize email per Meta spec: trim + lowercase. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Normalize phone per Meta spec: digits only, E.164 without leading +. */
export function normalizePhone(phone: string, defaultCountryCode = '91'): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  // If already starts with country code (e.g. 91xxxxxxxxxx) keep, else prepend.
  if (digits.length === 10) return `${defaultCountryCode}${digits}`;
  return digits;
}

/** Build a single-column CSV of SHA-256 hashed emails. */
export async function buildMetaEmailCsv(emails: string[]): Promise<string> {
  const hashed = await Promise.all(
    emails
      .map(normalizeEmail)
      .filter(Boolean)
      .map(sha256Hex)
  );
  return ['email_sha256', ...hashed].join('\n');
}
