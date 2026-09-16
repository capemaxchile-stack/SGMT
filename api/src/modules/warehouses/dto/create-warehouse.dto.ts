import { IsString, IsEnum } from 'class-validator';
import { WarehouseType } from '@prisma/client';

export class CreateWarehouseDto {
  @IsString()
  name: string;

  @IsString()
  location: string;

  @IsEnum(WarehouseType)
  type: WarehouseType;
}
