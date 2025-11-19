import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

export interface RequestContextStore {
  requestId: string;
  traceId?: string;
  userId?: string;
  organizationId?: string;
  roles?: string[];
  bypassModels?: Set<string>;
}

@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<RequestContextStore>();

  run<T>(callback: () => T | Promise<T>, initial?: Partial<RequestContextStore>): Promise<T> {
    const store: RequestContextStore = {
      requestId: initial?.requestId ?? randomUUID(),
      traceId: initial?.traceId,
      userId: initial?.userId,
      organizationId: initial?.organizationId,
      roles: initial?.roles,
      bypassModels: initial?.bypassModels ? new Set(initial.bypassModels) : undefined,
    };
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
    const store = this.storage.getStore();
    return store?.traceId ?? store?.requestId;
  }

  get organizationId(): string | undefined {
    return this.storage.getStore()?.organizationId;
  }

  withOrganizationBypass<T>(models: string[], callback: () => T | Promise<T>): Promise<T> | T {
    const store = this.storage.getStore();
    if (!store || models.length === 0) {
      return callback();
    }

    const previous = store.bypassModels ? new Set(store.bypassModels) : undefined;
    store.bypassModels = new Set([...(store.bypassModels ?? []), ...models]);

    try {
      return callback();
    } finally {
      store.bypassModels = previous;
    }
  }

  shouldBypassModel(model?: string): boolean {
    if (!model) {
      return false;
    }
    const store = this.storage.getStore();
    return store?.bypassModels?.has(model) ?? false;
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
