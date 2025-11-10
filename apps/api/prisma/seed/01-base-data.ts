import { Branch, CustomerGroup, Organization, PrismaClient, User } from '@prisma/client';
import { hashPassword } from './utils/seed-helpers';

export interface BaseSeedData {
  organizations: {
    hn: Organization;
    hcm: Organization;
  };
  branches: {
    hnMain: Branch;
    hnDistrict1: Branch;
    hcmMain: Branch;
    hcmDistrict7: Branch;
  };
  customerGroups: {
    hn: {
      vip: CustomerGroup;
      wholesale: CustomerGroup;
      retail: CustomerGroup;
    };
    hcm: {
      vip: CustomerGroup;
      wholesale: CustomerGroup;
      retail: CustomerGroup;
    };
  };
  users: {
    hn: {
      admin: User;
      manager: User;
      staff: User;
    };
    hcm: {
      admin: User;
      manager: User;
      cashier: User;
    };
  };
}

export async function seedBaseData(prisma: PrismaClient): Promise<BaseSeedData> {
  console.log('  Creating organizations...');

  const seedPassword = process.env.SEED_USER_PASSWORD ?? 'S3ed!2025@Meo';
  const hashedPassword = await hashPassword(seedPassword);

  return prisma.$transaction(async (tx) => {
    const orgHN = await tx.organization.create({
      data: {
        name: 'Lano Hanoi',
        slug: 'lano-hn',
        code: 'LANO-HN',
      },
    });

    const orgHCM = await tx.organization.create({
      data: {
        name: 'Lano Ho Chi Minh',
        slug: 'lano-hcm',
        code: 'LANO-HCM',
      },
    });

    console.log('  ✓ Created 2 organizations');
    console.log('  Creating branches...');

    const branchHNMain = await tx.branch.create({
      data: {
        organizationId: orgHN.id,
        name: 'Lano HN - Main Branch',
        address: '123 Hoàn Kiếm, Hà Nội',
        phone: '024-1234-5678',
      },
    });

    const branchHNDistrict1 = await tx.branch.create({
      data: {
        organizationId: orgHN.id,
        name: 'Lano HN - District 1',
        address: '456 Ba Đình, Hà Nội',
        phone: '024-8765-4321',
      },
    });

    const branchHCMMain = await tx.branch.create({
      data: {
        organizationId: orgHCM.id,
        name: 'Lano HCM - Main Branch',
        address: '789 Nguyễn Huệ, Quận 1, TP.HCM',
        phone: '028-1234-5678',
      },
    });

    const branchHCMDistrict7 = await tx.branch.create({
      data: {
        organizationId: orgHCM.id,
        name: 'Lano HCM - District 7',
        address: '321 Phú Mỹ Hưng, Quận 7, TP.HCM',
        phone: '028-8765-4321',
      },
    });

    console.log('  ✓ Created 4 branches');
    console.log('  Creating users...');

    const usersConfig = [
      {
        organizationId: orgHN.id,
        email: 'admin@lano.vn',
        name: 'Admin Hanoi',
        role: 'ADMIN' as const,
      },
      {
        organizationId: orgHN.id,
        email: 'manager.hn@lano.vn',
        name: 'Manager Hanoi',
        role: 'MANAGER' as const,
      },
      {
        organizationId: orgHN.id,
        email: 'staff.hn@lano.vn',
        name: 'Staff Hanoi',
        role: 'STAFF' as const,
      },
      {
        organizationId: orgHCM.id,
        email: 'admin.hcm@lano.vn',
        name: 'Admin HCM',
        role: 'ADMIN' as const,
      },
      {
        organizationId: orgHCM.id,
        email: 'manager.hcm@lano.vn',
        name: 'Manager HCM',
        role: 'MANAGER' as const,
      },
      {
        organizationId: orgHCM.id,
        email: 'cashier.hcm@lano.vn',
        name: 'Cashier HCM',
        role: 'CASHIER' as const,
      },
    ];

    const createdUsers = await Promise.all(
      usersConfig.map((userData) =>
        tx.user.create({
          data: {
            ...userData,
            password: hashedPassword,
          },
        }),
      ),
    );

    console.log('  ✓ Created 6 users (password cấu hình qua SEED_USER_PASSWORD)');
    console.log('  Creating customer groups...');

    const groupHNVIP = await tx.customerGroup.create({
      data: {
        organizationId: orgHN.id,
        name: 'VIP',
        description: 'Khách hàng VIP',
        discountRate: 10.0,
      },
    });

    const groupHNWholesale = await tx.customerGroup.create({
      data: {
        organizationId: orgHN.id,
        name: 'Wholesale',
        description: 'Khách hàng bán sỉ',
        discountRate: 5.0,
      },
    });

    const groupHNRetail = await tx.customerGroup.create({
      data: {
        organizationId: orgHN.id,
        name: 'Retail',
        description: 'Khách hàng bán lẻ',
        discountRate: 0.0,
      },
    });

    const groupHCMVIP = await tx.customerGroup.create({
      data: {
        organizationId: orgHCM.id,
        name: 'VIP',
        description: 'Khách hàng VIP',
        discountRate: 12.5,
      },
    });

    const groupHCMWholesale = await tx.customerGroup.create({
      data: {
        organizationId: orgHCM.id,
        name: 'Wholesale',
        description: 'Đại lý HCM',
        discountRate: 6.5,
      },
    });

    const groupHCMRetail = await tx.customerGroup.create({
      data: {
        organizationId: orgHCM.id,
        name: 'Retail',
        description: 'Khách lẻ HCM',
        discountRate: 0,
      },
    });

    console.log('  ✓ Created 6 customer groups (3 HN + 3 HCM)');

    return {
      organizations: { hn: orgHN, hcm: orgHCM },
      branches: {
        hnMain: branchHNMain,
        hnDistrict1: branchHNDistrict1,
        hcmMain: branchHCMMain,
        hcmDistrict7: branchHCMDistrict7,
      },
      customerGroups: {
        hn: {
          vip: groupHNVIP,
          wholesale: groupHNWholesale,
          retail: groupHNRetail,
        },
        hcm: {
          vip: groupHCMVIP,
          wholesale: groupHCMWholesale,
          retail: groupHCMRetail,
        },
      },
      users: {
        hn: {
          admin: createdUsers[0],
          manager: createdUsers[1],
          staff: createdUsers[2],
        },
        hcm: {
          admin: createdUsers[3],
          manager: createdUsers[4],
          cashier: createdUsers[5],
        },
      },
    };
  });
}
