import { Module } from '@nestjs/common';
import { FaenasService } from './faenas.service';
import { FaenasController } from './faenas.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FaenasController],
  providers: [FaenasService],
})
export class FaenasModule {}
