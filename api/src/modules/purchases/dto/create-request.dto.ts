import { IsArray, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { RequestStatus, RequestUrgency } from '@prisma/client';

export class CreateRequestLineDto {
  @IsUUID()
  itemId: string;

  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @IsOptional()
  @IsUUID()
  targetAssetId?: string;

  @IsOptional()
  @IsEnum(RequestUrgency)
  urgency?: RequestUrgency;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateRequestDto {
  @IsOptional()
  @IsString()
  requestNumber?: string;

  @IsUUID()
  faenaId: string;

  @IsString()
  justification: string;

  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRequestLineDto)
  lines?: CreateRequestLineDto[];
}
