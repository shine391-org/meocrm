/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Order } from '../models/Order';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class OrdersService {
    /**
     * Get all orders
     * @returns Order A list of orders
     * @throws ApiError
     */
    public static getOrders(): CancelablePromise<Array<Order>> {
        return __request(OpenAPI, {
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
    public static getOrdersById(
        id: string,
    ): CancelablePromise<Order> {
        return __request(OpenAPI, {
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
    public static postOrdersByIdRefund(
        id: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
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
    public static postOrdersByIdRefundApprove(
        id: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
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
    public static postOrdersByIdRefundReject(
        id: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/orders/{id}/refund/reject',
            path: {
                'id': id,
            },
        });
    }
}
