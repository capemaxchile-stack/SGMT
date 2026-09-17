import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { AuthorizationAction } from '@prisma/client';

export class UpdateOrderStatusDto {
  @IsEnum(AuthorizationAction)
  action: AuthorizationAction;

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
