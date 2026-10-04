import { Controller, Post, Get, Body, UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { CopilotService } from './copilot.service';
import { ChatRequestDto } from './dto/chat-request.dto';

@Controller('copilot')
@UseGuards(JwtAuthGuard)
@UseInterceptors(AuditInterceptor)
export class CopilotController {
  constructor(private readonly copilotService: CopilotService) {}

  @Post('chat')
  async chat(@Body() dto: ChatRequestDto, @CurrentUser() user: any) {
    return this.copilotService.processChat(dto, user);
  }

  @Get('suggestions')
  async getSuggestions() {
    return this.copilotService.getQuickSuggestions();
  }
}
