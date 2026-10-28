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
