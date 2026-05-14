import {
  IsString, IsOptional, IsNumber, IsBoolean,
  IsArray, ValidateNested, Min, IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RecipeItemDto {
  @IsString()
  ingredientProductId: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  wastagePercent?: number;
}

export class ModifierDto {
  @IsString()
  name: string;

  @IsNumber()
  priceAdjustment: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class ModifierGroupDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsNumber()
  minSelect?: number;

  @IsOptional()
  @IsNumber()
  maxSelect?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModifierDto)
  modifiers: ModifierDto[];
}

export class CreateProductDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  taxRateId?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsBoolean()
  isComposite?: boolean;

  @IsOptional()
  @IsBoolean()
  trackInventory?: boolean;

  // Recipe — only used when isComposite = true
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeItemDto)
  recipe?: RecipeItemDto[];

  // Modifiers
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModifierGroupDto)
  modifierGroups?: ModifierGroupDto[];
}

export class UpdateProductDto extends CreateProductDto {}

export class CreateCategoryDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class BulkImportProductDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductDto)
  products: CreateProductDto[];
}
