// apps/web/components/customers/customer-detail-inline.tsx
import React from 'react';
import OrderHistoryMiniTable from './order-history-mini';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { formatAddress, formatCurrency } from '@/lib/utils';
import { Edit, Trash2 } from 'lucide-react';

type CustomerDetailInlineProps = {
  customer: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
    totalSpent: number;
    debt: number;
    totalOrders: number;
    segment?: string | null;
    addressLine1?: string | null;
    city?: string | null;
    district?: string | null;
    ward?: string | null;
  };
  onDelete: () => void;
};

const CustomerDetailInline: React.FC<CustomerDetailInlineProps> = ({ customer, onDelete }) => {
  const router = useRouter();

  return (
    <div className="p-4 bg-muted/40 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-lg">{customer.name}</h3>
          <p className="text-sm text-muted-foreground">
            Thông tin chi tiết và lịch sử giao dịch
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/customers/${customer.id}/edit`)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Chỉnh sửa
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Xóa
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border rounded-lg bg-background">
          <h4 className="font-semibold mb-2">Thông tin liên hệ</h4>
          <div className="space-y-1 text-sm">
            <p>
              <strong>SĐT:</strong> <a href={`tel:${customer.phone}`} className="text-blue-600 hover:underline">{customer.phone}</a>
            </p>
            {customer.email && (
              <p>
                <strong>Email:</strong> <a href={`mailto:${customer.email}`} className="text-blue-600 hover:underline">{customer.email}</a>
              </p>
            )}
            <p>
              <strong>Địa chỉ:</strong> {formatAddress(customer)}
            </p>
          </div>
        </div>
        <div className="p-4 border rounded-lg bg-background">
           <h4 className="font-semibold mb-2">Thống kê</h4>
           <p className="text-sm text-muted-foreground">
             Tổng quan về chi tiêu và công nợ.
           </p>
           {/* This is a simplified version for the inline view */}
           <div className="mt-2 space-y-1 text-sm">
              <p><strong>Tổng chi tiêu:</strong> {formatCurrency(customer.totalSpent)}</p>
              <p><strong>Công nợ:</strong> <span className={customer.debt > 0 ? 'text-red-600' : ''}>{formatCurrency(customer.debt)}</span></p>
              <p><strong>Tổng đơn:</strong> {customer.totalOrders}</p>
           </div>
        </div>
      </div>

      <div>
        <h4 className="font-semibold mb-2">Đơn hàng gần đây</h4>
        <OrderHistoryMiniTable customerId={customer.id} />
      </div>
    </div>
  );
};

export default CustomerDetailInline;
