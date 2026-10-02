import { IsOptional, IsString, IsNumber, Min } from 'class-validator';

export class CompleteWorkOrderDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  technicianName?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  finalHourmeter?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  finalKilometrage?: number;
}
