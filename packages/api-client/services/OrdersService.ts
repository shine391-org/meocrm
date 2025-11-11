/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Order } from '../models/Order';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class OrdersService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get all orders
     * @returns Order A list of orders
     * @throws ApiError
     */
    public getOrders(): CancelablePromise<Array<Order>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/orders',
        });
    }
    /**
     * Get a single order
     * @param id
     * @returns Order A single order
     * @throws ApiError
     */
    public getOrders1(
        id: string,
    ): CancelablePromise<Order> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/orders/{id}',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Request a refund for an order
     * @param id
     * @returns any Refund request accepted
     * @throws ApiError
     */
    public postOrdersRefund(
        id: string,
    ): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/orders/{id}/refund',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Approve a refund request
     * @param id
     * @returns any Refund request approved
     * @throws ApiError
     */
    public postOrdersRefundApprove(
        id: string,
    ): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/orders/{id}/refund/approve',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Reject a refund request
     * @param id
     * @returns any Refund request rejected
     * @throws ApiError
     */
    public postOrdersRefundReject(
        id: string,
    ): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/orders/{id}/refund/reject',
            path: {
                'id': id,
            },
        });
    }
}
