'use client';

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, ChevronDown, ChevronRight, Edit, Trash2 } from 'lucide-react';
import CustomerDetailInline from './customer-detail-inline';
import { formatCurrency, getSegmentVariant } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { deleteCustomer } from '@/lib/api/customers';
import { toast } from 'sonner';
import { useSWRConfig } from 'swr';

interface CustomerTableProps {
  data: any;
  isLoading: boolean;
  error: any;
  page: number;
  setPage: (page: number) => void;
}

const CustomerTable = ({ data, isLoading, error, page, setPage }: CustomerTableProps) => {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { isOpen, data: customerToDelete, openDialog, closeDialog } = useConfirmDialog();

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleDelete = async () => {
    if (!customerToDelete) return;
    try {
      await deleteCustomer(customerToDelete.id);
      toast.success(`Đã xóa khách hàng ${customerToDelete.name}`);
      mutate(key => Array.isArray(key) && key[0] === 'customers');
      closeDialog();
    } catch (err) {
      toast.error(err.message || 'Xóa thất bại');
    }
  };

  if (isLoading) {
    return <div>Loading...</div>; // Replace with Skeleton
  }

  if (error) {
    return <div>Failed to load customers.</div>; // Replace with Error component
  }

  const customers = data?.data || [];
  const meta = data?.meta;

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead>Mã KH</TableHead>
              <TableHead>Tên khách hàng</TableHead>
              <TableHead>Số điện thoại</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Tổng chi tiêu</TableHead>
              <TableHead>Công nợ</TableHead>
              <TableHead>Phân khúc</TableHead>
              <TableHead className="w-[50px]">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  Không tìm thấy khách hàng nào.
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => (
                <React.Fragment key={customer.id}>
                  <TableRow
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleExpand(customer.id)}
                  >
                    <TableCell>
                      {expandedId === customer.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </TableCell>
                    <TableCell>{customer.code}</TableCell>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{customer.phone}</TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell>{formatCurrency(customer.totalSpent)}</TableCell>
                    <TableCell className={customer.debt > 0 ? 'text-red-600' : ''}>
                      {formatCurrency(customer.debt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getSegmentVariant(customer.segment)}>{customer.segment}</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem onClick={() => router.push(`/customers/${customer.id}`)}>
                            Xem chi tiết
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/customers/${customer.id}/edit`)}>
                            Chỉnh sửa
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => openDialog(customer)}
                          >
                            Xóa
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  {expandedId === customer.id && (
                    <TableRow>
                      <TableCell colSpan={9} className="p-0">
                        <CustomerDetailInline customer={customer} onDelete={() => openDialog(customer)} />
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
        <div className="flex items-center justify-end space-x-2 p-4">
          <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={!meta?.hasPreviousPage}>
            Previous
          </Button>
          <span>Page {meta?.page} of {meta?.pageCount}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={!meta?.hasNextPage}>
            Next
          </Button>
        </div>
      </div>
      <AlertDialog open={isOpen} onOpenChange={closeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể được hoàn tác. Thao tác này sẽ xóa vĩnh viễn khách hàng
              <strong> {customerToDelete?.name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CustomerTable;
