export function getTodayDateKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getDailyVisibilityKey(scope: string, date = getTodayDateKey()) {
  return `${scope}_${date}`;
}

export function isDailyHidden(scope: string, date = getTodayDateKey()) {
  try {
    return localStorage.getItem(getDailyVisibilityKey(scope, date)) === '1';
  } catch {
    return false;
  }
}

export function setDailyHidden(scope: string, date = getTodayDateKey()) {
  try {
    localStorage.setItem(getDailyVisibilityKey(scope, date), '1');
  } catch {
    // ignore localStorage errors
  }
}