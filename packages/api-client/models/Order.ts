/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Order = {
    id: string;
    code: string;
    organizationId?: string;
    customerId?: string | null;
    status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED';
    subtotal: number;
    tax?: number;
    shipping?: number;
    discount?: number;
    total: number;
    paymentMethod: 'CASH' | 'CARD' | 'E_WALLET' | 'BANK_TRANSFER' | 'COD';
    isPaid?: boolean;
    paidAmount?: number;
    notes?: string;
    createdAt: string;
    updatedAt?: string;
    completedAt?: string | null;
    deletedAt?: string | null;
};
