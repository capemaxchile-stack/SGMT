import { IsString, IsEnum, IsOptional, IsBoolean, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';
import { AssetDocType } from '@prisma/client';

export class CreateAssetDocumentDto {
  @IsString()
  assetId: string;

  @IsEnum(AssetDocType)
  docType: AssetDocType;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  documentNumber?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  issuingEntity?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsDateString()
  issueDate?: string;

  @IsDateString()
  expirationDate: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;
}
