const MODULE_RETRY_PREFIX = 'nutrilens-module-retry:';
const MAX_MODULE_RECOVERY_ATTEMPTS = 2;
const RECOVERABLE_MODULE_ERROR = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Failed to load module script|Unable to preload CSS/i;

function getRetryKey(key: string) {
  return `${MODULE_RETRY_PREFIX}${key}`;
}

export function isRecoverableModuleError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return RECOVERABLE_MODULE_ERROR.test(message);
}

export function clearModuleImportRecovery(key: string) {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(getRetryKey(key));
}

export async function clearRuntimeCaches() {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    if ('caches' in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key)));
    }
  } catch {
    // Best-effort cache cleanup before a hard refresh.
  }
}

export function attemptModuleImportRecovery(key: string) {
  if (typeof window === 'undefined') return false;

  const retryKey = getRetryKey(key);
  const attempts = Number(sessionStorage.getItem(retryKey) ?? '0');

  if (attempts >= MAX_MODULE_RECOVERY_ATTEMPTS) {
    sessionStorage.removeItem(retryKey);
    return false;
  }

  sessionStorage.setItem(retryKey, String(attempts + 1));

  const reloadUrl = new URL(window.location.href);
  reloadUrl.searchParams.set('__reload', Date.now().toString());

  void clearRuntimeCaches().finally(() => {
    window.location.replace(reloadUrl.toString());
  });

  return true;
}

export async function preloadRouteSafely<T>(importer: () => Promise<T>, key: string) {
  try {
    await importer();
    clearModuleImportRecovery(key);
  } catch (error) {
    if (isRecoverableModuleError(error)) {
      if (attemptModuleImportRecovery(`preload:${key}`)) return;
      console.warn('[module-recovery] Preload failed after retries:', error);
      return;
    }

    throw error;
  }
}

export function installGlobalModuleRecovery() {
  if (typeof window === 'undefined') return;

  const recoveryWindow = window as Window & {
    __nutrilensModuleRecoveryInstalled?: boolean;
  };

  if (recoveryWindow.__nutrilensModuleRecoveryInstalled) return;
  recoveryWindow.__nutrilensModuleRecoveryInstalled = true;

  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault?.();
    attemptModuleImportRecovery('vite-preload');
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (!isRecoverableModuleError(event.reason)) return;

    event.preventDefault();
    attemptModuleImportRecovery('unhandled-rejection');
  });
}
