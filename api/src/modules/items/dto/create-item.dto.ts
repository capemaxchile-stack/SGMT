import { IsString, IsNumber, IsOptional } from 'class-validator';

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
}
