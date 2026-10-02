import { IsEnum, IsOptional, IsString, IsInt, Min, IsArray, IsBoolean } from 'class-validator';
import { AssetType } from '@prisma/client';

export class UpdatePlanDto {
  @IsOptional()
  @IsEnum(AssetType)
  assetType?: AssetType;

  @IsOptional()
  @IsString()
  name?: string;

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

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
