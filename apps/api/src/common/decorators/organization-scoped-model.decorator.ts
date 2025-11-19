import { Prisma } from '@prisma/client';
import { RequestContextService } from '../context/request-context.service';

const CONTEXT_TOKEN = Symbol('OrganizationScopedModelContext');

type WithRequestContext = {
  requestContextService?: RequestContextService;
  requestContext?: RequestContextService;
};

export function OrganizationScopedModel(...models: Prisma.ModelName[]) {
  return function (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) {
    const original = descriptor.value as (...args: unknown[]) => unknown;

    descriptor.value = function (this: WithRequestContext, ...args: unknown[]) {
      const ctxService = resolveRequestContext(this);
      if (!ctxService || models.length === 0) {
        return original.apply(this, args);
      }

      return ctxService.withOrganizationBypass(models, () => original.apply(this, args));
    };

    return descriptor;
  };
}

function resolveRequestContext(instance: WithRequestContext): RequestContextService | undefined {
  if (instance[CONTEXT_TOKEN as keyof WithRequestContext]) {
    return instance[CONTEXT_TOKEN as keyof WithRequestContext] as RequestContextService;
  }

  const direct = instance.requestContextService ?? instance.requestContext;
  if (direct) {
    Object.defineProperty(instance, CONTEXT_TOKEN, {
      enumerable: false,
      configurable: false,
      writable: false,
      value: direct,
    });
  }

  return direct;
}
