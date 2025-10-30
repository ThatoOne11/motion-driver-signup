import { signal } from '@angular/core';

export const sessionStore = signal<Record<string, any>>({});

export function hydrateSessionStore() {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    const stored = window.sessionStorage.getItem('session-store');
    try {
      sessionStore.set(stored ? JSON.parse(stored) : {});
    } catch {
      sessionStore.set({});
    }
  }
}

export function setItem(key: string, value: any) {
  const current = { ...sessionStore() };
  current[key] = value;
  sessionStore.set(current);
  if (typeof window !== 'undefined' && window.sessionStorage) {
    window.sessionStorage.setItem('session-store', JSON.stringify(current));
  }
}

export function getItem<T = any>(key: string): T | undefined {
  return sessionStore()[key];
}

export function clearItem(key: string) {
  const current = { ...sessionStore() };
  delete current[key];
  sessionStore.set(current);
  if (typeof window !== 'undefined' && window.sessionStorage) {
    window.sessionStorage.setItem('session-store', JSON.stringify(current));
  }
}

export function clearSessionStore() {
  sessionStore.set({});
  if (typeof window !== 'undefined' && window.sessionStorage) {
    window.sessionStorage.removeItem('session-store');
  }
}
