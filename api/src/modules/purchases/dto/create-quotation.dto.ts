import { IsArray, IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { QuotationStatus } from '@prisma/client';

export class CreateQuotationLineDto {
  @IsUUID()
  itemId: string;

  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @IsNumber()
  availabilityDays?: number;

  @IsOptional()
  @IsString()
  comments?: string;
}

export class CreateQuotationDto {
  @IsOptional()
  @IsUUID()
  purchaseRequestId?: string;

  @IsUUID()
  supplierId: string;

  @IsOptional()
  @IsEnum(QuotationStatus)
  status?: QuotationStatus;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuotationLineDto)
  lines: CreateQuotationLineDto[];
}
