MeoCRM Coding Standards
Backend Standards (NestJS)
Controller Structure
typescript
@Controller('products') @UseGuards(JwtAuthGuard) // REQUIRED on ALL controllers   export class ProductsController {   @Get()   @ApiOperation({ summary: 'Get products list' })   async findAll(@CurrentUser() user: UserEntity) {     return this.service.findAll(user.organizationId);   } }
Service Structure
typescript
@Injectable() export class ProductsService {   async findAll(organizationId: string) {     return this.prisma.product.findMany({       where: { organizationId }, // ALWAYS REQUIRED     });   } }
Frontend Standards (Next.js)
API Calls
typescript
const useProducts = () => {   return useQuery({     queryKey: ['products'],     queryFn: () => api.get('/products'),   }); };
Component Structure
typescript
export default function ProductsPage() {   const { data: products, isLoading } = useProducts();      if (isLoading) return <ProductsSkeleton />;      return <ProductsList products={products} />; }
Security Standards
Multi-tenant Isolation
ALL queries MUST include organizationId
JWT guards on ALL endpoints
Input validation with DTOs
bcrypt for password hashing (10 rounds)
