import { IsArray, IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { QuotationStatus } from '@prisma/client';

export class UpdateQuotationLineDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsUUID()
  itemId: string;

  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsOptional()
  @IsNumber()
  availabilityDays?: number;

  @IsOptional()
  @IsString()
  comments?: string;
}

export class UpdateQuotationDto {
  @IsOptional()
  @IsEnum(QuotationStatus)
  status?: QuotationStatus;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateQuotationLineDto)
  lines?: UpdateQuotationLineDto[];
}
