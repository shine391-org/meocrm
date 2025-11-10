import { PrismaClient } from '@prisma/client';
import { BaseSeedData } from './01-base-data';

export async function seedSampleData(prisma: PrismaClient, baseData: BaseSeedData) {
  console.log('  Creating shipping partners...');

  const partners = [
    {
      organizationId: baseData.organizations.hn.id,
      code: 'GHTK',
      name: 'Giao Hàng Tiết Kiệm',
      email: 'contact@ghtk.vn',
      phone: '1900-1234',
    },
    {
      organizationId: baseData.organizations.hn.id,
      code: 'GHN',
      name: 'Giao Hàng Nhanh',
      email: 'contact@ghn.vn',
      phone: '1900-5678',
    },
    {
      organizationId: baseData.organizations.hn.id,
      code: 'AHA',
      name: 'Ahamove',
      email: 'contact@ahamove.com',
      phone: '1900-9999',
    },
  ];

  await prisma.shippingPartner.createMany({ data: partners });

  console.log('  ✓ Created 3 shipping partners');
}
