import { IsArray, IsBoolean, IsEmail, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  name?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true, message: 'Identificadores de rol inválidos' })
  roleIds?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  newPassword: string;
}

export class SetSuperKeyDto {
  @IsString()
  @MinLength(6, { message: 'La clave de súper usuario debe tener al menos 6 caracteres' })
  superKey: string;
}
