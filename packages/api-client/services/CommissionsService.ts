/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class CommissionsService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Create commission rule
     * @param requestBody
     * @returns any Created
     * @throws ApiError
     */
    public postAdminCommissionRules(
        requestBody: {
            code: string;
            name: string;
            type: 'FLAT' | 'TIERED' | 'BONUS';
            config: Record<string, any>;
            isActive?: boolean;
        },
    ): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/admin/commission-rules',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid payload or duplicated code`,
            },
        });
    }
    /**
     * Run monthly payout for a period
     * @param requestBody
     * @returns any Batch paid
     * @throws ApiError
     */
    public postCommissionsPayouts:run(
        requestBody: {
            /**
             * YYYY-MM period identifier
             */
            period: string;
            payOn?: string;
        },
    ): CancelablePromise<{
        period?: string;
        totalAmount?: string;
        count?: number;
        status?: 'PAID';
        traceId?: string;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/commissions/payouts:run',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid period or payout already run`,
            },
        });
    }
}
