export function readStorage<T>(
  key: string,
  fallback: T,
  validate?: (value: unknown) => value is T,
): T {
  if (typeof window === 'undefined') return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;

    const value: unknown = JSON.parse(raw);
    if (validate && !validate(value)) {
      window.localStorage.removeItem(key);
      return fallback;
    }
    return value as T;
  } catch {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Storage access can be unavailable in privacy-restricted browsing modes.
    }
    return fallback;
  }
}

export function writeStorage(key: string, value: unknown): boolean {
  if (typeof window === 'undefined') return false;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeStorage(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // No recovery action is required when storage is unavailable.
  }
}
