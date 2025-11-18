import { PrismaService } from '../src/prisma/prisma.service';

export default async function globalTeardown() {
  const prisma = PrismaService.getInstance();
  await prisma.$disconnect();
}
