import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ReceptionDestination } from '@prisma/client';

export class ReceiveOrderDto {
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsEnum(ReceptionDestination)
  destination?: ReceptionDestination;

  @IsOptional()
  @IsUUID()
  targetAssetId?: string;

  @IsOptional()
  @IsUUID()
  workOrderId?: string;

  @IsOptional()
  @IsString()
  gateTicketNumber?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
