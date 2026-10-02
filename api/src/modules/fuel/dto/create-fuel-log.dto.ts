import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateFuelLogDto {
  @IsUUID()
  @IsNotEmpty()
  assetId: string;

  @IsOptional()
  @IsUUID()
  faenaId?: string;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsNumber()
  @Min(0.1)
  liters: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  currentHourmeter?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  currentKilometrage?: number;

  @IsOptional()
  @IsString()
  operatorName?: string;

  @IsOptional()
  @IsString()
  fuelTruckPlate?: string;

  @IsOptional()
  @IsString()
  dispatchTicketNumber?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  dispatchDate?: string;
}
