import { IsEnum, IsNotEmpty, IsOptional, IsString, IsInt, Min, IsArray } from 'class-validator';
import { AssetType } from '@prisma/client';

export class CreatePlanDto {
  @IsEnum(AssetType)
  assetType: AssetType;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  intervalHours?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  intervalKm?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  checklist?: string[];
}
