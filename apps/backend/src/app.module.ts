import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { StoresModule } from './modules/stores/stores.module';
import { ProductsModule } from './modules/products/products.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { OrdersModule } from './modules/orders/orders.module';
import { CustomersModule } from './modules/customers/customers.module';
import { LoyaltyModule } from './modules/loyalty/loyalty.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { KdsModule } from './modules/kds/kds.module';

@Module({
  imports: [
    // ─── Config ──────────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // ─── Rate limiting ────────────────────────────────────────────────────────
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 20 },
      { name: 'medium', ttl: 10000, limit: 100 },
      { name: 'long', ttl: 60000, limit: 500 },
    ]),

    // ─── Scheduler ───────────────────────────────────────────────────────────
    ScheduleModule.forRoot(),

    // ─── Queue (Bull / Redis) ─────────────────────────────────────────────────
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: config.get<string>('REDIS_URL'),
      }),
    }),

    // ─── Core ─────────────────────────────────────────────────────────────────
    PrismaModule,

    // ─── Feature modules ──────────────────────────────────────────────────────
    AuthModule,
    OrganizationsModule,
    StoresModule,
    ProductsModule,
    InventoryModule,
    OrdersModule,
    CustomersModule,
    LoyaltyModule,
    EmployeesModule,
    AnalyticsModule,
    IntegrationsModule,
    KdsModule,
  ],
})
export class AppModule {}
