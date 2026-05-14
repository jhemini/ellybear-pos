import {
  IsString, IsOptional, IsArray, IsEnum, IsNumber, IsBoolean,
  ValidateNested, Min, IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderType, PaymentMethod } from '@prisma/client';

export class OrderItemModifierDto {
  @IsString()
  modifierId: string;

  @IsString()
  name: string;

  @IsNumber()
  priceAdjustment: number;
}

export class CreateOrderItemDto {
  @IsString()
  productId: string;

  @IsOptional()
  @IsString()
  variantId?: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemModifierDto)
  modifiers?: OrderItemModifierDto[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;
}

export class CreateOrderDto {
  @IsString()
  storeId: string;

  @IsOptional()
  @IsString()
  registerId?: string;

  @IsOptional()
  @IsString()
  tableId?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsEnum(OrderType)
  type: OrderType;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  // Discounts applied to whole order
  @IsOptional()
  @IsArray()
  discountIds?: string[];

  // Offline support
  @IsOptional()
  @IsString()
  offlineId?: string;

  @IsOptional()
  @IsBoolean()
  isOffline?: boolean;
}

export class AddOrderItemDto extends CreateOrderItemDto {}

export class ProcessPaymentDto {
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tipAmount?: number;

  @IsOptional()
  @IsString()
  reference?: string;
}

export class ProcessMultiPaymentDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProcessPaymentDto)
  payments: ProcessPaymentDto[];
}

export class RefundDto {
  @IsString()
  paymentId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  reason?: string;

  // Items to refund (for partial refunds)
  @IsOptional()
  @IsArray()
  items?: Array<{ orderItemId: string; quantity: number }>;
}

export class SyncOfflineOrderDto extends CreateOrderDto {
  @IsString()
  offlineId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProcessPaymentDto)
  payments: ProcessPaymentDto[];

  @IsString()
  createdAt: string; // ISO timestamp from device
}
