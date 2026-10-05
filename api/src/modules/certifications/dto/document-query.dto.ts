import { IsOptional, IsString, IsEnum, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { AssetDocType, OperatorDocType } from '@prisma/client';

export class AssetDocumentQueryDto {
  @IsOptional()
  @IsString()
  assetId?: string;

  @IsOptional()
  @IsEnum(AssetDocType)
  docType?: AssetDocType;

  @IsOptional()
  @IsString()
  status?: 'VIGENTE' | 'POR_VENCER' | 'CRITICO' | 'VENCIDO';
}

export class OperatorCertificationQueryDto {
  @IsOptional()
  @IsString()
  rut?: string;

  @IsOptional()
  @IsString()
  faenaId?: string;

  @IsOptional()
  @IsEnum(OperatorDocType)
  docType?: OperatorDocType;

  @IsOptional()
  @IsString()
  status?: 'VIGENTE' | 'POR_VENCER' | 'CRITICO' | 'VENCIDO';
}

export class RadarQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  daysAhead?: number; // default 30 days
}
