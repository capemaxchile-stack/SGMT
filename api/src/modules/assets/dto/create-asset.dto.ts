import { IsString, IsEnum, IsNumber, IsOptional } from 'class-validator';
import { AssetType, AssetOperationalStatus } from '@prisma/client';

export class CreateAssetDto {
  @IsEnum(AssetType)
  type: AssetType;

  @IsString()
  brand: string;

  @IsString()
  model: string;

  @IsNumber()
  year: number;

  @IsOptional()
  @IsString()
  licensePlate?: string;

  @IsString()
  internalNumber: string;

  @IsEnum(AssetOperationalStatus)
  operationalStatus: AssetOperationalStatus;

  @IsNumber()
  currentHourmeter: number;

  @IsNumber()
  currentKilometrage: number;
}
