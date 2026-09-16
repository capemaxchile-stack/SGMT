import { IsNumber, IsOptional } from 'class-validator';

export class UpdateMeterDto {
  @IsOptional()
  @IsNumber()
  currentHourmeter?: number;

  @IsOptional()
  @IsNumber()
  currentKilometrage?: number;
}
