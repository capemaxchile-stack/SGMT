import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PurchaseSuggestionsService } from './purchase-suggestions.service';
import { GenerateRequestFromSuggestionDto } from './dto/purchase-suggestion.dto';

@Controller('purchases/suggestions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SuggestionsController {
  constructor(private readonly suggestionsService: PurchaseSuggestionsService) {}

  @Get()
  @Roles('SOLICITANTE_TERRENO', 'BODEGUERO', 'SUPERVISOR_BODEGA', 'COMPRADOR', 'JEFE_FAENA', 'GERENTE_OPERACIONES', 'SUPER_USUARIO', 'ADMIN_SISTEMA')
  async getSuggestions(@Query('faenaId') faenaId?: string) {
    return this.suggestionsService.getSuggestions(faenaId);
  }

  @Post('generate-request')
  @Roles('SOLICITANTE_TERRENO', 'BODEGUERO', 'SUPERVISOR_BODEGA', 'COMPRADOR', 'JEFE_FAENA', 'GERENTE_OPERACIONES', 'SUPER_USUARIO', 'ADMIN_SISTEMA')
  async generateRequest(@Request() req: any, @Body() dto: GenerateRequestFromSuggestionDto) {
    return this.suggestionsService.generateRequestFromSuggestion(req.user.id, dto);
  }
}
