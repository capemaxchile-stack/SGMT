import { IsString, IsUUID } from 'class-validator';

export class CreateRequestDto {
  @IsString()
  requestNumber: string;

  @IsUUID()
  faenaId: string;

  @IsString()
  justification: string;
}
