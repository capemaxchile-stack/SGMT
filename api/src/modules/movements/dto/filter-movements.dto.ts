import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { MovementType } from '@prisma/client';

export class FilterMovementsDto {
  @IsOptional()
  @IsEnum(MovementType)
  type?: MovementType;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsUUID()
  faenaId?: string;

  @IsOptional()
  @IsUUID()
  assetId?: string;
}
