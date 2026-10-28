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
    'TERRENO',
  ];

  const demoTenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {
      enabledModules: demoModules,
    },
    create: {
      name: 'KATEI Demo Operaciones',
      enabledModules: demoModules,
      slug: 'demo',
      rut: '76.999.888-7',
      planTier: 'ENTERPRISE',
      status: 'ACTIVO',
      contactEmail: 'demo@katei.cl',
      contactPhone: '+56 9 8765 4321',
    },
  });

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

  const demoBodega = await prisma.user.upsert({
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

  const demoComprador = await prisma.user.upsert({
    where: { email: 'comprador.demo@katei.cl' },
    update: { tenantId: demoTenant.id },
    create: {
      email: 'comprador.demo@katei.cl',
      name: 'Ana Compradora Minera',
      passwordHash: demoUserPassword,
      tenantId: demoTenant.id,
      roles: {
        create: [{ roleId: roles['COMPRADOR'].id }],
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

  // Demo Warehouses
  let demoWarehouse1 = await prisma.warehouse.findFirst({
    where: { name: 'Bodega Central Faena Calama', tenantId: demoTenant.id },
  });
  if (!demoWarehouse1) {
    demoWarehouse1 = await prisma.warehouse.create({
      data: {
        name: 'Bodega Central Faena Calama',
        location: 'Calama (Cordillera Central)',
        type: 'FAENA',
        tenantId: demoTenant.id,
      },
    });
  }

  let demoWarehouse2 = await prisma.warehouse.findFirst({
    where: { name: 'Bodega Campamento La Serena', tenantId: demoTenant.id },
  });
  if (!demoWarehouse2) {
    demoWarehouse2 = await prisma.warehouse.create({
      data: {
        name: 'Bodega Campamento La Serena',
        location: 'La Serena (Autopista Norte)',
        type: 'FAENA',
        tenantId: demoTenant.id,
      },
    });
  }

  // Demo Suppliers
  const demoSuppliersData = [
    {
      rut: '91.564.000-8',
      businessName: 'Finning Chile S.A.',
      contactName: 'Gonzalo Repuestos CAT',
      contactEmail: 'ventas@finning.cl',
      contactPhone: '+56 2 2927 7000',
      address: 'Av. Eduardo Frei Montalva 6115, Renca',
      tenantId: demoTenant.id,
    },
    {
      rut: '90.732.000-5',
      businessName: 'Kaufmann S.A.',
      contactName: 'Mariana Tolvas MB',
      contactEmail: 'ventas@kaufmann.cl',
      contactPhone: '+56 2 2720 2000',
      address: 'Gladys Marín 5830, Estación Central',
      tenantId: demoTenant.id,
    },
    {
      rut: '77.234.567-1',
      businessName: 'Distribuidora Lubricantes del Norte Ltda.',
      contactName: 'Eduardo Combustibles',
      contactEmail: 'ventas@lubnorte.cl',
      contactPhone: '+56 55 241 8900',
      address: 'Parque Industrial Lote 14, Calama',
      tenantId: demoTenant.id,
    },
  ];

  const demoSuppliers = {};
  for (const s of demoSuppliersData) {
    demoSuppliers[s.rut] = await prisma.supplier.upsert({
      where: { rut: s.rut },
      update: { tenantId: demoTenant.id },
      create: s,
    });
  }

  // Demo Items
  const demoItemsData = [
    { code: 'DEMO-DSL-001', description: 'Diesel Grado Minero Ultra Bajo Azufre', unitOfMeasure: 'L', category: 'COMBUSTIBLE', minimumStock: 2000, tenantId: demoTenant.id },
    { code: 'DEMO-LUB-001', description: 'Aceite Hidráulico Shell Tellus S2 V46', unitOfMeasure: 'L', category: 'LUBRICANTE', minimumStock: 100, tenantId: demoTenant.id },
    { code: 'DEMO-LUB-002', description: 'Aceite Motor 15W-40 Mobil Delvac MX', unitOfMeasure: 'L', category: 'LUBRICANTE', minimumStock: 80, tenantId: demoTenant.id },
    { code: 'DEMO-REP-001', description: 'Filtro de Aceite Lubricante CAT 1R-1808', unitOfMeasure: 'UN', category: 'REPUESTO', minimumStock: 10, tenantId: demoTenant.id },
    { code: 'DEMO-REP-002', description: 'Filtro Primario Combustible CAT 1R-0750', unitOfMeasure: 'UN', category: 'REPUESTO', minimumStock: 8, tenantId: demoTenant.id },
    { code: 'DEMO-LUB-003', description: 'Grasa Litio Multipropósito EP-2', unitOfMeasure: 'KG', category: 'LUBRICANTE', minimumStock: 50, tenantId: demoTenant.id },
    { code: 'DEMO-REP-003', description: 'Puntas de Balde Pesado Excavadora CAT 336', unitOfMeasure: 'JGO', category: 'REPUESTO', minimumStock: 4, tenantId: demoTenant.id },
    { code: 'DEMO-REP-004', description: 'Balatas de Freno Eje Delantero Mercedes Actros', unitOfMeasure: 'JGO', category: 'REPUESTO', minimumStock: 5, tenantId: demoTenant.id },
    { code: 'DEMO-REP-005', description: 'Neumático 315/80R22.5 Faena Todo Terreno', unitOfMeasure: 'UN', category: 'REPUESTO', minimumStock: 4, tenantId: demoTenant.id },
    { code: 'DEMO-FER-001', description: 'Pernos Grado 8 para Cuchilla Motoniveladora 1"', unitOfMeasure: 'UN', category: 'FERRETERIA', minimumStock: 100, tenantId: demoTenant.id },
  ];

  const demoItems = {};
  for (const item of demoItemsData) {
    demoItems[item.code] = await prisma.item.upsert({
      where: { code: item.code },
      update: { minimumStock: item.minimumStock, tenantId: demoTenant.id },
      create: item,
    });
  }

  // Demo Stock
  const stockDefinitions = [
    { warehouseId: demoWarehouse1.id, itemCode: 'DEMO-DSL-001', qty: 8500, cost: 1050 },
    { warehouseId: demoWarehouse1.id, itemCode: 'DEMO-LUB-001', qty: 350, cost: 4800 },
    { warehouseId: demoWarehouse1.id, itemCode: 'DEMO-LUB-002', qty: 220, cost: 5200 },
    { warehouseId: demoWarehouse1.id, itemCode: 'DEMO-REP-001', qty: 25, cost: 19500 },
    { warehouseId: demoWarehouse1.id, itemCode: 'DEMO-REP-002', qty: 18, cost: 22000 },
    { warehouseId: demoWarehouse1.id, itemCode: 'DEMO-LUB-003', qty: 140, cost: 8500 },
    { warehouseId: demoWarehouse1.id, itemCode: 'DEMO-REP-003', qty: 6, cost: 85000 },
    { warehouseId: demoWarehouse1.id, itemCode: 'DEMO-REP-004', qty: 1, cost: 65000 },
    { warehouseId: demoWarehouse1.id, itemCode: 'DEMO-REP-005', qty: 8, cost: 320000 },
    { warehouseId: demoWarehouse1.id, itemCode: 'DEMO-FER-001', qty: 320, cost: 1200 },
    { warehouseId: demoWarehouse2.id, itemCode: 'DEMO-DSL-001', qty: 4200, cost: 1050 },
    { warehouseId: demoWarehouse2.id, itemCode: 'DEMO-LUB-001', qty: 150, cost: 4800 },
    { warehouseId: demoWarehouse2.id, itemCode: 'DEMO-REP-001', qty: 12, cost: 19500 },
  ];

  for (const s of stockDefinitions) {
    const item = demoItems[s.itemCode];
    if (item) {
      await prisma.stock.upsert({
        where: { itemId_warehouseId: { itemId: item.id, warehouseId: s.warehouseId } },
        update: { quantity: s.qty, averageCost: s.cost },
        create: { itemId: item.id, warehouseId: s.warehouseId, quantity: s.qty, averageCost: s.cost },
      });
    }
  }

  // Demo Assets (10 equipos y camiones)
  const demoAssetsData = [
    { internalNumber: 'EXC-001', brand: 'Caterpillar', model: '336D L', type: 'EXCAVADORA', year: 2023, currentHourmeter: 1420, currentKilometrage: 0, operationalStatus: 'OPERATIVO', faenaId: demoFaena1.id },
    { internalNumber: 'EXC-002', brand: 'Komatsu', model: 'PC490LC-11', type: 'EXCAVADORA', year: 2024, currentHourmeter: 2850, currentKilometrage: 0, operationalStatus: 'OPERATIVO', faenaId: demoFaena1.id },
    { internalNumber: 'CAM-001', brand: 'Mercedes-Benz', model: 'Actros 3344 6x4', type: 'CAMION_TOLVA', year: 2022, currentHourmeter: 2150, currentKilometrage: 48600, operationalStatus: 'OPERATIVO', licensePlate: 'KM-83-01', faenaId: demoFaena1.id },
    { internalNumber: 'CAM-002', brand: 'Volvo', model: 'FMX 440 8x4', type: 'CAMION_TOLVA', year: 2023, currentHourmeter: 1890, currentKilometrage: 35200, operationalStatus: 'OPERATIVO', licensePlate: 'VJ-44-88', faenaId: demoFaena1.id },
    { internalNumber: 'CAR-001', brand: 'Komatsu', model: 'WA380-6', type: 'CARGADOR_FRONTAL', year: 2021, currentHourmeter: 3200, currentKilometrage: 0, operationalStatus: 'EN_MANTENCION', faenaId: demoFaena2.id },
    { internalNumber: 'RET-001', brand: 'Caterpillar', model: '420F2 IT', type: 'RETROEXCAVADORA', year: 2023, currentHourmeter: 890, currentKilometrage: 0, operationalStatus: 'OPERATIVO', faenaId: demoFaena2.id },
    { internalNumber: 'ROD-001', brand: 'Bomag', model: 'BW 211 D-50', type: 'RODILLO', year: 2022, currentHourmeter: 640, currentKilometrage: 0, operationalStatus: 'OPERATIVO', faenaId: demoFaena2.id },
    { internalNumber: 'MOT-001', brand: 'Caterpillar', model: '140M', type: 'MOTONIVELADORA', year: 2021, currentHourmeter: 2410, currentKilometrage: 0, operationalStatus: 'OPERATIVO', faenaId: demoFaena2.id },
    { internalNumber: 'CT-001', brand: 'Toyota', model: 'Hilux SRV 4x4', type: 'CAMIONETA', year: 2024, currentHourmeter: 450, currentKilometrage: 18200, operationalStatus: 'OPERATIVO', licensePlate: 'TH-44-12', faenaId: demoFaena1.id },
    { internalNumber: 'CT-002', brand: 'Mitsubishi', model: 'L200 Dakar 4x4', type: 'CAMIONETA', year: 2023, currentHourmeter: 620, currentKilometrage: 26400, operationalStatus: 'OPERATIVO', licensePlate: 'ML-20-99', faenaId: demoFaena2.id },
  ];

  const demoAssets = {};
  for (const a of demoAssetsData) {
    let asset = await prisma.asset.findUnique({ where: { internalNumber: a.internalNumber } });
    if (!asset) {
      asset = await prisma.asset.create({
        data: {
          internalNumber: a.internalNumber,
          brand: a.brand,
          model: a.model,
          type: a.type,
          year: a.year,
          licensePlate: a.licensePlate || null,
          currentHourmeter: a.currentHourmeter,
          currentKilometrage: a.currentKilometrage,
          operationalStatus: a.operationalStatus,
          tenantId: demoTenant.id,
        },
      });

      await prisma.assetAssignment.create({
        data: {
          assetId: asset.id,
          faenaId: a.faenaId,
          startDate: new Date('2026-02-01'),
        },
      });
    } else {
      await prisma.asset.update({
        where: { id: asset.id },
        data: { tenantId: demoTenant.id, operationalStatus: a.operationalStatus },
      });
    }
    demoAssets[a.internalNumber] = asset;
  }

  // Demo Maintenance Plans
  const demoPlansData = [
    {
      name: 'Pauta Preventiva 250 Horas (Maquinaria Pesada)',
      assetType: 'EXCAVADORA',
      intervalHours: 250,
      description: 'Cambio de aceite de motor, reemplazo de filtros y engrase general de pasadores.',
      tenantId: demoTenant.id,
    },
    {
      name: 'Pauta Preventiva 500 Horas (Camiones Tolva)',
      assetType: 'CAMION_TOLVA',
      intervalHours: 500,
      description: 'Mantenimiento intermedio con cambio de filtros de aire, combustible, aceite y chequeo de frenos.',
      tenantId: demoTenant.id,
    },
    {
      name: 'Pauta Preventiva 10.000 Km (Vehículos Terreno)',
      assetType: 'CAMIONETA',
      intervalKm: 10000,
      description: 'Alineación, balanceo, cambio de aceite sintético, filtros de habitáculo y revisión de frenos.',
      tenantId: demoTenant.id,
    },
  ];

  for (const p of demoPlansData) {
    let plan = await prisma.maintenancePlan.findFirst({
      where: { name: p.name, tenantId: demoTenant.id },
    });
    if (!plan) {
      await prisma.maintenancePlan.create({ data: p });
    }
  }

  // Demo Work Orders (OTs)
  const demoWOs = [
    {
      otNumber: 'OT-DEMO-001',
      assetId: demoAssets['EXC-001'].id,
      faenaId: demoFaena1.id,
      type: 'PREVENTIVO',
      priority: 'MEDIA',
      status: 'COMPLETADA',
      description: 'Pauta Preventiva 250 Horas ejecutada conforme según protocolo del fabricante.',
      currentHourmeter: 1420,
      totalCost: 280000,
      technicianName: 'Rodrigo Araya (Mecánico Especialista)',
      startDate: new Date('2026-10-15T08:00:00Z'),
      completedDate: new Date('2026-10-15T14:30:00Z'),
      createdById: demoJefe.id,
      tenantId: demoTenant.id,
    },
    {
      otNumber: 'OT-DEMO-002',
      assetId: demoAssets['CAR-001'].id,
      faenaId: demoFaena2.id,
      type: 'CORRECTIVO',
      priority: 'ALTA',
      status: 'EN_PROGRESO',
      description: 'Reparación de fuga hidráulica en mangueras de presión del cilindro de levante.',
      currentHourmeter: 3200,
      totalCost: 150000,
      technicianName: 'Marcelo Tapia (Técnico Hidráulico)',
      startDate: new Date('2026-10-27T09:00:00Z'),
      createdById: demoJefe.id,
      tenantId: demoTenant.id,
    },
    {
      otNumber: 'OT-DEMO-003',
      assetId: demoAssets['CT-001'].id,
      faenaId: demoFaena1.id,
      type: 'PREVENTIVO',
      priority: 'MEDIA',
      status: 'ABIERTA',
      description: 'Pauta Preventiva 10.000 Km programada para camioneta de supervisión.',
      currentKilometrage: 18200,
      createdById: demoJefe.id,
      tenantId: demoTenant.id,
    },
  ];

  for (const wo of demoWOs) {
    await prisma.workOrder.upsert({
      where: { otNumber: wo.otNumber },
      update: { tenantId: demoTenant.id, status: wo.status },
      create: wo,
    });
  }

  // Demo Asset Documents & Certifications
  const nowTime = new Date();
  const demoDocs = [
    {
      assetId: demoAssets['CT-001'].id,
      docType: 'REVISION_TECNICA',
      documentNumber: 'RT-2026-4412',
      issuingEntity: 'Planta Revisión Técnica SGS Calama',
      expirationDate: new Date(nowTime.getTime() + 180 * 24 * 60 * 60 * 1000),
      isMandatory: true,
      createdById: demoJefe.id,
      tenantId: demoTenant.id,
    },
    {
      assetId: demoAssets['EXC-001'].id,
      docType: 'CERTIFICACION_ESTRUCTURAL',
      documentNumber: 'CERT-SERNAGEOMIN-336D',
      issuingEntity: 'Sernageomin / Inspectoría Técnica',
      expirationDate: new Date(nowTime.getTime() + 90 * 24 * 60 * 60 * 1000),
      isMandatory: true,
      createdById: demoJefe.id,
      tenantId: demoTenant.id,
    },
    {
      assetId: demoAssets['CAM-001'].id,
      docType: 'CERTIFICACION_ESTRUCTURAL',
      documentNumber: 'TOLVA-INSPECCION-2026',
      issuingEntity: 'Bureau Veritas Chile',
      expirationDate: new Date(nowTime.getTime() + 14 * 24 * 60 * 60 * 1000),
      isMandatory: true,
      createdById: demoJefe.id,
      tenantId: demoTenant.id,
    },
  ];

  for (const doc of demoDocs) {
    const existing = await prisma.assetDocument.findFirst({
      where: { assetId: doc.assetId, docType: doc.docType, tenantId: demoTenant.id },
    });
    if (!existing) {
      await prisma.assetDocument.create({ data: doc });
    }
  }

  // Demo Purchase Request (Solicitud para aprobar en vivo)
  const existingPR = await prisma.purchaseRequest.findUnique({
    where: { requestNumber: 'SOL-DEMO-001' },
  });
  if (!existingPR) {
    const prItem = demoItems['DEMO-REP-004'];
    await prisma.purchaseRequest.create({
      data: {
        requestNumber: 'SOL-DEMO-001',
        status: 'PENDIENTE',
        justification: 'Reposición urgente de balatas de tolva para mantenimiento de flota pesada en faena Cordillera.',
        faenaId: demoFaena1.id,
        requesterId: demoJefe.id,
        tenantId: demoTenant.id,
        lines: {
          create: [
            {
              itemId: prItem.id,
              quantity: 4,
              urgency: 'ALTA',
              notes: 'Stock actual en bodega bajo mínimo crítico (1 unidad restante)',
            },
          ],
        },
      },
    });
  }

  // Demo Purchase Order
  const supLub = demoSuppliers['77.234.567-1'];
  if (supLub) {
    await prisma.purchaseOrder.upsert({
      where: { orderNumber: 'OC-DEMO-001' },
      update: { tenantId: demoTenant.id },
      create: {
        orderNumber: 'OC-DEMO-001',
        status: 'APROBADA',
        totalAmount: 960000,
        supplierId: supLub.id,
        faenaId: demoFaena1.id,
        deliveryTerms: 'Despacho directo en bodega de Faena Calama',
        tenantId: demoTenant.id,
      },
    });
  }

  // Demo Fuel Logs
  const existingFuel1 = await prisma.fuelLog.findUnique({ where: { dispatchNumber: 'TK-DEMO-001' } });
  if (!existingFuel1) {
    await prisma.fuelLog.create({
      data: {
        dispatchNumber: 'TK-DEMO-001',
        assetId: demoAssets['EXC-001'].id,
        faenaId: demoFaena1.id,
        warehouseId: demoWarehouse1.id,
        liters: 450,
        unitPrice: 1050,
        totalCost: 472500,
        previousHourmeter: 1410,
        currentHourmeter: 1420,
        hourmeterDelta: 10,
        litersPerHour: 45,
        operatorName: 'Juan Carlos Pérez',
        fuelTruckPlate: 'CA-ALJ-04',
        tenantId: demoTenant.id,
      },
    });
  }

  const existingFuel2 = await prisma.fuelLog.findUnique({ where: { dispatchNumber: 'TK-DEMO-002' } });
  if (!existingFuel2) {
    await prisma.fuelLog.create({
      data: {
        dispatchNumber: 'TK-DEMO-002',
        assetId: demoAssets['CAM-001'].id,
        faenaId: demoFaena1.id,
        warehouseId: demoWarehouse1.id,
        liters: 280,
        unitPrice: 1050,
        totalCost: 294000,
        previousKilometrage: 48320,
        currentKilometrage: 48600,
        kilometrageDelta: 280,
        kmPerLiter: 1,
        operatorName: 'Mario Soto Gómez',
        fuelTruckPlate: 'CA-ALJ-04',
        tenantId: demoTenant.id,
      },
    });
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
