import { IsOptional, IsString, IsUUID } from 'class-validator';

export class ReceiveOrderDto {
  @IsUUID()
  warehouseId: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
