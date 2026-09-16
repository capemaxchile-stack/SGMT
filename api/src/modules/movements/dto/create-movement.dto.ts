import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { MovementType } from '@prisma/client';

export class MovementLineDto {
  @IsUUID()
  itemId: string;

  @IsNumber()
  @Min(0.01)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitCost: number;
}

export class CreateMovementDto {
  @IsEnum(MovementType)
  type: MovementType;

  @IsUUID()
  warehouseId: string;

  @IsOptional()
  @IsUUID()
  faenaId?: string;

  @IsOptional()
  @IsUUID()
  assetId?: string;

  @IsOptional()
  @IsUUID()
  purchaseOrderId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MovementLineDto)
  lines: MovementLineDto[];
}
