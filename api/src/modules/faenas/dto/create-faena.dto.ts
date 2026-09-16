import { IsString, IsEnum, IsDateString, IsOptional, IsUUID } from 'class-validator';
import { FaenaStatus } from '@prisma/client';

export class CreateFaenaDto {
  @IsString()
  name: string;

  @IsString()
  location: string;

  @IsEnum(FaenaStatus)
  status: FaenaStatus;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsUUID()
  chiefId?: string;
}
