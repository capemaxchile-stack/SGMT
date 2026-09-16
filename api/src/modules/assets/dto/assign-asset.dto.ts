import { IsString, IsDateString } from 'class-validator';

export class AssignAssetDto {
  @IsString()
  faenaId: string;

  @IsDateString()
  startDate: string;
}
