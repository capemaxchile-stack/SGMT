import { IsString, IsNumber, IsDateString, IsOptional } from 'class-validator';

export class CreateContractDto {
  @IsString()
  number: string;

  @IsString()
  clientName: string;

  @IsNumber()
  amount: number;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
