import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CopilotService } from './copilot.service';
import { CopilotToolsService } from './copilot-tools.service';

describe('CopilotService', () => {
  let service: CopilotService;
  let toolsService: Partial<CopilotToolsService>;

  beforeEach(async () => {
    toolsService = {
      getCriticalStock: jest.fn().mockResolvedValue({
        criticalCount: 1,
        items: [
          {
            id: 'item-1',
            code: 'FIL-01',
            description: 'Filtro de Aceite',
            totalStock: 2,
            minimumStock: 5,
            deficit: 3,
            unitOfMeasure: 'UN',
          },
        ],
      }),
      getMaintenanceRadar: jest.fn().mockResolvedValue({
        totalAlerts: 1,
        overdueCount: 1,
        alerts: [
          {
            assetNumber: 'EX-01',
            brandModel: 'CAT 336D',
            faena: 'Faena Norte',
            serviceInterval: '250h',
            nextServiceAt: 1250,
            hoursRemaining: -10,
            isOverdue: true,
          },
        ],
      }),
      getFleetStatus: jest.fn().mockResolvedValue({
        summary: { total: 5, operational: 4, underMaintenance: 1, detained: 0, operationalRate: '80%' },
        assets: [],
      }),
      getPendingApprovals: jest.fn().mockResolvedValue({
        count: 1,
        orders: [
          {
            id: 'po-1',
            orderNumber: 'OC-2026-0001',
            supplier: 'Distribuidora Maq',
            totalAmount: 500000,
            itemsCount: 2,
          },
        ],
      }),
      getFaenasFinancialSummary: jest.fn().mockResolvedValue({
        faenasCount: 1,
        faenas: [
          {
            name: 'Faena Norte',
            location: 'Antofagasta',
            totalSpent: 1200000,
            totalBudget: 5000000,
            burnPercentage: '24.0%',
            fuel: { totalLiters: 1000, totalCost: 900000 },
            maintenance: { totalCost: 300000 },
          },
        ],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CopilotService,
        { provide: CopilotToolsService, useValue: toolsService },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get<CopilotService>(CopilotService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should route critical stock query to getCriticalStock tool', async () => {
    const res = await service.processChat({ message: '¿Cuáles son los insumos en stock crítico en bodega?' }, { name: 'Admin' });
    expect(res.toolsExecuted).toContain('get_critical_stock');
    expect(res.cards).toBeDefined();
    expect(res.cards![0].type).toBe('CRITICAL_STOCK');
    expect(toolsService.getCriticalStock).toHaveBeenCalled();
  });

  it('should route maintenance query to getMaintenanceRadar tool', async () => {
    const res = await service.processChat({ message: '¿Qué máquinas tienen mantención preventiva vencida?' }, { name: 'Admin' });
    expect(res.toolsExecuted).toContain('get_maintenance_radar');
    expect(res.cards).toBeDefined();
    expect(res.cards![0].type).toBe('MAINTENANCE_RADAR');
    expect(toolsService.getMaintenanceRadar).toHaveBeenCalled();
  });

  it('should route purchase order approvals query', async () => {
    const res = await service.processChat({ message: '¿Hay órdenes de compra pendientes de aprobación?' }, { name: 'Admin' });
    expect(res.toolsExecuted).toContain('get_pending_approvals');
    expect(res.cards).toBeDefined();
    expect(res.cards![0].type).toBe('PENDING_APPROVALS');
  });

  it('should route fleet and vehicle count queries correctly', async () => {
    const res = await service.processChat({ message: '¿cuantos vehiculos tenemos?' }, { name: 'Admin' });
    expect(res.toolsExecuted).toContain('get_fleet_status');
    expect(res.cards).toBeDefined();
    expect(res.cards![0].type).toBe('FLEET_STATUS');
    expect(res.answer).toContain('5 vehículos y maquinarias');
    expect(toolsService.getFleetStatus).toHaveBeenCalled();
  });

  it('should return proactive suggestions based on live alerts', async () => {
    const suggestions = await service.getQuickSuggestions();
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].priority).toBe('high');
  });
});
