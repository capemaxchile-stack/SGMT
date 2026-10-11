import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { BudgetService } from './budget.service';
import { UpsertBudgetDto, FilterBudgetDto } from './dto/budget.dto';

@Controller('purchases/budgets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  @Post()
  @Roles('JEFE_FAENA', 'GERENTE_OPERACIONES', 'GERENTE_ADMIN_FINANZAS', 'SUPER_USUARIO', 'ADMIN_SISTEMA')
  async upsertBudget(@Body() dto: UpsertBudgetDto) {
    return this.budgetService.upsertBudget(dto);
  }

  @Get()
  @Roles('JEFE_FAENA', 'GERENTE_OPERACIONES', 'GERENTE_ADMIN_FINANZAS', 'CONTADOR', 'SUPER_USUARIO', 'ADMIN_SISTEMA')
  async findAll(@Query() query: FilterBudgetDto) {
    return this.budgetService.findAll(query);
  }

  @Get('summary/:faenaId')
  @Roles('JEFE_FAENA', 'GERENTE_OPERACIONES', 'GERENTE_ADMIN_FINANZAS', 'CONTADOR', 'COMPRADOR', 'SUPER_USUARIO', 'ADMIN_SISTEMA')
  async getBudgetSummary(
    @Param('faenaId') faenaId: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const parsedYear = year ? parseInt(year, 10) : undefined;
    const parsedMonth = month ? parseInt(month, 10) : undefined;
    return this.budgetService.getBudgetSummary(faenaId, parsedYear, parsedMonth);
  }
}
