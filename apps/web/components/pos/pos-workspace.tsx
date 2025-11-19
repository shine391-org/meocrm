'use client';

import { useAuth } from '@/hooks/use-auth';
import { usePosStore } from '@/hooks/use-pos-store';
import { cn, formatCurrency } from '@/lib/utils';
import { calculatePosTotals } from '@/lib/pos/calculations';
import { CartLine, Product, Invoice } from '@/lib/pos/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CalendarClock,
  Clock3,
  Download,
  Info,
  Loader2,
  MessageCircle,
  Minus,
  Plus,
  Printer,
  RefreshCw,
  ScanLine,
  Search,
  Truck,
  UserPlus,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useDebounce } from 'use-debounce';
import { toast } from 'sonner';
import { searchProducts } from '@/lib/api/products';
import { getCustomers } from '@/lib/api/customers';
import { fetchBranches } from '@/lib/api/branches';
import { createPosOrder } from '@/lib/api/orders';

const saleModeConfigs: {
  id: 'quick' | 'standard' | 'delivery';
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'quick',
    label: 'Bán nhanh',
    description: 'Thanh toán tại quầy',
    icon: Zap,
  },
  {
    id: 'standard',
    label: 'Bán thường',
    description: 'Gắn với khách hàng',
    icon: Clock3,
  },
  {
    id: 'delivery',
    label: 'Bán giao hàng',
    description: 'Đối tác vận chuyển',
    icon: Truck,
  },
];

const priceBooks = [
  { value: 'standard', label: 'Bảng giá chung' },
  { value: 'vip', label: 'Bảng giá VIP' },
  { value: 'wholesale', label: 'Bảng giá sỉ' },
];

const shippingPartners = [
  { value: 'none', label: 'Không sử dụng' },
  { value: 'GHTK', label: 'GHTK' },
  { value: 'GHN', label: 'GHN' },
  { value: 'VNPOST', label: 'VNPost' },
];

const extractProducts = (payload: any): Product[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  return [];
};

const extractCustomers = (payload: any) => {
  if (!payload) return [];
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  return [];
};

