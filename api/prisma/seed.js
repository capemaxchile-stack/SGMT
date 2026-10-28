const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

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

  const roles = {};
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

  const getDefaultPerms = (roleName, mod) => {
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
      await prisma.rolePermission.upsert({
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

  await prisma.user.upsert({
    where: { email: 'admin@sgmt.local' },
    update: {},
    create: {
      email: 'admin@sgmt.local',
      name: 'System Admin',
      passwordHash: adminPassword,
      roles: {
        create: [{ roleId: roles['ADMIN_SISTEMA'].id }],
      },
    },
  });

  const superPassword = await bcrypt.hash('super123', 12);
  const superKeyHash = await bcrypt.hash('super_auth_2026', 12);
  await prisma.user.upsert({
    where: { email: 'super@sgmt.local' },
    update: {},
    create: {
      email: 'super@sgmt.local',
      name: 'Super User',
      passwordHash: superPassword,
      superKeyHash: superKeyHash,
      roles: {
        create: [{ roleId: roles['SUPER_USUARIO'].id }],
      },
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
      roles: { create: [{ roleId: roles['COMPRADOR'].id }] },
    },
  });

  await prisma.user.upsert({
    where: { email: 'bodeguero@sgmt.local' },
    update: {},
    create: {
      email: 'bodeguero@sgmt.local',
      name: 'Pedro Bodeguero',
      passwordHash: basePassword,
      roles: { create: [{ roleId: roles['BODEGUERO'].id }] },
    },
  });

  await prisma.user.upsert({
    where: { email: 'jefefaena@sgmt.local' },
    update: {},
    create: {
      email: 'jefefaena@sgmt.local',
      name: 'Carlos Jefe Faena',
      passwordHash: basePassword,
      roles: { create: [{ roleId: roles['JEFE_FAENA'].id }] },
    },
  });

  // 3. Warehouse
  await prisma.warehouse.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Bodega Central',
      location: 'Santiago',
      type: 'CENTRAL',
    },
  });

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

  // 5. Supplier
  await prisma.supplier.upsert({
    where: { rut: '76.543.210-K' },
    update: {},
    create: {
      businessName: 'Proveedor Maquinarias Spa',
      rut: '76.543.210-K',
      contactName: 'Jose Proveedor',
      contactEmail: 'ventas@maquinarias.cl',
    },
  });

  // 6. Demo Tenant & Realistic Showroom Data
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
      address: 'Av. Las Condes 12400, Santiago',
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
          module: mod,
        },
      },
      update: { isEnabled: true },
      create: {
        tenantId: demoTenant.id,
        module: mod,
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
      type: 'EXCAVADORA',
      year: 2023,
      currentHourmeter: 1420,
      operationalStatus: 'OPERATIVO',
      tenantId: demoTenant.id,
      faenaId: demoFaena1.id,
    },
    {
      internalNumber: 'CAM-001',
      brand: 'Mercedes-Benz',
      model: 'Actros 3344 6x4',
      type: 'CAMION_TOLVA',
      year: 2022,
      currentHourmeter: 2150,
      currentKilometrage: 48600,
      operationalStatus: 'OPERATIVO',
      tenantId: demoTenant.id,
      faenaId: demoFaena1.id,
    },
    {
      internalNumber: 'CAR-001',
      brand: 'Komatsu',
      model: 'WA380-6',
      type: 'CARGADOR_FRONTAL',
      year: 2021,
      currentHourmeter: 3200,
      operationalStatus: 'EN_MANTENCION',
      tenantId: demoTenant.id,
      faenaId: demoFaena2.id,
    },
    {
      internalNumber: 'CT-001',
      brand: 'Toyota',
      model: 'Hilux SRV 4x4',
      type: 'CAMIONETA',
      year: 2024,
      currentHourmeter: 450,
      currentKilometrage: 18200,
      operationalStatus: 'OPERATIVO',
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
        faenaId: demoFaena1.id,
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
