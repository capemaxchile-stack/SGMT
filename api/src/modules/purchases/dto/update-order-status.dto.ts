import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { AuthorizationAction } from '@prisma/client';

export class UpdateOrderStatusDto {
  @IsEnum(AuthorizationAction)
  action: AuthorizationAction;

  @IsNumber()
  level: number;

  @IsOptional()
  @IsString()
  comments?: string;

  @IsOptional()
  @IsString()
  exceptionReason?: string;
}
