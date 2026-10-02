import { IsArray, IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  name: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @IsArray()
  @IsUUID('4', { each: true, message: 'Identificadores de rol inválidos' })
  roleIds: string[];

  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'La clave de súper usuario debe tener al menos 6 caracteres' })
  superKey?: string;
}
