'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Invoice } from '@/lib/pos/types';

type PosSnapshot = {
  branchId: string | null;
  branchName: string | null;
  invoices: Invoice[];
  activeInvoiceId: string;
};

const STORAGE_NAMESPACE = 'posWorkspace';

const createInvoice = (index: number): Invoice => ({
  id: `INV-${Date.now()}-${index}`,
  label: `Hóa đơn ${index}`,
  cart: [],
  note: '',
  priceBook: 'standard',
  mode: 'quick',
  discount: 0,
  surcharge: 0,
  shippingPartner: 'none',
});

const createDefaultSnapshot = (): PosSnapshot => {
  const invoice = createInvoice(1);
  return {
    branchId: null,
    branchName: null,
    invoices: [invoice],
    activeInvoiceId: invoice.id,
  };
};

const loadSnapshot = (key: string): PosSnapshot => {
  if (typeof window === 'undefined') {
    return createDefaultSnapshot();
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return createDefaultSnapshot();
  }

  try {
    const parsed = JSON.parse(raw) as PosSnapshot;
    if (!parsed?.invoices?.length) {
      return createDefaultSnapshot();
    }
    return {
      branchId: parsed.branchId ?? null,
      branchName: parsed.branchName ?? null,
      invoices: parsed.invoices,
      activeInvoiceId: parsed.activeInvoiceId ?? parsed.invoices[0].id,
    };
  } catch {
    return createDefaultSnapshot();
  }
};

const persistSnapshot = (key: string, snapshot: PosSnapshot) => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(snapshot));
};

export function usePosStore(organizationId?: string | null) {
  const storageKey = useMemo(
    () => `${STORAGE_NAMESPACE}:${organizationId ?? 'anonymous'}`,
    [organizationId],
  );

  const [snapshot, setSnapshot] = useState<PosSnapshot>(() =>
    loadSnapshot(storageKey),
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSnapshot(loadSnapshot(storageKey));
  }, [storageKey]);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    persistSnapshot(storageKey, snapshot);
  }, [snapshot, storageKey, hydrated]);

  const setBranch = useCallback((branchId: string | null, branchName?: string | null) => {
    setSnapshot((prev) => ({
      ...prev,
      branchId,
      branchName: branchName ?? prev.branchName,
    }));
  }, []);

  const selectInvoice = useCallback((invoiceId: string) => {
    setSnapshot((prev) => ({
      ...prev,
      activeInvoiceId: invoiceId,
    }));
  }, []);

  const addInvoice = useCallback(() => {
    setSnapshot((prev) => {
      const nextIndex = prev.invoices.length + 1;
      const invoice = createInvoice(nextIndex);
      return {
        ...prev,
        invoices: [...prev.invoices, invoice],
        activeInvoiceId: invoice.id,
      };
    });
  }, []);

  const closeInvoice = useCallback((invoiceId: string) => {
    setSnapshot((prev) => {
      if (prev.invoices.length === 1) {
        return prev;
      }
      const filtered = prev.invoices.filter((invoice) => invoice.id !== invoiceId);
      const nextActive =
        prev.activeInvoiceId === invoiceId
          ? filtered[0]?.id ?? ''
          : prev.activeInvoiceId;
      return {
        ...prev,
        invoices: filtered.length ? filtered : prev.invoices,
        activeInvoiceId: nextActive || filtered[0]?.id || prev.invoices[0].id,
      };
    });
  }, []);

  const updateInvoice = useCallback(
    (invoiceId: string, updater: (invoice: Invoice) => Invoice) => {
      setSnapshot((prev) => ({
        ...prev,
        invoices: prev.invoices.map((invoice) =>
          invoice.id === invoiceId ? updater(invoice) : invoice,
        ),
      }));
    },
    [],
  );

  const resetInvoice = useCallback((invoiceId: string) => {
    setSnapshot((prev) => ({
      ...prev,
      invoices: prev.invoices.map((invoice, index) =>
        invoice.id === invoiceId
          ? {
              ...createInvoice(index + 1),
              id: invoice.id,
              label: invoice.label,
            }
          : invoice,
      ),
    }));
  }, []);

  return {
    snapshot,
    branchId: snapshot.branchId,
    branchName: snapshot.branchName,
    invoices: snapshot.invoices,
    activeInvoiceId: snapshot.activeInvoiceId,
    addInvoice,
    closeInvoice,
    selectInvoice,
    updateInvoice,
    resetInvoice,
    setBranch,
  };
}
