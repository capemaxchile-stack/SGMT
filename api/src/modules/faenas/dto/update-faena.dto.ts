import { PartialType } from '@nestjs/mapped-types';
import { CreateFaenaDto } from './create-faena.dto';

export class UpdateFaenaDto extends PartialType(CreateFaenaDto) {}
