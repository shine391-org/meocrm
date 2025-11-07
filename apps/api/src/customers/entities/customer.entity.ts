import { Customer } from '@prisma/client';

export class CustomerEntity implements Customer {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  segment: string | null;
  totalSpent: number;
  totalOrders: number;
  debt: number;
  lastOrderAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
