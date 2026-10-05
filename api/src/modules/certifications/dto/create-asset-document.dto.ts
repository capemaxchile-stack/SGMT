import { IsString, IsEnum, IsOptional, IsBoolean, IsDateString } from 'class-validator';
import { AssetDocType } from '@prisma/client';

export class CreateAssetDocumentDto {
  @IsString()
  assetId: string;

  @IsEnum(AssetDocType)
  docType: AssetDocType;

  @IsOptional()
  @IsString()
  documentNumber?: string;

  @IsOptional()
  @IsString()
  issuingEntity?: string;

  @IsOptional()
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
