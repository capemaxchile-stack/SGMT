import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { CopilotController } from './copilot.controller';
import { CopilotService } from './copilot.service';
import { CopilotToolsService } from './copilot-tools.service';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [CopilotController],
  providers: [CopilotService, CopilotToolsService],
  exports: [CopilotService, CopilotToolsService],
})
export class CopilotModule {}
