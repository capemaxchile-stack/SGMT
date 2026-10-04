import { IsOptional, IsString, IsUUID, IsDateString } from 'class-validator';

export class FilterReportsDto {
  @IsOptional()
  @IsUUID()
  faenaId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  period?: string; // 'current_month' | 'last_month' | 'quarter' | 'year' | 'custom'
}
