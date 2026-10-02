import { IsNotEmpty, IsNumber, IsUUID, Min } from 'class-validator';

export class ConsumeItemDto {
  @IsUUID()
  @IsNotEmpty()
  itemId: string;

  @IsNumber()
  @Min(0.01)
  quantity: number;

  @IsUUID()
  @IsNotEmpty()
  warehouseId: string;
}
