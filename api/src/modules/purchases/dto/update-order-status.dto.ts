import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { AuthorizationAction, OrderStatus } from '@prisma/client';

export class UpdateOrderStatusDto {
  @IsOptional()
  @IsEnum(AuthorizationAction)
  action?: AuthorizationAction;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsNumber()
  level?: number = 1;

  @IsOptional()
  @IsString()
  comments?: string;

  @IsOptional()
  @IsString()
  exceptionReason?: string;

  @IsOptional()
  @IsString()
  superKey?: string;
}
