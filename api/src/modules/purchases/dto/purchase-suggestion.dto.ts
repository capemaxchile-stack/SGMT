import { IsArray, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { RequestUrgency } from '@prisma/client';

export class SuggestionItemDto {
  @IsUUID()
  itemId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
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

export class GenerateRequestFromSuggestionDto {
  @IsUUID()
  faenaId: string;

  @IsString()
  justification: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SuggestionItemDto)
  items: SuggestionItemDto[];
}
