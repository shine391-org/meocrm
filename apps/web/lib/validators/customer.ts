import { z } from 'zod';

export const customerFormSchema = z.object({
  name: z.string().min(2, 'Tên phải có ít nhất 2 ký tự').max(100, 'Tên không được vượt quá 100 ký tự'),
  phone: z.string().regex(/^0\d{9}$/, 'Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)'),
  email: z.string().email('Email không hợp lệ').optional().or(z.literal('')),
  address: z.string().optional(),
  ward: z.string().optional(),
  district: z.string().optional(),
  province: z.string().min(1, 'Vui lòng chọn tỉnh/thành phố'),
  segment: z.enum(['Regular', 'VIP', 'Wholesale']).optional().default('Regular'),
});

export type CustomerFormInput = z.input<typeof customerFormSchema>;
export type CustomerFormData = z.output<typeof customerFormSchema>;
