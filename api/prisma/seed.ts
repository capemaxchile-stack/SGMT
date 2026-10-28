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

  // Baseline Modules
  const modulesList = [
    'DASHBOARD',
    'FAENAS',
    'FLOTA',
    'CERTIFICACIONES',
    'MANTENIMIENTO',
    'COMBUSTIBLE',
    'BODEGA',
    'COMPRAS',
    'REPORTES',
    'ADMINISTRACION',
  ];

  const getDefaultPerms = (roleName: string, mod: string) => {
    if (roleName === 'ADMIN_SISTEMA' || roleName === 'SUPER_USUARIO') {
      return { canRead: true, canWrite: true, canApprove: true, canAdmin: true };
    }
    if (roleName === 'GERENTE_OPERACIONES') {
      if (mod === 'ADMINISTRACION') return { canRead: false, canWrite: false, canApprove: false, canAdmin: false };
      return { canRead: true, canWrite: true, canApprove: true, canAdmin: false };
    }
    if (roleName === 'GERENTE_ADMIN_FINANZAS') {
      if (['DASHBOARD', 'COMPRAS', 'REPORTES', 'BODEGA'].includes(mod)) {
        return { canRead: true, canWrite: true, canApprove: true, canAdmin: false };
      }
      return { canRead: true, canWrite: false, canApprove: false, canAdmin: false };
    }
    if (roleName === 'JEFE_FAENA') {
      if (['DASHBOARD', 'FAENAS', 'CERTIFICACIONES', 'MANTENIMIENTO', 'COMBUSTIBLE'].includes(mod)) {
        return { canRead: true, canWrite: true, canApprove: true, canAdmin: false };
      }
      if (['BODEGA', 'COMPRAS'].includes(mod)) {
        return { canRead: true, canWrite: true, canApprove: true, canAdmin: false };
      }
      if (mod === 'REPORTES' || mod === 'FLOTA') {
        return { canRead: true, canWrite: false, canApprove: false, canAdmin: false };
      }
      return { canRead: false, canWrite: false, canApprove: false, canAdmin: false };
    }
    if (roleName === 'BODEGUERO') {
      if (['DASHBOARD', 'BODEGA', 'COMBUSTIBLE'].includes(mod)) {
        return { canRead: true, canWrite: true, canApprove: false, canAdmin: false };
      }
      if (mod === 'COMPRAS') {
        return { canRead: true, canWrite: false, canApprove: false, canAdmin: false };
      }
      return { canRead: false, canWrite: false, canApprove: false, canAdmin: false };
    }
    if (roleName === 'SUPERVISOR_BODEGA') {
      if (['DASHBOARD', 'BODEGA', 'COMBUSTIBLE'].includes(mod)) {
        return { canRead: true, canWrite: true, canApprove: true, canAdmin: false };
      }
      if (mod === 'COMPRAS') {
        return { canRead: true, canWrite: true, canApprove: false, canAdmin: false };
      }
      return { canRead: false, canWrite: false, canApprove: false, canAdmin: false };
    }
    if (roleName === 'COMPRADOR') {
      if (mod === 'COMPRAS' || mod === 'DASHBOARD') {
        return { canRead: true, canWrite: true, canApprove: false, canAdmin: false };
      }
      if (mod === 'BODEGA') {
        return { canRead: true, canWrite: false, canApprove: false, canAdmin: false };
      }
      return { canRead: false, canWrite: false, canApprove: false, canAdmin: false };
    }
    if (roleName === 'CONTADOR') {
      if (['DASHBOARD', 'REPORTES', 'COMPRAS', 'BODEGA'].includes(mod)) {
        return { canRead: true, canWrite: false, canApprove: false, canAdmin: false };
      }
      return { canRead: false, canWrite: false, canApprove: false, canAdmin: false };
    }
    if (roleName === 'SOLICITANTE_TERRENO') {
      if (mod === 'COMPRAS') {
        return { canRead: true, canWrite: true, canApprove: false, canAdmin: false };
      }
      if (mod === 'BODEGA') {
        return { canRead: true, canWrite: false, canApprove: false, canAdmin: false };
      }
      return { canRead: false, canWrite: false, canApprove: false, canAdmin: false };
    }
    return { canRead: false, canWrite: false, canApprove: false, canAdmin: false };
  };

  for (const r of rolesData) {
    const roleRecord = roles[r.name];
    for (const mod of modulesList) {
      const perms = getDefaultPerms(r.name, mod);
      await (prisma as any).rolePermission.upsert({
        where: {
          roleId_module: {
            roleId: roleRecord.id,
            module: mod,
          },
        },
        update: perms,
        create: {
          roleId: roleRecord.id,
          module: mod,
          ...perms,
        },
      });
    }
  }

  // 2. Users
  const adminPassword = await bcrypt.hash('admin123', 12);
  const kateiAdminPassword = await bcrypt.hash('Admin123!', 12);

  // Super / Admin accounts
  await prisma.user.upsert({
    where: { email: 'admin@katei.cl' },
    update: {},
    create: {
      email: 'admin@katei.cl',
      name: 'Super Admin KATEI',
      passwordHash: kateiAdminPassword,
      roles: {
        create: [{ roleId: roles['SUPER_USUARIO'].id }, { roleId: roles['ADMIN_SISTEMA'].id }],
      },
    },
  });

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
  // 4. Items (20 Master Spare Parts & Consumables)
  const itemsData = [
    { code: 'ITM-001', description: 'Diesel Ultra Bajo Azufre', unitOfMeasure: 'L', category: 'COMBUSTIBLE', minimumStock: 2000 },
    { code: 'ITM-002', description: 'Aceite Hidráulico ISO VG 68', unitOfMeasure: 'L', category: 'LUBRICANTE', minimumStock: 200 },
    { code: 'ITM-003', description: 'Filtro de Aceite Motor Heavy Duty', unitOfMeasure: 'UN', category: 'REPUESTO', minimumStock: 30 },
    { code: 'ITM-004', description: 'Grasa Multipropósito Litio EP2', unitOfMeasure: 'KG', category: 'LUBRICANTE', minimumStock: 100 },
    { code: 'ITM-005', description: 'Pernos Grado 8 1/2" x 2" con Tuerca', unitOfMeasure: 'UN', category: 'FERRETERIA', minimumStock: 500 },
    { code: 'ITM-006', description: 'Filtro de Combustible Primario Racor', unitOfMeasure: 'UN', category: 'REPUESTO', minimumStock: 25 },
    { code: 'ITM-007', description: 'Filtro de Aire Primario Radial Seal', unitOfMeasure: 'UN', category: 'REPUESTO', minimumStock: 20 },
    { code: 'ITM-008', description: 'Filtro Hidráulico de Retorno', unitOfMeasure: 'UN', category: 'REPUESTO', minimumStock: 15 },
    { code: 'ITM-009', description: 'Aceite Motor 15W40 CI-4 Heavy Duty', unitOfMeasure: 'L', category: 'LUBRICANTE', minimumStock: 400 },
    { code: 'ITM-010', description: 'Refrigerante 50/50 Larga Duración', unitOfMeasure: 'L', category: 'LUBRICANTE', minimumStock: 150 },
    { code: 'ITM-011', description: 'Correa Trapezoidal Alternador/Bomba', unitOfMeasure: 'UN', category: 'REPUESTO', minimumStock: 10 },
    { code: 'ITM-012', description: 'Juego Pastillas de Freno Delanteras', unitOfMeasure: 'JGO', category: 'REPUESTO', minimumStock: 8 },
    { code: 'ITM-013', description: 'Manguera Hidráulica 1/2" 5000 PSI', unitOfMeasure: 'MT', category: 'REPUESTO', minimumStock: 50 },
    { code: 'ITM-014', description: 'Dientes / Calzas Balde Excavadora 320', unitOfMeasure: 'UN', category: 'REPUESTO', minimumStock: 24 },
    { code: 'ITM-015', description: 'Pasador Balde 80mm Acero Templado', unitOfMeasure: 'UN', category: 'REPUESTO', minimumStock: 6 },
    { code: 'ITM-016', description: 'Bomba de Agua Motor Diesel', unitOfMeasure: 'UN', category: 'REPUESTO', minimumStock: 4 },
    { code: 'ITM-017', description: 'Termostato Motor 82°C', unitOfMeasure: 'UN', category: 'REPUESTO', minimumStock: 6 },
    { code: 'ITM-018', description: 'Batería 12V 100Ah 850CCA Libre Mantención', unitOfMeasure: 'UN', category: 'ELECTRICO', minimumStock: 8 },
    { code: 'ITM-019', description: 'Foco Faena LED 48W 12-24V IP68', unitOfMeasure: 'UN', category: 'ELECTRICO', minimumStock: 12 },
    { code: 'ITM-020', description: 'Abrazadera Sinfín Inoxidable 2"-3"', unitOfMeasure: 'UN', category: 'FERRETERIA', minimumStock: 100 },
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
    { code: 'ITM-001', quantity: 15000, averageCost: 1050 },
    { code: 'ITM-002', quantity: 800, averageCost: 4800 },
    { code: 'ITM-003', quantity: 50, averageCost: 18500 },
    { code: 'ITM-004', quantity: 250, averageCost: 3500 },
    { code: 'ITM-005', quantity: 1200, averageCost: 350 },
    { code: 'ITM-006', quantity: 40, averageCost: 22000 },
    { code: 'ITM-007', quantity: 30, averageCost: 35000 },
    { code: 'ITM-008', quantity: 20, averageCost: 42000 },
    { code: 'ITM-009', quantity: 600, averageCost: 5200 },
    { code: 'ITM-010', quantity: 200, averageCost: 3800 },
    { code: 'ITM-011', quantity: 15, averageCost: 12000 },
    { code: 'ITM-012', quantity: 12, averageCost: 45000 },
    { code: 'ITM-013', quantity: 80, averageCost: 14000 },
    { code: 'ITM-014', quantity: 36, averageCost: 28000 },
    { code: 'ITM-015', quantity: 8, averageCost: 65000 },
    { code: 'ITM-016', quantity: 4, averageCost: 110000 },
    { code: 'ITM-017', quantity: 8, averageCost: 19500 },
    { code: 'ITM-018', quantity: 10, averageCost: 89000 },
    { code: 'ITM-019', quantity: 20, averageCost: 15000 },
    { code: 'ITM-020', quantity: 150, averageCost: 1200 },
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

  // 5. Suppliers & Catalog
  const sup1 = await prisma.supplier.upsert({
    where: { rut: '76.543.210-K' },
    update: {},
    create: {
      businessName: 'Proveedor Maquinarias Spa',
      rut: '76.543.210-K',
      contactName: 'Jose Proveedor',
      contactEmail: 'ventas@maquinarias.cl'
    }
  });

  const sup2 = await prisma.supplier.upsert({
    where: { rut: '77.123.456-7' },
    update: {},
    create: {
      businessName: 'Filtros & Repuestos Mineros Ltda.',
      rut: '77.123.456-7',
      contactName: 'Claudio Repuestos',
      contactEmail: 'ventas@filtrosmineros.cl'
    }
  });

  const itemFiltro = await prisma.item.findUnique({ where: { code: 'ITM-003' } });
  const itemAceite = await prisma.item.findUnique({ where: { code: 'ITM-002' } });

  if (itemFiltro && sup1 && sup2) {
    await prisma.supplierCatalog.upsert({
      where: {
        supplierId_itemId: { supplierId: sup1.id, itemId: itemFiltro.id },
      },
      update: {},
      create: {
        supplierId: sup1.id,
        itemId: itemFiltro.id,
        isExclusive: false,
        supplierPartNumber: 'FILT-MAQ-250',
        lastPrice: 19500,
        leadTimeDays: 3,
        notes: 'Distribuidor estándar de filtros pesados',
      },
    });

    await prisma.supplierCatalog.upsert({
      where: {
        supplierId_itemId: { supplierId: sup2.id, itemId: itemFiltro.id },
      },
      update: {},
      create: {
        supplierId: sup2.id,
        itemId: itemFiltro.id,
        isExclusive: false,
        supplierPartNumber: 'FM-OF-33',
        lastPrice: 18200,
        leadTimeDays: 2,
        notes: 'Proveedor especializado con stock local',
      },
    });
  }

  if (itemAceite && sup1) {
    await prisma.supplierCatalog.upsert({
      where: {
        supplierId_itemId: { supplierId: sup1.id, itemId: itemAceite.id },
      },
      update: {},
      create: {
        supplierId: sup1.id,
        itemId: itemAceite.id,
        isExclusive: true, // Exclusive supplier
        supplierPartNumber: 'OIL-HIDRO-ISO68',
        lastPrice: 4800,
        leadTimeDays: 5,
        notes: 'Proveedor exclusivo autorizado por fabricante de maquinaria',
      },
    });
  }

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

  // 7. Demo Tenant & Realistic Showroom Data
  console.log('Seeding Demo Tenant (demo.katei.cl)...');
  const demoTenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      name: 'KATEI Demo Operaciones',
      slug: 'demo',
      rut: '76.999.888-7',
      planTier: 'ENTERPRISE',
      status: 'ACTIVO',
      contactEmail: 'demo@katei.cl',
      contactPhone: '+56 9 8765 4321',
    },
  });

  const demoModules = [
    'DASHBOARD',
    'FAENAS',
    'FLOTA',
    'CERTIFICACIONES',
    'MANTENIMIENTO',
    'COMBUSTIBLE',
    'BODEGA',
    'COMPRAS',
    'REPORTES',
    'ADMINISTRACION',
    'COPILOT',
  ];

  for (const mod of demoModules) {
    await prisma.tenantModuleConfig.upsert({
      where: {
        tenantId_module: {
          tenantId: demoTenant.id,
          module: mod as any,
        },
      },
      update: { isEnabled: true },
      create: {
        tenantId: demoTenant.id,
        module: mod as any,
        isEnabled: true,
      },
    });
  }

  // Demo Users (Password: Demo2026!)
  const demoUserPassword = await bcrypt.hash('Demo2026!', 12);

  const demoAdmin = await prisma.user.upsert({
    where: { email: 'demo@katei.cl' },
    update: { tenantId: demoTenant.id },
    create: {
      email: 'demo@katei.cl',
      name: 'Administrador Demo',
      passwordHash: demoUserPassword,
      tenantId: demoTenant.id,
      roles: {
        create: [{ roleId: roles['ADMIN_SISTEMA'].id }],
      },
    },
  });

  const demoJefe = await prisma.user.upsert({
    where: { email: 'jefe@katei.cl' },
    update: { tenantId: demoTenant.id },
    create: {
      email: 'jefe@katei.cl',
      name: 'Carlos Jefe Terreno',
      passwordHash: demoUserPassword,
      tenantId: demoTenant.id,
      roles: {
        create: [{ roleId: roles['JEFE_FAENA'].id }],
      },
    },
  });

  await prisma.user.upsert({
    where: { email: 'bodega@katei.cl' },
    update: { tenantId: demoTenant.id },
    create: {
      email: 'bodega@katei.cl',
      name: 'Pedro Bodega Central',
      passwordHash: demoUserPassword,
      tenantId: demoTenant.id,
      roles: {
        create: [{ roleId: roles['BODEGUERO'].id }],
      },
    },
  });

  // Demo Faenas
  let demoFaena1 = await prisma.faena.findFirst({
    where: { name: 'Faena Minera Cordillera Central', tenantId: demoTenant.id },
  });
  if (!demoFaena1) {
    demoFaena1 = await prisma.faena.create({
      data: {
        tenantId: demoTenant.id,
        name: 'Faena Minera Cordillera Central',
        location: 'Calama, Región de Antofagasta',
        status: 'ACTIVA',
        startDate: new Date('2026-01-15'),
        chiefId: demoJefe.id,
      },
    });
  }

  let demoFaena2 = await prisma.faena.findFirst({
    where: { name: 'Proyecto Vial Autopista Norte', tenantId: demoTenant.id },
  });
  if (!demoFaena2) {
    demoFaena2 = await prisma.faena.create({
      data: {
        tenantId: demoTenant.id,
        name: 'Proyecto Vial Autopista Norte',
        location: 'La Serena, Región de Coquimbo',
        status: 'ACTIVA',
        startDate: new Date('2026-03-01'),
        chiefId: demoJefe.id,
      },
    });
  }

  // Demo Assets
  const demoAssets = [
    {
      internalNumber: 'EXC-001',
      brand: 'Caterpillar',
      model: '336D L',
      type: 'EXCAVADORA' as const,
      year: 2023,
      currentHourmeter: 1420,
      operationalStatus: 'OPERATIVO' as const,
      tenantId: demoTenant.id,
      faenaId: demoFaena1.id,
    },
    {
      internalNumber: 'CAM-001',
      brand: 'Mercedes-Benz',
      model: 'Actros 3344 6x4',
      type: 'CAMION_TOLVA' as const,
      year: 2022,
      currentHourmeter: 2150,
      currentKilometrage: 48600,
      operationalStatus: 'OPERATIVO' as const,
      tenantId: demoTenant.id,
      faenaId: demoFaena1.id,
    },
    {
      internalNumber: 'CAR-001',
      brand: 'Komatsu',
      model: 'WA380-6',
      type: 'CARGADOR_FRONTAL' as const,
      year: 2021,
      currentHourmeter: 3200,
      operationalStatus: 'EN_MANTENCION' as const,
      tenantId: demoTenant.id,
      faenaId: demoFaena2.id,
    },
    {
      internalNumber: 'CT-001',
      brand: 'Toyota',
      model: 'Hilux SRV 4x4',
      type: 'CAMIONETA' as const,
      year: 2024,
      currentHourmeter: 450,
      currentKilometrage: 18200,
      operationalStatus: 'OPERATIVO' as const,
      tenantId: demoTenant.id,
      faenaId: demoFaena1.id,
    },
  ];

  for (const a of demoAssets) {
    const existing = await prisma.asset.findUnique({
      where: { internalNumber: a.internalNumber },
    });
    if (!existing) {
      const createdAsset = await prisma.asset.create({
        data: {
          internalNumber: a.internalNumber,
          brand: a.brand,
          model: a.model,
          type: a.type,
          year: a.year,
          currentHourmeter: a.currentHourmeter,
          currentKilometrage: a.currentKilometrage || 0,
          operationalStatus: a.operationalStatus,
          tenantId: a.tenantId,
        },
      });

      await prisma.assetAssignment.create({
        data: {
          assetId: createdAsset.id,
          faenaId: a.faenaId,
          startDate: new Date('2026-02-01'),
        },
      });
    }
  }

  // Demo Warehouse
  let demoWarehouse = await prisma.warehouse.findFirst({
    where: { name: 'Bodega Principal Faena', tenantId: demoTenant.id },
  });
  if (!demoWarehouse) {
    demoWarehouse = await prisma.warehouse.create({
      data: {
        name: 'Bodega Principal Faena',
        location: 'Calama (Cordillera Central)',
        type: 'FAENA',
        tenantId: demoTenant.id,
        },
    });

    const firstItems = await prisma.item.findMany({ take: 8 });
    for (const itm of firstItems) {
      await prisma.stock.create({
        data: {
          itemId: itm.id,
          warehouseId: demoWarehouse.id,
          quantity: 25,
          averageCost: 15000,
        },
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
