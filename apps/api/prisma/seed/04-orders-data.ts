import { OrderStatus, PaymentMethod, PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { BaseSeedData } from './01-base-data';
import { ProductsSeedData } from './03-products-data';
import { generateCode, randomDate, randomElement, randomInt } from './utils/seed-helpers';

const provinces = ['Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ'];
const districts = ['Quận 1', 'Quận 2', 'Quận 3', 'Quận 7', 'Quận Đống Đa'];
const wards = ['Phường 1', 'Phường 2', 'Phường Tân Phong', 'Phường Bến Nghé'];

const paymentMethods: PaymentMethod[] = ['CASH', 'CARD', 'E_WALLET', 'BANK_TRANSFER'];

export async function seedOrdersData(
  prisma: PrismaClient,
  baseData: BaseSeedData,
  productsData: ProductsSeedData,
) {
  faker.seed(42);

  const orgId = baseData.organizations.hn.id;
  const customerGroups = Object.values(baseData.customerGroups.hn);

  console.log('  Creating customers...');

  const customers = [];
  for (let i = 1; i <= 30; i++) {
    const groupId = customerGroups[i % customerGroups.length].id;
    const customer = await prisma.customer.create({
      data: {
        organizationId: orgId,
        code: generateCode('KH', i),
        name: faker.person.fullName(),
        phone: faker.phone.number('09########'),
        email: faker.internet.email(),
        address: faker.location.streetAddress(),
        province: randomElement(provinces),
        district: randomElement(districts),
        ward: randomElement(wards),
        groupId,
        totalSpent: 0,
        totalOrders: 0,
        debt: 0,
      },
    });
    customers.push(customer);
  }

  console.log('  ✓ Created 30 customers');
  console.log('  Creating orders...');

  const statuses: OrderStatus[] = ['COMPLETED', 'PROCESSING', 'PENDING', 'CANCELLED'];
  const statusWeights = [50, 30, 15, 5];
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  let statusIndex = 0;
  let statusCount = 0;

  for (let i = 1; i <= 100; i++) {
    if (statusCount >= statusWeights[statusIndex]) {
      statusIndex++;
      statusCount = 0;
    }
    const status = statuses[Math.min(statusIndex, statuses.length - 1)];
    statusCount++;

    const customer = randomElement(customers);
    const numItems = randomInt(1, 5);
    const orderItems = [];
    let subtotal = 0;

    for (let j = 0; j < numItems; j++) {
      const product = randomElement(productsData.products);
      const quantity = randomInt(1, 3);
      const price = Number(product.sellPrice);
      const lineTotal = price * quantity;

      orderItems.push({
        productId: product.id,
        quantity,
        price,
        discount: 0,
        lineTotal,
      });

      subtotal += lineTotal;
    }

    const discount = 0;
    const total = subtotal - discount;

    const order = await prisma.order.create({
      data: {
        organizationId: orgId,
        code: generateCode('HD', i),
        customerId: customer.id,
        subtotal,
        discount,
        total,
        paymentMethod: randomElement(paymentMethods),
        isPaid: status === 'COMPLETED',
        paidAmount: status === 'COMPLETED' ? total : 0,
        status,
        createdAt: randomDate(threeMonthsAgo, new Date()),
        items: {
          create: orderItems,
        },
      },
      select: { id: true, createdAt: true },
    });

    if (status === 'COMPLETED') {
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          totalSpent: { increment: total },
          totalOrders: { increment: 1 },
          lastOrderAt: order.createdAt,
        },
      });
    }
  }

  console.log('  ✓ Created 100 orders with items');
}
