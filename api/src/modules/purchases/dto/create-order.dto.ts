import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

export class OrderLineDto {
  @IsUUID()
  itemId: string;

  @IsNumber()
  @Min(0.01)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;
}

export class CreateOrderDto {
  @IsUUID()
  supplierId: string;

  @IsOptional()
  @IsUUID()
  purchaseRequestId?: string;

  @IsOptional()
  @IsString()
  deliveryTerms?: string;

  @IsOptional()
  @IsDateString()
  estimatedDeliveryDate?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderLineDto)
  lines: OrderLineDto[];
}
