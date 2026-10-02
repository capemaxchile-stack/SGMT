import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { FuelController } from './fuel.controller';
import { FuelService } from './fuel.service';

@Module({
  imports: [PrismaModule],
  controllers: [FuelController],
  providers: [FuelService],
  exports: [FuelService],
})
export class FuelModule {}
