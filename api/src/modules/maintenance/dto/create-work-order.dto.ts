import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, IsNumber, Min } from 'class-validator';
import { WorkOrderType, WorkOrderPriority } from '@prisma/client';

export class CreateWorkOrderDto {
  @IsUUID()
  assetId: string;

  @IsOptional()
  @IsUUID()
  faenaId?: string;

  @IsOptional()
  @IsUUID()
  maintenancePlanId?: string;

  @IsEnum(WorkOrderType)
  type: WorkOrderType;

  @IsOptional()
  @IsEnum(WorkOrderPriority)
  priority?: WorkOrderPriority;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsString()
  failureReport?: string;

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
  technicianName?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
