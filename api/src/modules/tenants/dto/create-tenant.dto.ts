import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray, IsInt, Min, IsEmail } from 'class-validator';
import { TenantPlanTier, TenantStatus } from '@prisma/client';

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la empresa es obligatorio' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'El identificador/slug es obligatorio' })
  slug: string;

  @IsOptional()
  @IsString()
  rut?: string;

  @IsOptional()
  @IsEnum(TenantPlanTier)
  planTier?: TenantPlanTier = TenantPlanTier.PRO;

  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus = TenantStatus.ACTIVO;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledModules?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUsers?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxAssets?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxFaenas?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxMonthlyEmails?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxMonthlyMessages?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxMonthlyAiTokens?: number;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El correo de contacto no es válido' })
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  billingNotes?: string;
}
