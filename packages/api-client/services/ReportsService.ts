/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DebtReportItem } from '../models/DebtReportItem';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ReportsService {
    /**
     * Get customer debt report
     * Retrieves a report of customer debt, grouped by day or month.
     * Returns the closing debt for each period.
     *
     * @param groupBy
     * @param fromDate
     * @param toDate
     * @param customerId
     * @returns DebtReportItem A list of debt report items.
     * @throws ApiError
     */
    public static getDebtReport(
        groupBy: 'day' | 'month',
        fromDate?: string,
        toDate?: string,
        customerId?: string,
    ): CancelablePromise<Array<DebtReportItem>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/reports/debt',
            query: {
                'groupBy': groupBy,
                'fromDate': fromDate,
                'toDate': toDate,
                'customerId': customerId,
            },
            errors: {
                400: `Invalid query parameters.`,
                401: `Unauthorized.`,
            },
        });
    }
}
