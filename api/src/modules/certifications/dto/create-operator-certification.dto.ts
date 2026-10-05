import { IsString, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { OperatorDocType } from '@prisma/client';

export class CreateOperatorCertificationDto {
  @IsString()
  operatorName: string;

  @IsString()
  rut: string;

  @IsOptional()
  @IsString()
  jobTitle?: string;

  @IsOptional()
  @IsString()
  faenaId?: string;

  @IsEnum(OperatorDocType)
  docType: OperatorDocType;

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
}
