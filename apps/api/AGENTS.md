pnpm --filter @meocrm/api dev     # Start on port 2003

pnpm --filter @meocrm/api test    # Run tests

pnpm --filter @meocrm/api db:studio # Prisma Studio

```

---

## Module Pattern

**Controller:**
```

@Controller('products')

@UseGuards(JwtAuthGuard)  // REQUIRED

export class ProductsController {

@Get()

async findAll(@CurrentUser() user: UserEntity) {

return this.service.findAll(user.organizationId);

}

}

```

**Service:**
```

@Injectable()

export class ProductsService {

async findAll(organizationId: string) {

return this.prisma.product.findMany({

where: { organizationId }  // REQUIRED

});

}

}

```

---

## Testing Pattern

**E2E Tenant Isolation:**
```

it('prevents cross-tenant access', async () => {

const orgA = await createOrg();

const orgB = await createOrg();

await service.create([orgA.id](http://orgA.id), data);

const results = await service.findAll([orgB.id](http://orgB.id));

expect(results).toHaveLength(0); // orgB cannot see orgA

});

```

---

## Module Checklist

- [ ] Module/Service/Controller
- [ ] DTOs with class-validator
- [ ] organizationId in ALL queries
- [ ] JwtAuthGuard on controller
- [ ] Unit tests ≥80%
- [ ] E2E tests with isolation
- [ ] Swagger decorators

---

## Structure

```

src/

├── auth/         # JWT + guards

├── products/     # CRUD + variants

├── customers/    # CRM + segments

├── orders/       # Payments + shipping

└── common/       # RequestContext + middleware
