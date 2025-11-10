pnpm --filter @meocrm/web dev     # Start on port 2004

pnpm --filter @meocrm/web build   # Production build

```

---

## Design System

- **UI:** Shadcn/ui + Tailwind CSS 4.0.1
- **Style:** KiotViet-inspired (see Notion: Frontend UI Specs)
- **Language:** Vietnamese by default
- **Data:** TanStack Query
- **State:** Zustand (UI only)

---

## Component Pattern

```

// Data fetching

const useProducts = () => {

return useQuery({

queryKey: ['products'],

queryFn: () => api.get('/products'),

});

};

// Component

export default function ProductsPage() {

const { data, isLoading } = useProducts();

if (isLoading) return <Skeleton />;

return <ProductsList products={data} />;

}

```

---

## Structure

```

app/

├── (auth)/           # Login/Register

└── (dashboard)/      # Main app

├── layout.tsx    # Dashboard shell

├── products/     # Products UI

├── customers/    # Customers UI

├── pos/          # POS interface

└── reports/      # Reports

```

---

## Component Checklist

- [ ] Responsive (mobile/tablet/desktop)
- [ ] Loading states (Skeleton)
- [ ] Error boundaries
- [ ] Vietnamese labels
- [ ] TanStack Query
- [ ] Integration tests (MSW)
```
