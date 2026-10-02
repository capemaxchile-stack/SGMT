import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { RequestStatus } from '@prisma/client';

export class CreateRequestDto {
  @IsOptional()
  @IsString()
  requestNumber?: string;

  @IsUUID()
  faenaId: string;

  @IsString()
  justification: string;

  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;
}
