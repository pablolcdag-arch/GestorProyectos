import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { useAuthStore } from '../store/useAuthStore';
import { useBillingStore } from '../store/useBillingStore';
import { useWorkspaceStore } from '../store/useWorkspaceStore';

function createMemoryStorage(): Storage {
  let store: Record<string, string> = {};
  return {
    get length() {
      return Object.keys(store).length;
    },
    clear() {
      store = {};
    },
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(store, key)
        ? store[key]
        : null;
    },
    key(index: number) {
      const keys = Object.keys(store);
      return keys[index] ?? null;
    },
    removeItem(key: string) {
      delete store[key];
    },
    setItem(key: string, value: string) {
      store[key] = String(value);
    },
  };
}

if (
  typeof globalThis.localStorage === 'undefined' ||
  typeof globalThis.localStorage.getItem !== 'function'
) {
  const memLocal = createMemoryStorage();
  Object.defineProperty(globalThis, 'localStorage', {
    value: memLocal,
    writable: true,
    configurable: true,
  });
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'localStorage', {
      value: memLocal,
      writable: true,
      configurable: true,
    });
  }
}

if (
  typeof globalThis.sessionStorage === 'undefined' ||
  typeof globalThis.sessionStorage.getItem !== 'function'
) {
  const memSession = createMemoryStorage();
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: memSession,
    writable: true,
    configurable: true,
  });
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'sessionStorage', {
      value: memSession,
      writable: true,
      configurable: true,
    });
  }
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  useAuthStore.getState().resetStore();
  useWorkspaceStore.getState().resetStore();
  useBillingStore.getState().resetStore();
});

