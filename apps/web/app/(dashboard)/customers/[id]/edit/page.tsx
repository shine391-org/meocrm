'use client';

import { useRouter } from 'next/navigation';
import useSWR, { useSWRConfig } from 'swr';
import { CustomerForm } from '@/components/customers/customer-form';
import { CustomerFormData } from '@/lib/validators/customer';
import { getCustomer, updateCustomer } from '@/lib/api/customers';
import { toast } from 'sonner';

const fetcher = (id: string) => getCustomer(id);

export default function CustomerEditPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const {
    data: customerResponse,
    error,
    isLoading,
  } = useSWR(params.id, fetcher);

  const handleSubmit = async (data: CustomerFormData) => {
    try {
      await updateCustomer(params.id, data);
      toast.success('Cập nhật khách hàng thành công!');
      // Mutate both the customer detail cache and the list cache
      mutate(params.id);
      mutate(key => Array.isArray(key) && key[0] === 'customers');
      router.push('/customers');
    } catch (error) {
      if (error instanceof Error) {
        toast.error(`Lỗi: ${error.message}`);
      } else {
        toast.error('Cập nhật thất bại. Vui lòng thử lại.');
      }
    }
  };

  if (isLoading) {
    // TODO: Replace with a proper skeleton loader
    return <div>Đang tải dữ liệu...</div>;
  }

  if (error || !customerResponse || !customerResponse.data) {
    // TODO: Replace with a proper error component
    return <div>Không tìm thấy khách hàng hoặc có lỗi xảy ra.</div>;
  }

  const customer = customerResponse.data;
  const initialData: Partial<CustomerFormData> = {
    name: customer.name,
    phone: customer.phone,
    email: customer.email || '',
    address: customer.address || '',
    ward: customer.ward || '',
    district: customer.district || '',
    province: customer.province || '',
    segment: customer.segment || 'Regular',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Chỉnh sửa khách hàng</h1>
        <p className="text-muted-foreground">
          Cập nhật thông tin chi tiết cho khách hàng #{customer.code}.
        </p>
      </div>
      <div className="p-6 border rounded-lg bg-background">
        <CustomerForm
          initialData={initialData}
          onSubmit={handleSubmit}
          submitLabel="Cập nhật"
        />
      </div>
    </div>
  );
}
