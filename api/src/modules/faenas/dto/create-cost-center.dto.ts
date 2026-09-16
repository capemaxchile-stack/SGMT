import { IsString } from 'class-validator';

export class CreateCostCenterDto {
  @IsString()
  code: string;

  @IsString()
  name: string;
}
