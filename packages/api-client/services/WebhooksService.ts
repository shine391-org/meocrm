/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Webhook } from '../models/Webhook';
import type { WebhookCreateRequest } from '../models/WebhookCreateRequest';
import type { WebhookTestResponse } from '../models/WebhookTestResponse';
import type { WebhookUpdateRequest } from '../models/WebhookUpdateRequest';

import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class WebhooksService {

    /**
     * List configured webhooks
     * @returns Webhook List of webhooks
     * @throws ApiError
     */
    public static getWebhooks(): CancelablePromise<Array<Webhook>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/webhooks',
        });
    }

    /**
     * Create a webhook subscription
     * @param requestBody
     * @returns Webhook Created
     * @throws ApiError
     */
    public static postWebhooks(
        requestBody: WebhookCreateRequest,
    ): CancelablePromise<Webhook> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/webhooks',
            body: requestBody,
            mediaType: 'application/json',
        });
    }

    /**
     * Update a webhook subscription
     * @param id
     * @param requestBody
     * @returns Webhook Updated webhook
     * @throws ApiError
     */
    public static patchWebhooksById(
        id: string,
        requestBody: WebhookUpdateRequest,
    ): CancelablePromise<Webhook> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/webhooks/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }

    /**
     * Send a test payload to a webhook
     * @param id
     * @returns WebhookTestResponse Test delivery result
     * @throws ApiError
     */
    public static postWebhooksByIdTest(
        id: string,
    ): CancelablePromise<WebhookTestResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/webhooks/{id}/test',
            path: {
                'id': id,
            },
        });
    }

}
