import { PartialType } from '@nestjs/mapped-types';
import { CreateOperatorCertificationDto } from './create-operator-certification.dto';

export class UpdateOperatorCertificationDto extends PartialType(CreateOperatorCertificationDto) {}
