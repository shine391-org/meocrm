type StorageLike = {
  getItem(key: string): string | null;
};

function resolveStorage(): StorageLike | null {
  if (typeof globalThis === 'undefined') {
    return null;
  }

  const candidate = (globalThis as { localStorage?: StorageLike }).localStorage;
  return candidate ?? null;
}

export function getBrowserToken(): string | null {
  const storage = resolveStorage();
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem('token');
    if (!raw || raw === 'null' || raw === 'undefined') {
      return null;
    }
    return raw;
  } catch {
    return null;
  }
}
