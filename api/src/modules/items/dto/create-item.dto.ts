import { IsString, IsNumber, IsOptional, IsArray } from 'class-validator';

export class CreateItemDto {
  @IsString()
  code: string;

  @IsString()
  description: string;

  @IsString()
  unitOfMeasure: string;

  @IsString()
  category: string;

  @IsOptional()
  @IsNumber()
  minimumStock?: number;

  @IsOptional()
  @IsString()
  compatibleModels?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  compatibleAssetIds?: string[];
}
