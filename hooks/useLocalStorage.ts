import { useState, useEffect, useRef } from 'react';

// Same-tab change notification: the native 'storage' event only fires in OTHER
// tabs, so components that write localStorage directly (e.g. MigrateDataModal)
// must dispatch this event to keep useLocalStorage state in sync.
const LOCAL_CHANGE_EVENT = 'local-storage-change';

// Dispatched when a read/write against localStorage fails (quota exceeded,
// corrupt JSON, private-mode restrictions) so a component with toast access
// (AppDataProvider) can surface it instead of it being console-only.
export const LOCAL_STORAGE_ERROR_EVENT = 'local-storage-error';

export function notifyLocalStorageChange(key: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LOCAL_CHANGE_EVENT, { detail: { key } }));
  }
}

function notifyLocalStorageError(message: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LOCAL_STORAGE_ERROR_EVENT, { detail: { message } }));
  }
}

// Stash unparseable JSON under a timestamped backup key instead of letting
// the next write silently overwrite (and destroy) it.
function backupCorruptValue(key: string, raw: string) {
  try {
    window.localStorage.setItem(`${key}.corrupt-${Date.now()}`, raw);
  } catch {
    // Best-effort — if storage is full, there's nothing more we can do.
  }
}

/**
 * Custom hook for localStorage with TypeScript support
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error loading ${key} from localStorage:`, error);
      const raw = window.localStorage.getItem(key);
      if (raw) backupCorruptValue(key, raw);
      return initialValue;
    }
  });

  // Latest value, readable synchronously: functional setValue updates within
  // the same tick (React batches state) must see the previous call's result,
  // not the render-time snapshot.
  const currentValue = useRef(storedValue);
  const initialValueRef = useRef(initialValue);

  // Stay in sync when the key is written outside this hook instance:
  // other tabs ('storage') or direct writes in this tab (LOCAL_CHANGE_EVENT).
  useEffect(() => {
    const refresh = () => {
      try {
        const item = window.localStorage.getItem(key);
        const value = item ? JSON.parse(item) : initialValueRef.current;
        currentValue.current = value;
        setStoredValue(value);
      } catch (error) {
        console.error(`Error reloading ${key} from localStorage:`, error);
        const raw = window.localStorage.getItem(key);
        if (raw) backupCorruptValue(key, raw);
        notifyLocalStorageError("Couldn't read saved data — it may have been corrupted.");
      }
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) refresh();
    };
    const onLocalChange = (e: Event) => {
      if ((e as CustomEvent).detail?.key === key) refresh();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(LOCAL_CHANGE_EVENT, onLocalChange);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(LOCAL_CHANGE_EVENT, onLocalChange);
    };
  }, [key]);

  // Return a wrapped version of useState's setter function that persists to localStorage
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore = value instanceof Function ? value(currentValue.current) : value;

      currentValue.current = valueToStore;
      setStoredValue(valueToStore);

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error saving ${key} to localStorage:`, error);
      // React state above already updated, so the UI still reflects the
      // change — but it won't survive a reload. Say so.
      notifyLocalStorageError("Couldn't save your changes locally — your browser's storage may be full. This change will be lost on reload.");
    }
  };

  return [storedValue, setValue] as const;
}
