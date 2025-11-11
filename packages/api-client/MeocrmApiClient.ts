/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BaseHttpRequest } from './core/BaseHttpRequest';
import type { OpenAPIConfig } from './core/OpenAPI';
import { FetchHttpRequest } from './core/FetchHttpRequest';
import { CommissionsService } from './services/CommissionsService';
import { LeadsService } from './services/LeadsService';
import { OrdersService } from './services/OrdersService';
type HttpRequestConstructor = new (config: OpenAPIConfig) => BaseHttpRequest;
export class MeocrmApiClient {
    public readonly commissions: CommissionsService;
    public readonly leads: LeadsService;
    public readonly orders: OrdersService;
    public readonly request: BaseHttpRequest;
    constructor(config?: Partial<OpenAPIConfig>, HttpRequest: HttpRequestConstructor = FetchHttpRequest) {
        this.request = new HttpRequest({
            BASE: config?.BASE ?? '',
            VERSION: config?.VERSION ?? '1.0.0',
            WITH_CREDENTIALS: config?.WITH_CREDENTIALS ?? false,
            CREDENTIALS: config?.CREDENTIALS ?? 'include',
            TOKEN: config?.TOKEN,
            USERNAME: config?.USERNAME,
            PASSWORD: config?.PASSWORD,
            HEADERS: config?.HEADERS,
            ENCODE_PATH: config?.ENCODE_PATH,
        });
        this.commissions = new CommissionsService(this.request);
        this.leads = new LeadsService(this.request);
        this.orders = new OrdersService(this.request);
    }
}
