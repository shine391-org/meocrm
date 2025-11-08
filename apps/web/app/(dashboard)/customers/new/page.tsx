'use client';

import { useRouter } from 'next/navigation';
import { CustomerForm } from '@/components/customers/customer-form';
import { CustomerFormData } from '@/lib/validators/customer';
import { createCustomer } from '@/lib/api/customers';
import { toast } from 'sonner';
import { useSWRConfig } from 'swr';

export default function CustomerCreatePage() {
  const router = useRouter();
  const { mutate } = useSWRConfig();

  const handleSubmit = async (data: CustomerFormData) => {
    try {
      await createCustomer(data);
      toast.success('Tạo khách hàng thành công!');
      // Mutate the customers list cache to reflect the new data
      mutate(['customers', 1, '']);
      router.push('/customers');
    } catch (error) {
      if (error instanceof Error) {
        toast.error(`Lỗi: ${error.message}`);
      } else {
        toast.error('Tạo khách hàng thất bại. Vui lòng thử lại.');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tạo khách hàng mới</h1>
        <p className="text-muted-foreground">
          Điền thông tin chi tiết để thêm khách hàng mới vào hệ thống.
        </p>
      </div>
      <div className="p-6 border rounded-lg bg-background">
        <CustomerForm
          onSubmit={handleSubmit}
          submitLabel="Tạo khách hàng"
        />
      </div>
    </div>
  );
}
