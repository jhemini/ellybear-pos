import { IsString, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';
import { InventoryMovementType } from '@prisma/client';

export class AdjustInventoryDto {
  @IsString()
  productId: string;

  @IsOptional()
  @IsString()
  variantId?: string;

  @IsNumber()
  quantity: number; // positive = add, negative = remove

  @IsEnum(InventoryMovementType)
  type: InventoryMovementType;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;
}

export class SetLowStockAlertDto {
  @IsString()
  productId: string;

  @IsOptional()
  @IsString()
  variantId?: string;

  @IsNumber()
  @Min(0)
  lowStockAlert: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  reorderPoint?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  reorderQty?: number;
}

export class TransferStockDto {
  @IsString()
  fromStoreId: string;

  @IsString()
  toStoreId: string;

  items: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
  }>;
}
