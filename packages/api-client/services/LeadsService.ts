/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { LeadPriority } from '../models/LeadPriority';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class LeadsService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Override lead priority (manual)
     * Applies a manual priority override for a lead inside the caller's organization.
     * @param id
     * @param requestBody
     * @returns any Priority override accepted
     * @throws ApiError
     */
    public postLeadsPriority:override(
        id: string,
        requestBody: {
            priority: LeadPriority;
        },
    ): CancelablePromise<{
        priorityEffective?: LeadPriority;
        traceId?: string;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/leads/{id}/priority:override',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Validation error`,
                404: `Lead not found inside tenant`,
            },
        });
    }
}
