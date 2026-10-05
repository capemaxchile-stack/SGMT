import { PartialType } from '@nestjs/mapped-types';
import { CreateAssetDocumentDto } from './create-asset-document.dto';

export class UpdateAssetDocumentDto extends PartialType(CreateAssetDocumentDto) {}
