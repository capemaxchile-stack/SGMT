import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre técnico del rol es obligatorio' })
  name!: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre a mostrar es obligatorio' })
  displayName!: string;

  @IsNumber()
  @Min(1, { message: 'El nivel jerárquico debe ser mayor a 0' })
  level!: number;

  @IsOptional()
  @IsNumber()
  maxApprovalAmount?: number;
}

export class ModulePermissionItemDto {
  @IsString()
  @IsNotEmpty()
  module!: string;

  @IsBoolean()
  canRead!: boolean;

  @IsBoolean()
  canWrite!: boolean;

  @IsBoolean()
  canApprove!: boolean;

  @IsBoolean()
  canAdmin!: boolean;
}

export class UpdateRolePermissionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModulePermissionItemDto)
  permissions!: ModulePermissionItemDto[];
}
