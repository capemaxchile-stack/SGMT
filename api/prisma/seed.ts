import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // 1. Roles
  const rolesData = [
    { name: 'SOLICITANTE_TERRENO', displayName: 'Solicitante Terreno', level: 1 },
    { name: 'BODEGUERO', displayName: 'Bodeguero', level: 1 },
    { name: 'SUPERVISOR_BODEGA', displayName: 'Supervisor Bodega', level: 2 },
    { name: 'COMPRADOR', displayName: 'Comprador', level: 2 },
    { name: 'JEFE_FAENA', displayName: 'Jefe de Faena', level: 3, maxApprovalAmount: 1000000 },
    { name: 'GERENTE_OPERACIONES', displayName: 'Gerente de Operaciones', level: 4, maxApprovalAmount: 5000000 },
    { name: 'GERENTE_ADMIN_FINANZAS', displayName: 'Gerente Admin Finanzas', level: 5, maxApprovalAmount: 10000000 },
    { name: 'CONTADOR', displayName: 'Contador', level: 2 },
    { name: 'SUPER_USUARIO', displayName: 'Super Usuario', level: 99 },
    { name: 'ADMIN_SISTEMA', displayName: 'Admin Sistema', level: 100 },
  ];

  const roles: Record<string, Role> = {};
  for (const r of rolesData) {
    roles[r.name] = await prisma.role.upsert({
      where: { name: r.name },
      update: {},
      create: r,
    });
  }

  // 2. Users
  const adminPassword = await bcrypt.hash('admin123', 12);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@sgmt.local' },
    update: {},
    create: {
      email: 'admin@sgmt.local',
      name: 'System Admin',
      passwordHash: adminPassword,
      roles: {
        create: [{ roleId: roles['ADMIN_SISTEMA'].id }]
      }
    },
  });

  const superPassword = await bcrypt.hash('super123', 12);
  const superKeyHash = await bcrypt.hash('super_auth_2026', 12);
  const superUser = await prisma.user.upsert({
    where: { email: 'super@sgmt.local' },
    update: {},
    create: {
      email: 'super@sgmt.local',
      name: 'Super User',
      passwordHash: superPassword,
      superKeyHash: superKeyHash,
      roles: {
        create: [{ roleId: roles['SUPER_USUARIO'].id }]
      }
    },
  });

  const basePassword = await bcrypt.hash('password123', 12);
  
  await prisma.user.upsert({
    where: { email: 'comprador@sgmt.local' },
    update: {},
    create: {
      email: 'comprador@sgmt.local',
      name: 'Juan Comprador',
      passwordHash: basePassword,
      roles: { create: [{ roleId: roles['COMPRADOR'].id }] }
    }
  });

  await prisma.user.upsert({
    where: { email: 'bodeguero@sgmt.local' },
    update: {},
    create: {
      email: 'bodeguero@sgmt.local',
      name: 'Pedro Bodeguero',
      passwordHash: basePassword,
      roles: { create: [{ roleId: roles['BODEGUERO'].id }] }
    }
  });

  await prisma.user.upsert({
    where: { email: 'jefefaena@sgmt.local' },
    update: {},
    create: {
      email: 'jefefaena@sgmt.local',
      name: 'Carlos Jefe Faena',
      passwordHash: basePassword,
      roles: { create: [{ roleId: roles['JEFE_FAENA'].id }] }
    }
  });

  // 3. Warehouse
  let centralWarehouse = await prisma.warehouse.findFirst({
    where: { name: 'Bodega Central' },
  });
  if (!centralWarehouse) {
    centralWarehouse = await prisma.warehouse.create({
      data: {
        name: 'Bodega Central',
        location: 'Santiago',
        type: 'CENTRAL',
      },
    });
  }

  // 4. Items
  const itemsData = [
    { code: 'ITM-001', description: 'Diesel', unitOfMeasure: 'L', category: 'COMBUSTIBLE', minimumStock: 1000 },
    { code: 'ITM-002', description: 'Aceite Hidráulico', unitOfMeasure: 'L', category: 'LUBRICANTE', minimumStock: 200 },
    { code: 'ITM-003', description: 'Filtro de Aceite', unitOfMeasure: 'UN', category: 'REPUESTO', minimumStock: 50 },
    { code: 'ITM-004', description: 'Grasa Multipropósito', unitOfMeasure: 'KG', category: 'LUBRICANTE', minimumStock: 100 },
    { code: 'ITM-005', description: 'Pernos 1/2"', unitOfMeasure: 'UN', category: 'FERRETERIA', minimumStock: 500 },
  ];

  for (const item of itemsData) {
    await prisma.item.upsert({
      where: { code: item.code },
      update: {},
      create: item,
    });
  }

  // 4.1 Initial Stock in Bodega Central
  const stockSeed = [
    { code: 'ITM-001', quantity: 15000, averageCost: 1050 }, // 15,000 Liters Diesel
    { code: 'ITM-002', quantity: 800, averageCost: 4800 },   // 800 Liters Aceite Hidráulico
    { code: 'ITM-003', quantity: 60, averageCost: 18500 },   // 60 Filtros de Aceite
    { code: 'ITM-004', quantity: 250, averageCost: 3500 },   // 250 KG Grasa Multipropósito
    { code: 'ITM-005', quantity: 1200, averageCost: 250 },   // 1,200 Pernos
  ];

  for (const s of stockSeed) {
    const itm = await prisma.item.findUnique({ where: { code: s.code } });
    if (itm && centralWarehouse) {
      await prisma.stock.upsert({
        where: {
          itemId_warehouseId: {
            itemId: itm.id,
            warehouseId: centralWarehouse.id,
          },
        },
        update: {},
        create: {
          itemId: itm.id,
          warehouseId: centralWarehouse.id,
          quantity: s.quantity,
          averageCost: s.averageCost,
        },
      });
    }
  }

  // 5. Supplier
  await prisma.supplier.upsert({
    where: { rut: '76.543.210-K' },
    update: {},
    create: {
      businessName: 'Proveedor Maquinarias Spa',
      rut: '76.543.210-K',
      contactName: 'Jose Proveedor',
      contactEmail: 'ventas@maquinarias.cl'
    }
  });

  // 6. Maintenance Plans
  const plansData = [
    {
      name: 'Pauta Preventiva 250 Horas (Excavadoras y Bulldozers)',
      assetType: 'EXCAVADORA' as const,
      intervalHours: 250,
      description: 'Cambio de aceite de motor, reemplazo de filtro de aceite y combustible, engrase general de pasadores y revisión de niveles.',
      checklist: [
        'Cambiar aceite de motor y filtro',
        'Cambiar filtro primario de combustible',
        'Engrasar balde, pluma y tornamesa',
        'Verificar tensión de orugas',
        'Revisar nivel de refrigerante y líquido hidráulico',
        'Inspección visual de fugas en mangueras'
      ]
    },
    {
      name: 'Pauta Preventiva 500 Horas (Maquinaria Pesada)',
      assetType: 'EXCAVADORA' as const,
      intervalHours: 500,
      description: 'Mantenimiento intermedio con cambio de filtros de aire, combustible, aceite y chequeo de mandos finales.',
      checklist: [
        'Todas las tareas de Pauta 250h',
        'Reemplazo de filtro de aire primario y secundario',
        'Cambio de filtro hidráulico de retorno',
        'Inspección de desgaste de zapatas y rodillos',
        'Comprobación de baterías y bornes de carga',
        'Muestreo de aceite para análisis de laboratorio'
      ]
    },
    {
      name: 'Pauta Preventiva 10.000 Km (Camionetas y Vehículos Livianos)',
      assetType: 'CAMIONETA' as const,
      intervalKm: 10000,
      description: 'Alineación, balanceo, cambio de aceite sintético, filtros de habitáculo y frenos.',
      checklist: [
        'Cambio de aceite de motor y filtro de aceite',
        'Cambio de filtro de aire y de polen',
        'Revisión y rotación de neumáticos',
        'Inspección de pastillas y discos de freno',
        'Revisión de amortiguadores y tren delantero'
      ]
    }
  ];

  for (const plan of plansData) {
    const existing = await prisma.maintenancePlan.findFirst({
      where: { name: plan.name }
    });
    if (!existing) {
      await prisma.maintenancePlan.create({
        data: plan
      });
    }
  }

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
