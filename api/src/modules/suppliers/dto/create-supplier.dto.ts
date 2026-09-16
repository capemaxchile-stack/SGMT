import { IsString, IsOptional } from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  businessName: string;

  @IsString()
  rut: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  address?: string;
}
