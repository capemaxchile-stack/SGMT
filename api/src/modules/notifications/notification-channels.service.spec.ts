import { Test, TestingModule } from '@nestjs/testing';
import { NotificationChannelsService } from './notification-channels.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('NotificationChannelsService', () => {
  let service: NotificationChannelsService;
  let prismaService: any;

  beforeEach(async () => {
    prismaService = {
      systemSetting: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({ key: 'NOTIFICATION_CHANNELS_CONFIG', value: '{}' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationChannelsService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<NotificationChannelsService>(NotificationChannelsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return default config when no setting is saved', async () => {
    const config = await service.getConfig();
    expect(config.telegram.enabled).toBe(false);
    expect(config.brevo.enabled).toBe(false);
    expect(config.telegram.events.radarAlerts).toBe(true);
  });

  it('should save and update channel configurations', async () => {
    const updated = await service.updateConfig({
      telegram: {
        enabled: true,
        botToken: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
        chatId: '-100123456789',
        events: { radarAlerts: true, lowStock: true, pendingApprovals: false, abnormalFuel: true },
      },
      brevo: {
        enabled: true,
        apiKey: 'xkeysib-1234567890abcdef1234567890abcdef',
        senderEmail: 'alertas@sgmt.cl',
        senderName: 'SGMT Alertas',
        recipientEmails: ['gerencia@sgmt.cl'],
        events: { radarAlerts: true, lowStock: false, pendingApprovals: true, abnormalFuel: true },
      },
    });

    expect(prismaService.systemSetting.upsert).toHaveBeenCalled();
  });
});
