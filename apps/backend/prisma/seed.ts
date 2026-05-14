import { PrismaClient, EmployeeRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database…');

  // Org
  const org = await prisma.organization.upsert({
    where: { slug: 'demo-cafe' },
    create: {
      name: 'Demo Cafe',
      slug: 'demo-cafe',
      email: 'owner@democafe.com',
      subscriptionPlan: 'PROFESSIONAL',
    },
    update: {},
  });

  // Store
  const store = await prisma.store.upsert({
    where: { id: 'store-demo-1' },
    create: {
      id: 'store-demo-1',
      organizationId: org.id,
      name: 'Demo Cafe - Main Branch',
      address: '123 Coffee Lane',
      city: 'San Francisco',
      state: 'CA',
      country: 'US',
      currency: 'USD',
      timezone: 'America/Los_Angeles',
    },
    update: {},
  });

  // Owner employee
  const hashedPass = await bcrypt.hash('password123', 12);
  const owner = await prisma.employee.upsert({
    where: { organizationId_email: { organizationId: org.id, email: 'owner@democafe.com' } },
    create: {
      organizationId: org.id,
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'owner@democafe.com',
      role: EmployeeRole.OWNER,
      pin: hashedPass,
    },
    update: {},
  });

  await prisma.storeEmployee.upsert({
    where: { storeId_employeeId: { storeId: store.id, employeeId: owner.id } },
    create: { storeId: store.id, employeeId: owner.id, isPrimary: true },
    update: {},
  });

  // Tax rate
  const taxRate = await prisma.taxRate.upsert({
    where: { id: 'tax-ca-standard' },
    create: {
      id: 'tax-ca-standard',
      organizationId: org.id,
      name: 'CA Sales Tax',
      rate: 0.0875,
      isDefault: true,
    },
    update: {},
  });

  // Categories
  const catBeverages = await prisma.category.upsert({
    where: { id: 'cat-beverages' },
    create: { id: 'cat-beverages', organizationId: org.id, name: 'Beverages', color: '#3b82f6', sortOrder: 0 },
    update: {},
  });
  const catFood = await prisma.category.upsert({
    where: { id: 'cat-food' },
    create: { id: 'cat-food', organizationId: org.id, name: 'Food', color: '#10b981', sortOrder: 1 },
    update: {},
  });

  // Ingredient products
  const espresso = await prisma.product.upsert({
    where: { id: 'ing-espresso' },
    create: {
      id: 'ing-espresso',
      organizationId: org.id,
      categoryId: catBeverages.id,
      taxRateId: taxRate.id,
      name: 'Espresso Shot',
      price: 0.50,
      cost: 0.20,
      trackInventory: true,
    },
    update: {},
  });

  const milk = await prisma.product.upsert({
    where: { id: 'ing-milk' },
    create: {
      id: 'ing-milk',
      organizationId: org.id,
      name: 'Whole Milk',
      price: 0,
      cost: 0.05,
      trackInventory: true,
    },
    update: {},
  });

  // Composite: Latte = 2 espresso shots + 200ml milk
  const latte = await prisma.product.upsert({
    where: { id: 'prod-latte' },
    create: {
      id: 'prod-latte',
      organizationId: org.id,
      categoryId: catBeverages.id,
      taxRateId: taxRate.id,
      name: 'Latte',
      sku: 'BEV-LATTE-001',
      price: 5.50,
      cost: 0.55,
      isComposite: true,
      trackInventory: false, // tracked via ingredients
    },
    update: {},
  });

  await prisma.productRecipe.upsert({
    where: { compositeProductId_ingredientProductId: { compositeProductId: latte.id, ingredientProductId: espresso.id } },
    create: { compositeProductId: latte.id, ingredientProductId: espresso.id, quantity: 2, unit: 'shot' },
    update: {},
  });

  await prisma.productRecipe.upsert({
    where: { compositeProductId_ingredientProductId: { compositeProductId: latte.id, ingredientProductId: milk.id } },
    create: { compositeProductId: latte.id, ingredientProductId: milk.id, quantity: 200, unit: 'ml' },
    update: {},
  });

  // Set initial inventory (upsert doesn't work on nullable composite keys — use findFirst + create)
  const existingEspressoInv = await prisma.inventory.findFirst({ where: { storeId: store.id, productId: espresso.id, variantId: null } });
  if (!existingEspressoInv) {
    await prisma.inventory.create({ data: { storeId: store.id, productId: espresso.id, quantity: 500, lowStockAlert: 50 } });
  }

  const existingMilkInv = await prisma.inventory.findFirst({ where: { storeId: store.id, productId: milk.id, variantId: null } });
  if (!existingMilkInv) {
    await prisma.inventory.create({ data: { storeId: store.id, productId: milk.id, quantity: 10000, lowStockAlert: 1000, reorderPoint: 2000 } });
  }

  // Loyalty program
  await prisma.loyaltyProgram.upsert({
    where: { organizationId: org.id },
    create: {
      organizationId: org.id,
      name: 'Demo Cafe Rewards',
      pointsPerCurrency: 1,
      pointsValue: 0.01,
      minimumRedeemPoints: 100,
    },
    update: {},
  });

  // Register
  await prisma.register.upsert({
    where: { id: 'reg-1' },
    create: { id: 'reg-1', storeId: store.id, name: 'Register 1' },
    update: {},
  });

  // Tables
  for (let i = 1; i <= 10; i++) {
    await prisma.table.upsert({
      where: { id: `table-${i}` },
      create: { id: `table-${i}`, storeId: store.id, name: `T-${String(i).padStart(2, '0')}`, seats: 4 },
      update: {},
    });
  }

  console.log('✅ Seed complete');
  console.log(`   Login: owner@democafe.com / password123`);
  console.log(`   Organization: ${org.id}`);
  console.log(`   Store: ${store.id}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