export function PosWorkspace() {
  const { user } = useAuth();
  const {
    invoices,
    activeInvoiceId,
    branchId,
    branchName,
    addInvoice,
    closeInvoice,
    selectInvoice,
    updateInvoice,
    resetInvoice,
    setBranch,
  } = usePosStore(user?.organization?.id);

  const [timestamp, setTimestamp] = useState(() => new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [customerQuery, setCustomerQuery] = useState('');
  const [isCustomerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [branchForm, setBranchForm] = useState({
    id: branchId ?? '',
    name: branchName ?? '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [debouncedSearch] = useDebounce(searchTerm, 400);
  const [debouncedCustomerSearch] = useDebounce(customerQuery, 350);

  useEffect(() => {
    const handle = setInterval(() => setTimestamp(new Date()), 60 * 1000);
    return () => clearInterval(handle);
  }, []);

  useEffect(() => {
    setBranchForm({
      id: branchId ?? '',
      name: branchName ?? '',
    });
  }, [branchId, branchName]);

  const {
    data: productPayload,
    isLoading: isProductsLoading,
    error: productsError,
  } = useSWR(['pos-products', debouncedSearch], ([, query]) =>
    searchProducts({ page: 1, limit: 40, search: query || undefined }),
  );

  const { data: defaultCustomers } = useSWR('pos-customers-default', () =>
    getCustomers(1, 5, ''),
  );

  const { data: searchedCustomers, isLoading: isCustomerLoading } = useSWR(
    debouncedCustomerSearch.trim().length >= 2
      ? ['pos-customers-search', debouncedCustomerSearch.trim()]
      : null,
    ([, query]) => getCustomers(1, 5, query),
  );

  const { data: branchOptions } = useSWR('pos-branches', fetchBranches);

  useEffect(() => {
    if (!branchId && branchOptions?.length) {
      const first = branchOptions[0];
      setBranch(first.id, first.name);
    }
  }, [branchId, branchOptions, setBranch]);

  const products = useMemo(() => extractProducts(productPayload), [productPayload]);
  const customerSuggestions = useMemo(() => {
    if (debouncedCustomerSearch.trim().length >= 2) {
      return extractCustomers(searchedCustomers);
    }
    return extractCustomers(defaultCustomers);
  }, [debouncedCustomerSearch, searchedCustomers, defaultCustomers]);

  const activeInvoice =
    invoices.find((invoice) => invoice.id === activeInvoiceId) ?? invoices[0];

  const totals = useMemo(() => {
    if (!activeInvoice) {
      return { subtotal: 0, discount: 0, surcharge: 0, total: 0, itemCount: 0 };
    }
    return calculatePosTotals(
      activeInvoice.cart,
      activeInvoice.discount,
      activeInvoice.surcharge,
    );
  }, [activeInvoice]);

  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(timestamp);
  }, [timestamp]);

  const updateActiveInvoice = useCallback(
    (updater: (invoice: Invoice) => Invoice) => {
      if (!activeInvoice) {
        return;
      }
      updateInvoice(activeInvoice.id, (invoice) => updater(invoice));
    },
    [activeInvoice, updateInvoice],
  );

  const handleAddProduct = useCallback(
    (product: Product) => {
      if (!activeInvoice) {
        return;
      }
      updateInvoice(activeInvoice.id, (invoice) => {
        const existing = invoice.cart.find(
          (line) => line.productId === product.id,
        );
        const unitPrice = Number(product.sellPrice ?? product.price ?? 0);
        if (existing) {
          return {
            ...invoice,
            cart: invoice.cart.map((line) =>
              line.id === existing.id
                ? { ...line, quantity: Math.min(99, line.quantity + 1) }
                : line,
            ),
          };
        }

        const newLine: CartLine = {
          id: `${invoice.id}-${product.id}-${Date.now()}`,
          productId: product.id,
          name: product.name,
          sku: product.sku,
          price: unitPrice,
          quantity: 1,
          unit: product.unit ?? product.unitOfMeasure ?? 'đơn vị',
        };

        return {
          ...invoice,
          cart: [...invoice.cart, newLine],
        };
      });
    },
    [activeInvoice, updateInvoice],
  );

  const handleQuantityChange = (lineId: string, delta: number) => {
    updateActiveInvoice((invoice) => ({
      ...invoice,
      cart: invoice.cart
        .map((line) =>
          line.id === lineId
            ? { ...line, quantity: Math.max(1, line.quantity + delta) }
            : line,
        )
        .filter((line) => line.quantity > 0),
    }));
  };

  const handleRemoveLine = (lineId: string) => {
    updateActiveInvoice((invoice) => ({
      ...invoice,
      cart: invoice.cart.filter((line) => line.id !== lineId),
    }));
  };

  const handleInvoiceAdd = () => addInvoice();

  const handleCustomerAssign = (customer: any) => {
    updateActiveInvoice((invoice) => ({
      ...invoice,
      customerId: customer.id,
      customerSummary: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        tier: customer.segment,
      },
    }));
    setCustomerQuery('');
    setCustomerDropdownOpen(false);
  };

  const handleManualBranchSave = () => {
    if (!branchForm.id.trim()) {
      toast.error('Vui lòng nhập mã chi nhánh hợp lệ');
      return;
    }
    setBranch(branchForm.id.trim(), branchForm.name.trim() || branchForm.id.trim());
    toast.success('Đã lưu chi nhánh POS');
  };

  const handleCheckout = async () => {
    if (!activeInvoice) {
      return;
    }
    if (!branchId) {
      toast.error('Vui lòng chọn chi nhánh trước khi thanh toán');
      return;
    }
    if (!activeInvoice.customerId) {
      toast.error('Vui lòng chọn khách hàng');
      return;
    }
    if (!activeInvoice.cart.length) {
      toast.error('Giỏ hàng chưa có sản phẩm');
      return;
    }

    setIsSubmitting(true);
    try {
      const isDelivery = activeInvoice.mode === 'delivery';
      await createPosOrder({
        branchId,
        customerId: activeInvoice.customerId,
        items: activeInvoice.cart.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
        })),
        paymentMethod: isDelivery ? 'COD' : 'CASH',
        channel: 'POS',
        discount: activeInvoice.discount,
        shipping: activeInvoice.surcharge,
        notes: activeInvoice.note,
        isPaid: !isDelivery,
        paidAmount: !isDelivery ? totals.total : 0,
      });
      toast.success('Đã tạo đơn POS thành công');
      resetInvoice(activeInvoice.id);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Thanh toán thất bại';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!activeInvoice) {
    return null;
  }

  return (
    <div className="-m-6 flex h-[calc(100vh-5.5rem)] flex-col gap-4 bg-gradient-to-b from-slate-50 via-white to-slate-50 p-6">
      <section className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-600 p-4 text-white shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1" data-testid="pos-search-wrapper">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-80" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Tìm hàng hóa (F3)"
                className="h-12 rounded-lg border-0 pl-10 pr-12 text-base text-slate-900"
                data-testid="pos-search-products"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-blue-800">
                F3
              </span>
            </div>
            <Button
              variant="secondary"
              className="h-12 gap-2 rounded-lg bg-white/90 px-4 text-blue-700"
            >
              <ScanLine className="h-5 w-5" />
              Quét mã
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <InvoiceTabs
              invoices={invoices}
              activeId={activeInvoiceId}
              onSelect={selectInvoice}
              onClose={closeInvoice}
            />
            <Button
              onClick={handleInvoiceAdd}
              variant="secondary"
              className="h-10 rounded-full bg-white/20 px-3 text-white hover:bg-white/30"
            >
              + Hóa đơn
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right text-sm">
              <p className="font-semibold">{user?.name ?? 'Nhân viên POS'}</p>
              <p className="text-white/80">{formattedDate}</p>
            </div>
            <Button variant="secondary" size="icon" className="bg-white/20">
              <Printer className="h-5 w-5" />
            </Button>
            <Button variant="secondary" size="icon" className="bg-white/20">
              <RefreshCw className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      <section className="flex flex-1 gap-4 overflow-hidden">
        <Card className="flex flex-1 flex-col overflow-hidden border-0 shadow-md">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold">Hàng hóa</h2>
              <p className="text-sm text-muted-foreground">
                {isProductsLoading
                  ? 'Đang tải sản phẩm...'
                  : `${products.length} sản phẩm khả dụng`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="gap-2 text-sm">
                <Download className="h-4 w-4" />
                Import catalog
              </Button>
              <Button variant="outline" size="sm" className="gap-2 text-sm">
                <Wallet className="h-4 w-4" />
                Tồn kho
              </Button>
            </div>
          </div>
          <ScrollArea className="flex-1 px-6 py-4">
            {productsError ? (
              <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                Không thể tải danh sách sản phẩm. Vui lòng thử lại sau.
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleAddProduct(product)}
                    className="group flex flex-col rounded-xl border bg-white p-3 text-left shadow-sm transition hover:-translate-y-1 hover:border-blue-500 hover:shadow-lg"
                    data-testid="pos-product-card"
                  >
                    <div
                      className={cn(
                        'flex aspect-video items-center justify-center rounded-lg bg-gradient-to-br text-sm font-semibold text-slate-700 transition-all group-hover:scale-[1.01]',
                        'from-slate-100 via-slate-50 to-white',
                      )}
                    >
                      {product.category?.name ?? 'Danh mục'}
                    </div>
                    <div className="mt-3 flex flex-1 flex-col gap-1">
                      <p className="line-clamp-2 font-semibold text-slate-900">
                        {product.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        SKU: {product.sku}
                      </p>
                      <div className="mt-auto flex items-center justify-between">
                        <span className="text-lg font-semibold text-blue-600">
                          {formatCurrency(
                            Number(product.sellPrice ?? product.price ?? 0),
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {product.stock ?? 0} tồn
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
                {!products.length && !isProductsLoading && (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-muted-foreground">
                    Không tìm thấy sản phẩm phù hợp với từ khóa.
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </Card>

        <Card className="flex w-full max-w-md flex-col border-0 shadow-md">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Chi nhánh POS</p>
              <Select
                value={branchId ?? ''}
                onValueChange={(value) => {
                  const branch = branchOptions?.find((item) => item.id === value);
                  const nextName = branch?.name ?? branchForm.name;
                  setBranch(value, nextName);
                  setBranchForm({ id: value, name: nextName ?? '' });
                }}
                disabled={!branchOptions?.length}
              >
                <SelectTrigger
                  className="mt-1 h-10"
                  data-testid="pos-branch-select"
                >
                  <SelectValue
                    placeholder={
                      branchOptions?.length
                        ? 'Chọn chi nhánh'
                        : 'Chưa có chi nhánh khả dụng'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {branchOptions?.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-4 px-5 py-4">
            <div className="space-y-2">
              <div className="grid grid-cols-1 gap-2">
                <Input
                  placeholder="Nhập mã chi nhánh"
                  value={branchForm.id}
                  onChange={(event) =>
                    setBranchForm((prev) => ({ ...prev, id: event.target.value }))
                  }
                  data-testid="pos-branch-id-input"
                />
                <Input
                  placeholder="Tên hiển thị chi nhánh"
                  value={branchForm.name}
                  onChange={(event) =>
                    setBranchForm((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                />
                <Button variant="outline" onClick={handleManualBranchSave}>
                  Lưu chi nhánh thủ công
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Tìm khách hàng (F4)
              </label>
              <div className="relative">
                <Input
                  value={customerQuery}
                  onFocus={() => setCustomerDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setCustomerDropdownOpen(false), 150)}
                  onChange={(event) => setCustomerQuery(event.target.value)}
                  placeholder="Nhập tên, SĐT hoặc mã khách"
                  className="h-11 rounded-lg"
                  data-testid="pos-customer-search"
                />
                <UserPlus className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                {isCustomerDropdownOpen && customerSuggestions.length > 0 && (
                  <div
                    className="absolute z-10 mt-2 w-full rounded-lg border bg-white shadow-lg"
                    data-testid="pos-customer-suggestions"
                  >
                    {isCustomerLoading && (
                      <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Đang tìm kiếm...
                      </div>
                    )}
                    {customerSuggestions.map((customer: any) => (
                      <button
                        key={customer.id}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => handleCustomerAssign(customer)}
                        className="flex w-full flex-col items-start gap-1 px-4 py-2 text-left hover:bg-slate-50"
                        data-testid="pos-customer-suggestion"
                      >
                        <span className="font-medium">{customer.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {customer.phone} · {customer.segment ?? 'Chưa phân nhóm'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {activeInvoice.customerSummary && (
                <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-blue-900">
                      {activeInvoice.customerSummary.name}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-blue-800 hover:text-blue-900"
                      onClick={() =>
                        updateActiveInvoice((invoice) => ({
                          ...invoice,
                          customerId: undefined,
                          customerSummary: undefined,
                        }))
                      }
                    >
                      Đổi khách
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {activeInvoice.customerSummary.phone ?? 'Chưa có SĐT'}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={activeInvoice.priceBook}
                onValueChange={(value) =>
                  updateActiveInvoice((invoice) => ({
                    ...invoice,
                    priceBook: value as typeof invoice.priceBook,
                  }))
                }
              >
                <SelectTrigger className="h-11 rounded-lg border-slate-200">
                  <SelectValue placeholder="Bảng giá" />
                </SelectTrigger>
                <SelectContent>
                  {priceBooks.map((book) => (
                    <SelectItem key={book.value} value={book.value}>
                      {book.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={activeInvoice.shippingPartner ?? 'none'}
                onValueChange={(value) =>
                  updateActiveInvoice((invoice) => ({
                    ...invoice,
                    shippingPartner: value,
                  }))
                }
                disabled={activeInvoice.mode !== 'delivery'}
              >
                <SelectTrigger className="h-11 rounded-lg border-slate-200">
                  <SelectValue placeholder="Đối tác giao hàng" />
                </SelectTrigger>
                <SelectContent>
                  {shippingPartners.map((partner) => (
                    <SelectItem key={partner.value} value={partner.value}>
                      {partner.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-700">Giỏ hàng</p>
                <span className="text-sm text-muted-foreground">
                  {totals.itemCount} sản phẩm
                </span>
              </div>
              <ScrollArea className="mt-3 max-h-60">
                <div className="space-y-3 pr-3">
                  {activeInvoice.cart.length === 0 && (
                    <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-muted-foreground">
                      Chưa có sản phẩm trong giỏ. Nhấp vào sản phẩm bên trái để
                      thêm nhanh.
                    </p>
                  )}
                  {activeInvoice.cart.map((line) => (
                    <div
                      key={line.id}
                      className="flex items-center gap-3 rounded-xl border px-3 py-2"
                      data-testid="pos-cart-line"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{line.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {line.sku} · {line.unit}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 rounded-full border bg-slate-50 px-2 py-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleQuantityChange(line.id, -1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-6 text-center text-sm font-semibold">
                          {line.quantity}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleQuantityChange(line.id, 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="w-24 text-right">
                        <p className="text-sm font-semibold">
                          {formatCurrency(line.price * line.quantity)}
                        </p>
                        <button
                          className="text-xs text-red-500"
                          onClick={() => handleRemoveLine(line.id)}
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
              <SummaryRow label="Tổng tiền hàng" value={totals.subtotal} />
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Giảm giá</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  className="h-9 w-32 text-right text-sm"
                  value={activeInvoice.discount}
                  onChange={(event) =>
                    updateActiveInvoice((invoice) => ({
                      ...invoice,
                      discount: Number(event.target.value ?? 0),
                    }))
                  }
                  min={0}
                  step={1000}
                />
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Thu khác</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  className="h-9 w-32 text-right text-sm"
                  value={activeInvoice.surcharge}
                  onChange={(event) =>
                    updateActiveInvoice((invoice) => ({
                      ...invoice,
                      surcharge: Number(event.target.value ?? 0),
                    }))
                  }
                  min={0}
                  step={1000}
                />
              </div>
              <SummaryRow
                label="Khách cần trả"
                value={totals.total}
                emphasize
              />
            </div>

            <Button
              className="h-14 w-full rounded-xl bg-blue-600 text-base font-semibold shadow-lg hover:bg-blue-700"
              onClick={handleCheckout}
              disabled={isSubmitting}
              data-testid="pos-checkout-button"
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                'Thanh toán'
              )}
            </Button>
          </div>
        </Card>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 items-center gap-4">
            <textarea
              value={activeInvoice.note}
              onChange={(event) =>
                updateActiveInvoice((invoice) => ({
                  ...invoice,
                  note: event.target.value,
                }))
              }
              placeholder="Ghi chú đơn hàng"
              className="h-12 flex-1 resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-inner"
            />
            <Button variant="outline" size="icon">
              <Printer className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <CalendarClock className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {saleModeConfigs.map((mode) => (
              <button
                key={mode.id}
                className={cn(
                  'flex min-w-[140px] flex-1 items-center gap-2 rounded-xl border px-4 py-3 text-left text-sm shadow-sm transition hover:border-blue-300 hover:bg-blue-50',
                  activeInvoice.mode === mode.id
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-700',
                )}
                onClick={() =>
                  updateActiveInvoice((invoice) => ({
                    ...invoice,
                    mode: mode.id,
                  }))
                }
              >
                <mode.icon className="h-4 w-4" />
                <div>
                  <p className="font-semibold">{mode.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {mode.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-blue-500" />
              1900 6522
            </div>
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-amber-500" />
              Hỗ trợ trực tuyến
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function InvoiceTabs({
  invoices,
  activeId,
  onSelect,
  onClose,
}: {
  invoices: Invoice[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {invoices.map((invoice) => {
        const isActive = invoice.id === activeId;
        return (
          <button
            key={invoice.id}
            className={cn(
              'flex items-center gap-1 rounded-full border px-4 py-2 text-sm font-medium transition',
              isActive
                ? 'border-white bg-white/95 text-blue-700 shadow'
                : 'border-white/20 bg-white/10 text-white hover:bg-white/20',
            )}
            onClick={() => onSelect(invoice.id)}
            data-testid="pos-invoice-tab"
          >
            {invoice.label}
            <span className="text-xs text-white/70">
              ({invoice.cart.length})
            </span>
            {invoices.length > 1 && (
              <X
                className={cn(
                  'ml-1 h-3 w-3 transition',
                  isActive ? 'text-blue-700' : 'text-white/80',
                )}
                onClick={(event) => {
                  event.stopPropagation();
                  onClose(invoice.id);
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: number;
  emphasize?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between text-sm',
        emphasize && 'text-base font-semibold text-slate-900',
      )}
    >
      <span className="text-muted-foreground">{label}</span>
      <span>{formatCurrency(value)}</span>
    </div>
  );
}
