import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

export interface RequestContextStore {
  requestId: string;
  userId?: string;
  organizationId?: string;
  roles?: string[];
}

@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<RequestContextStore>();

  run<T>(callback: () => T | Promise<T>): Promise<T> {
    const store: RequestContextStore = { requestId: randomUUID() };
    return this.storage.run(store, () => Promise.resolve(callback()));
  }

  setContext(context: Partial<RequestContextStore>) {
    const store = this.storage.getStore();
    if (!store) {
      return;
    }
    Object.assign(store, context);
  }

  getContext(): RequestContextStore | undefined {
    return this.storage.getStore();
  }

  getTraceId(): string | undefined {
    return this.storage.getStore()?.requestId;
  }

  get organizationId(): string | undefined {
    return this.storage.getStore()?.organizationId;
  }

  withOrganizationContext<T>(
    organizationId: string,
    callback: () => Promise<T>,
  ): Promise<T> {
    return this.run(async () => {
      this.setContext({ organizationId });
      return callback();
    });
  }
}
