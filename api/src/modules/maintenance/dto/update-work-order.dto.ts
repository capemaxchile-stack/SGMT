import { IsEnum, IsOptional, IsString } from 'class-validator';
import { WorkOrderStatus, WorkOrderPriority } from '@prisma/client';

export class UpdateWorkOrderDto {
  @IsOptional()
  @IsEnum(WorkOrderStatus)
  status?: WorkOrderStatus;

  @IsOptional()
  @IsEnum(WorkOrderPriority)
  priority?: WorkOrderPriority;

  @IsOptional()
  @IsString()
  technicianName?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  failureReport?: string;
}
