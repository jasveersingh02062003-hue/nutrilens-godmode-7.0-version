// Sentry initialization with PII filtering for DPDP compliance.
// Safely no-ops if VITE_SENTRY_DSN is not set.
import * as Sentry from '@sentry/react';

const PII_KEYS = new Set([
  'email', 'phone', 'phone_number', 'name', 'full_name', 'first_name', 'last_name',
  'weight', 'weight_kg', 'target_weight', 'height_cm', 'dob', 'age',
  'health_conditions', 'conditions', 'medications', 'women_health', 'men_health',
  'address', 'city', 'photo_url', 'avatar_url',
]);

function scrubPII<T>(value: T, depth = 0): T {
  if (depth > 6 || value == null) return value;
  if (Array.isArray(value)) return value.map((v) => scrubPII(v, depth + 1)) as unknown as T;
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (PII_KEYS.has(k.toLowerCase())) {
        out[k] = '[redacted]';
      } else {
        out[k] = scrubPII(v, depth + 1);
      }
    }
    return out as unknown as T;
  }
  return value;
}

let initialized = false;

export function initSentry() {
  if (initialized) return;
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) {
    if (import.meta.env.DEV) console.info('[sentry] VITE_SENTRY_DSN not set — skipping init');
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    sendDefaultPii: false,
    beforeSend(event) {
      // Strip user identifying data
      if (event.user) {
        event.user = { id: event.user.id }; // keep only opaque id
      }
      if (event.request?.cookies) delete event.request.cookies;
      if (event.request?.headers) {
        const safeHeaders: Record<string, string> = {};
        for (const [k, v] of Object.entries(event.request.headers)) {
          if (!/auth|cookie|token|key/i.test(k)) safeHeaders[k] = v as string;
        }
        event.request.headers = safeHeaders;
      }
      if (event.extra) event.extra = scrubPII(event.extra);
      if (event.contexts) event.contexts = scrubPII(event.contexts);
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((b) => ({
          ...b,
          data: b.data ? scrubPII(b.data) : b.data,
        }));
      }
      return event;
    },
  });

  initialized = true;
}

/** Tag the current user (opaque id only — never email/name). */
export function setSentryUser(userId: string | null) {
  if (!initialized) return;
  Sentry.setUser(userId ? { id: userId } : null);
}

export { Sentry };
