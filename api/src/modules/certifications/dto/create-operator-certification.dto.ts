import { IsString, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';
import { OperatorDocType } from '@prisma/client';

export class CreateOperatorCertificationDto {
  @IsString()
  operatorName: string;

  @IsString()
  rut: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  jobTitle?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  faenaId?: string;

  @IsEnum(OperatorDocType)
  docType: OperatorDocType;

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
}
