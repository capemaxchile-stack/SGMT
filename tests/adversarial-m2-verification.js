/**
 * Empirical Adversarial Challenger Verification Suite for Milestone 2
 * Focus: State Machines, Limits & DB Filter Verification
 * Tests both compiled NestJS services and opaque-box domain logic.
 */

const assert = require('assert');
const path = require('path');

const bcrypt = require(path.resolve(__dirname, '../api/node_modules/bcrypt'));
const { OrderStatus, AuthorizationAction, RequestStatus, Prisma } = require(path.resolve(__dirname, '../api/node_modules/@prisma/client'));
const { OrdersService } = require(path.resolve(__dirname, '../api/dist/modules/purchases/orders.service'));
const { RequestsService } = require(path.resolve(__dirname, '../api/dist/modules/purchases/requests.service'));
const { PrismaClientExceptionFilter } = require(path.resolve(__dirname, '../api/dist/common/filters/prisma-exception.filter'));
const { PurchaseEngine } = require('./harness/purchase-engine');

let passCount = 0;
let failCount = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passCount++;
    console.log(`  \x1b[32m✔\x1b[0m ${name}`);
  } catch (err) {
    failCount++;
    failures.push({ name, error: err });
    console.log(`  \x1b[31m✖\x1b[0m ${name}`);
    console.log(`    \x1b[31m${err.message}\x1b[0m`);
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    passCount++;
    console.log(`  \x1b[32m✔\x1b[0m ${name}`);
  } catch (err) {
    failCount++;
    failures.push({ name, error: err });
    console.log(`  \x1b[31m✖\x1b[0m ${name}`);
    console.log(`    \x1b[31m${err.message}\x1b[0m`);
  }
}

// Helpers for mock Prisma
function createMockPrisma() {
  const mock = {
    purchaseOrder: {
      findUnique: async () => null,
      findFirst: async () => null,
      create: async () => null,
      update: async () => null,
    },
    purchaseRequest: {
      findUnique: async () => null,
      findFirst: async () => null,
      create: async () => null,
      update: async () => null,
    },
    user: {
      findUnique: async () => null,
    },
    authorization: {
      create: async () => ({ id: 'auth-1' }),
    },
    warehouseMovement: {
      findFirst: async () => null,
      create: async () => ({ id: 'mov-1', lines: [] }),
    },
    stock: {
      upsert: async () => null,
      update: async () => null,
    },
    $transaction: async (cb) => cb(mock),
    $executeRaw: async () => 1,
    $queryRaw: async () => [],
  };
  return mock;
}

async function runAdversarialSuite() {
  console.log('\n\x1b[1m\x1b[34m============================================================\x1b[0m');
  console.log('\x1b[1m\x1b[37m  EMPIRICAL ADVERSARIAL CHALLENGER SUITE: MILESTONE 2\x1b[0m');
  console.log('\x1b[1m\x1b[34m============================================================\x1b[0m\n');

  // =========================================================================
  // SECTION 1: PURCHASE ORDER FSM & TRANSITIONS
  // =========================================================================
  console.log('\x1b[1m▶ Section 1: Purchase Order FSM & Illegal Transitions\x1b[0m');

  const allOrderStatuses = Object.values(OrderStatus);
  const terminalStatuses = [OrderStatus.RECHAZADA, OrderStatus.RECEPCION_TOTAL, OrderStatus.CANCELADA];

  for (const termStatus of terminalStatuses) {
    for (const targetStatus of allOrderStatuses) {
      await testAsync(`FSM Guard: Cannot transition from terminal ${termStatus} to ${targetStatus}`, async () => {
        const mockPrisma = createMockPrisma();
        mockPrisma.purchaseOrder.findUnique = async () => ({
          id: 'po-test',
          status: termStatus,
          totalAmount: new Prisma.Decimal(1000),
        });
        const service = new OrdersService(mockPrisma);

        let error = null;
        try {
          await service.updateStatus('po-test', { status: targetStatus }, 'u1');
        } catch (e) {
          error = e;
        }

        assert(error, `Expected exception when moving from ${termStatus} to ${targetStatus}`);
        assert(error.message.includes(`Cannot move Purchase Order from ${termStatus}`));
      });
    }
  }

  // Illegal skip transitions from BORRADOR
  const illegalFromBorrador = [
    OrderStatus.APROBADA,
    OrderStatus.APROBADA_EXCEPCION,
    OrderStatus.EMITIDA,
    OrderStatus.RECEPCION_PARCIAL,
    OrderStatus.RECEPCION_TOTAL,
    OrderStatus.RECHAZADA,
  ];

  for (const target of illegalFromBorrador) {
    await testAsync(`FSM Guard: Direct jump from BORRADOR to ${target} is rejected`, async () => {
      const mockPrisma = createMockPrisma();
      mockPrisma.purchaseOrder.findUnique = async () => ({
        id: 'po-test',
        status: OrderStatus.BORRADOR,
        totalAmount: new Prisma.Decimal(1000),
      });
      const service = new OrdersService(mockPrisma);

      let error = null;
      try {
        await service.updateStatus('po-test', { status: target }, 'u1');
      } catch (e) {
        error = e;
      }

      assert(error, `Expected exception when jumping from BORRADOR to ${target}`);
      assert(error.message.includes(`Cannot move Purchase Order from BORRADOR to ${target}`));
    });
  }

  // Reception terminal & illegal order status in receiveOrder
  const nonReceivableStatuses = [
    OrderStatus.BORRADOR,
    OrderStatus.PENDIENTE_APROBACION,
    OrderStatus.RECHAZADA,
    OrderStatus.CANCELADA,
    OrderStatus.RECEPCION_TOTAL,
  ];

  for (const status of nonReceivableStatuses) {
    await testAsync(`receiveOrder Guard: Cannot receive order with status ${status}`, async () => {
      const mockPrisma = createMockPrisma();
      mockPrisma.$queryRaw = async () => [{ id: 'po-recv', status }];
      const service = new OrdersService(mockPrisma);

      let error = null;
      try {
        await service.receiveOrder('po-recv', { warehouseId: 'wh-1' }, 'u1');
      } catch (e) {
        error = e;
      }

      assert(error, `Expected exception when receiving order in status ${status}`);
      assert(error.message.includes('Cannot move Purchase Order from'));
    });
  }

  // =========================================================================
  // SECTION 2: APPROVAL LIMITS & SUPERKEY EXCEPTIONS
  // =========================================================================
  console.log('\n\x1b[1m▶ Section 2: Approval Limits & SuperKey Exceptions\x1b[0m');

  await testAsync('Approval Limit: Approver limit == order total succeeds (boundary check)', async () => {
    const mockPrisma = createMockPrisma();
    mockPrisma.purchaseOrder.findUnique = async () => ({
      id: 'po-lim-1',
      status: OrderStatus.PENDIENTE_APROBACION,
      totalAmount: new Prisma.Decimal(5000000),
    });
    mockPrisma.user.findUnique = async () => ({
      id: 'u-mgr',
      roles: [{ role: { name: 'JEFE_COMPRAS', maxApprovalAmount: new Prisma.Decimal(5000000) } }],
    });
    mockPrisma.purchaseOrder.update = async ({ data }) => ({ id: 'po-lim-1', status: data.status });

    const service = new OrdersService(mockPrisma);
    const result = await service.updateStatus('po-lim-1', { action: AuthorizationAction.APROBADA }, 'u-mgr');
    assert.strictEqual(result.status, OrderStatus.APROBADA);
  });

  await testAsync('Approval Limit: Order exceeding limit by 1 peso strictly throws ApprovalLimitExceeded', async () => {
    const mockPrisma = createMockPrisma();
    mockPrisma.purchaseOrder.findUnique = async () => ({
      id: 'po-lim-2',
      status: OrderStatus.PENDIENTE_APROBACION,
      totalAmount: new Prisma.Decimal(5000001),
    });
    mockPrisma.user.findUnique = async () => ({
      id: 'u-mgr',
      roles: [{ role: { name: 'JEFE_COMPRAS', maxApprovalAmount: new Prisma.Decimal(5000000) } }],
    });

    const service = new OrdersService(mockPrisma);
    let error = null;
    try {
      await service.updateStatus('po-lim-2', { action: AuthorizationAction.APROBADA }, 'u-mgr');
    } catch (e) {
      error = e;
    }

    assert(error, 'Expected ApprovalLimitExceeded');
    assert(error.message.includes('ApprovalLimitExceeded'));
  });

  await testAsync('Approval Limit: Fractional peso exceed (5000000.01) strictly throws ApprovalLimitExceeded', async () => {
    const mockPrisma = createMockPrisma();
    mockPrisma.purchaseOrder.findUnique = async () => ({
      id: 'po-lim-3',
      status: OrderStatus.PENDIENTE_APROBACION,
      totalAmount: new Prisma.Decimal('5000000.01'),
    });
    mockPrisma.user.findUnique = async () => ({
      id: 'u-mgr',
      roles: [{ role: { name: 'JEFE_COMPRAS', maxApprovalAmount: new Prisma.Decimal(5000000) } }],
    });

    const service = new OrdersService(mockPrisma);
    let error = null;
    try {
      await service.updateStatus('po-lim-3', { action: AuthorizationAction.APROBADA }, 'u-mgr');
    } catch (e) {
      error = e;
    }

    assert(error, 'Expected ApprovalLimitExceeded');
    assert(error.message.includes('ApprovalLimitExceeded'));
  });

  await testAsync('Approval Limit: User with multiple roles selects highest limit among roles', async () => {
    const mockPrisma = createMockPrisma();
    mockPrisma.purchaseOrder.findUnique = async () => ({
      id: 'po-lim-4',
      status: OrderStatus.PENDIENTE_APROBACION,
      totalAmount: new Prisma.Decimal(9000000),
    });
    mockPrisma.user.findUnique = async () => ({
      id: 'u-multi',
      roles: [
        { role: { name: 'SUPERVISOR', maxApprovalAmount: new Prisma.Decimal(1000000) } },
        { role: { name: 'JEFE_AREA', maxApprovalAmount: new Prisma.Decimal(10000000) } },
        { role: { name: 'ENCARGADO', maxApprovalAmount: new Prisma.Decimal(3000000) } },
      ],
    });
    mockPrisma.purchaseOrder.update = async ({ data }) => ({ id: 'po-lim-4', status: data.status });

    const service = new OrdersService(mockPrisma);
    const result = await service.updateStatus('po-lim-4', { action: AuthorizationAction.APROBADA }, 'u-multi');
    assert.strictEqual(result.status, OrderStatus.APROBADA);
  });

  await testAsync('Approval Limit: User with one unlimited role among limited roles approves any amount', async () => {
    const mockPrisma = createMockPrisma();
    mockPrisma.purchaseOrder.findUnique = async () => ({
      id: 'po-lim-5',
      status: OrderStatus.PENDIENTE_APROBACION,
      totalAmount: new Prisma.Decimal(500000000),
    });
    mockPrisma.user.findUnique = async () => ({
      id: 'u-exec',
      roles: [
        { role: { name: 'SUPERVISOR', maxApprovalAmount: new Prisma.Decimal(1000000) } },
        { role: { name: 'GERENTE_GENERAL', maxApprovalAmount: null } },
      ],
    });
    mockPrisma.purchaseOrder.update = async ({ data }) => ({ id: 'po-lim-5', status: data.status });

    const service = new OrdersService(mockPrisma);
    const result = await service.updateStatus('po-lim-5', { action: AuthorizationAction.APROBADA }, 'u-exec');
    assert.strictEqual(result.status, OrderStatus.APROBADA);
  });

  await testAsync('Approval Limit: User with no roles is rejected', async () => {
    const mockPrisma = createMockPrisma();
    mockPrisma.purchaseOrder.findUnique = async () => ({
      id: 'po-lim-6',
      status: OrderStatus.PENDIENTE_APROBACION,
      totalAmount: new Prisma.Decimal(100),
    });
    mockPrisma.user.findUnique = async () => ({
      id: 'u-noroles',
      roles: [],
    });

    const service = new OrdersService(mockPrisma);
    let error = null;
    try {
      await service.updateStatus('po-lim-6', { action: AuthorizationAction.APROBADA }, 'u-noroles');
    } catch (e) {
      error = e;
    }

    assert(error, 'Expected rejection for user without roles');
    assert(error.message.includes('ApprovalLimitExceeded'));
  });

  // SuperKey Exception Tests
  const rawSuperKey = 'super-secret-key-2026';
  const hashedSuperKey = await bcrypt.hash(rawSuperKey, 10);

  await testAsync('SuperKey: Valid bcrypt superKey approves order as APROBADA_EXCEPCION', async () => {
    const mockPrisma = createMockPrisma();
    mockPrisma.purchaseOrder.findUnique = async () => ({
      id: 'po-sup-1',
      status: OrderStatus.PENDIENTE_APROBACION,
      totalAmount: new Prisma.Decimal(50000000),
    });
    mockPrisma.user.findUnique = async () => ({
      id: 'u-super',
      superKeyHash: hashedSuperKey,
      roles: [],
    });
    mockPrisma.purchaseOrder.update = async ({ data }) => ({ id: 'po-sup-1', status: data.status });

    const service = new OrdersService(mockPrisma);
    const result = await service.updateStatus(
      'po-sup-1',
      { action: AuthorizationAction.EXCEPCION, superKey: rawSuperKey },
      'u-super'
    );
    assert.strictEqual(result.status, OrderStatus.APROBADA_EXCEPCION);
  });

  await testAsync('SuperKey: Invalid superKey throws UnauthorizedException', async () => {
    const mockPrisma = createMockPrisma();
    mockPrisma.purchaseOrder.findUnique = async () => ({
      id: 'po-sup-2',
      status: OrderStatus.PENDIENTE_APROBACION,
      totalAmount: new Prisma.Decimal(50000000),
    });
    mockPrisma.user.findUnique = async () => ({
      id: 'u-super',
      superKeyHash: hashedSuperKey,
      roles: [],
    });

    const service = new OrdersService(mockPrisma);
    let error = null;
    try {
      await service.updateStatus(
        'po-sup-2',
        { action: AuthorizationAction.EXCEPCION, superKey: 'wrong-key' },
        'u-super'
      );
    } catch (e) {
      error = e;
    }

    assert(error, 'Expected UnauthorizedException');
    assert(error.message.includes('Invalid or missing superKey'));
  });

  await testAsync('SuperKey: Missing or whitespace superKey throws UnauthorizedException', async () => {
    const mockPrisma = createMockPrisma();
    mockPrisma.purchaseOrder.findUnique = async () => ({
      id: 'po-sup-3',
      status: OrderStatus.PENDIENTE_APROBACION,
      totalAmount: new Prisma.Decimal(50000000),
    });
    mockPrisma.user.findUnique = async () => ({
      id: 'u-super',
      superKeyHash: hashedSuperKey,
      roles: [],
    });

    const service = new OrdersService(mockPrisma);
    for (const emptyKey of ['', '   ', null, undefined]) {
      let error = null;
      try {
        await service.updateStatus(
          'po-sup-3',
          { action: AuthorizationAction.EXCEPCION, superKey: emptyKey },
          'u-super'
        );
      } catch (e) {
        error = e;
      }
      assert(error, `Expected error for emptyKey: ${emptyKey}`);
      assert(error.message.includes('Invalid or missing superKey'));
    }
  });

  await testAsync('SuperKey: User without superKeyHash configured throws UnauthorizedException', async () => {
    const mockPrisma = createMockPrisma();
    mockPrisma.purchaseOrder.findUnique = async () => ({
      id: 'po-sup-4',
      status: OrderStatus.PENDIENTE_APROBACION,
      totalAmount: new Prisma.Decimal(50000000),
    });
    mockPrisma.user.findUnique = async () => ({
      id: 'u-no-hash',
      superKeyHash: null,
      roles: [],
    });

    const service = new OrdersService(mockPrisma);
    let error = null;
    try {
      await service.updateStatus(
        'po-sup-4',
        { action: AuthorizationAction.EXCEPCION, superKey: 'any-key' },
        'u-no-hash'
      );
    } catch (e) {
      error = e;
    }

    assert(error, 'Expected UnauthorizedException');
    assert(error.message.includes('Clave de Súper Usuario no configurada'));
  });

  // =========================================================================
  // SECTION 3: FIELD REQUESTS (LOGIC-ST-WORKFLOW)
  // =========================================================================
  console.log('\n\x1b[1m▶ Section 3: Field Requests FSM & Conversion Guards\x1b[0m');

  await testAsync('RequestsService.create: Rejects missing faenaId', async () => {
    const mockPrisma = createMockPrisma();
    const service = new RequestsService(mockPrisma);
    let error = null;
    try {
      await service.create({ justification: 'test' }, 'u1');
    } catch (e) {
      error = e;
    }
    assert(error);
    assert(error.message.includes('Faena ID is required'));
  });

  await testAsync('RequestsService.create: Rejects empty or whitespace justification', async () => {
    const mockPrisma = createMockPrisma();
    const service = new RequestsService(mockPrisma);
    for (const emptyJust of ['', '   ', null, undefined]) {
      let error = null;
      try {
        await service.create({ faenaId: 'faena-1', justification: emptyJust }, 'u1');
      } catch (e) {
        error = e;
      }
      assert(error, `Expected error for justification: ${emptyJust}`);
      assert(error.message.includes('Justification is required'));
    }
  });

  // Terminal state guards on Field Requests
  for (const termStatus of [RequestStatus.RECHAZADA, RequestStatus.CONVERTIDA]) {
    for (const target of Object.values(RequestStatus)) {
      if (termStatus === target) continue;
      await testAsync(`FieldRequest FSM: Cannot transition from terminal ${termStatus} to ${target}`, async () => {
        const mockPrisma = createMockPrisma();
        mockPrisma.purchaseRequest.findUnique = async () => ({
          id: 'req-term',
          status: termStatus,
        });
        const service = new RequestsService(mockPrisma);
        let error = null;
        try {
          await service.updateStatus('req-term', { status: target });
        } catch (e) {
          error = e;
        }
        assert(error);
        assert(error.message.includes(`Cannot change status of ${termStatus}`));
      });
    }
  }

  // Illegal conversion in OrdersService.create
  for (const invalidStatus of [RequestStatus.BORRADOR, RequestStatus.PENDIENTE, RequestStatus.RECHAZADA, RequestStatus.CONVERTIDA]) {
    await testAsync(`OrdersService.create: Converting Field Request with status ${invalidStatus} throws BadRequestException`, async () => {
      const mockPrisma = createMockPrisma();
      mockPrisma.purchaseRequest.findUnique = async () => ({
        id: 'req-bad-conv',
        status: invalidStatus,
      });
      const service = new OrdersService(mockPrisma);

      let error = null;
      try {
        await service.create({
          supplierId: 's1',
          purchaseRequestId: 'req-bad-conv',
          lines: [{ itemId: 'i1', quantity: 1, unitPrice: 100 }],
        });
      } catch (e) {
        error = e;
      }

      assert(error, `Expected rejection for status ${invalidStatus}`);
      assert(error.message.includes('Only APROBADA field requests can be converted'));
    });
  }

  await testAsync('OrdersService.create: Converts APROBADA request and marks CONVERTIDA', async () => {
    let updatedRequestStatus = null;
    const mockPrisma = createMockPrisma();
    mockPrisma.purchaseRequest.findUnique = async () => ({
      id: 'req-approved',
      status: RequestStatus.APROBADA,
    });
    mockPrisma.purchaseRequest.update = async ({ data }) => {
      updatedRequestStatus = data.status;
      return { id: 'req-approved', status: data.status };
    };
    mockPrisma.purchaseOrder.findFirst = async () => null;
    mockPrisma.purchaseOrder.create = async ({ data }) => ({
      id: 'po-conv',
      orderNumber: data.orderNumber,
      status: data.status,
      purchaseRequestId: data.purchaseRequestId,
      lines: data.lines,
    });

    const service = new OrdersService(mockPrisma);
    const order = await service.create({
      supplierId: 's1',
      purchaseRequestId: 'req-approved',
      lines: [{ itemId: 'i1', quantity: 2, unitPrice: 500 }],
    });

    assert.strictEqual(updatedRequestStatus, RequestStatus.CONVERTIDA);
    assert.strictEqual(order.purchaseRequestId, 'req-approved');
  });

  // =========================================================================
  // SECTION 4: PRISMA CLIENT EXCEPTION FILTER
  // =========================================================================
  console.log('\n\x1b[1m▶ Section 4: PrismaClientExceptionFilter Database Error Translation\x1b[0m');

  test('Filter P2002: Single string target formats 409 Conflict with target field', () => {
    const error = { code: 'P2002', meta: { target: 'email' } };
    const res = PrismaClientExceptionFilter.catch(error);
    assert.strictEqual(res.statusCode, 409);
    assert.strictEqual(res.error, 'Conflict');
    assert(res.message.includes('email'));
    assert(res.message.includes('Unique constraint violation'));
  });

  test('Filter P2002: Array target formats 409 Conflict with joined fields', () => {
    const error = { code: 'P2002', meta: { target: ['rut', 'companyId', 'code'] } };
    const res = PrismaClientExceptionFilter.catch(error);
    assert.strictEqual(res.statusCode, 409);
    assert.strictEqual(res.error, 'Conflict');
    assert(res.message.includes('rut, companyId, code'));
  });

  test('Filter P2002: Missing target defaults cleanly to "field"', () => {
    const error = { code: 'P2002', meta: {} };
    const res = PrismaClientExceptionFilter.catch(error);
    assert.strictEqual(res.statusCode, 409);
    assert(res.message.includes('field'));
  });

  test('Filter P2003: Foreign key with field_name formats 400 Bad Request', () => {
    const error = { code: 'P2003', meta: { field_name: 'warehouseId' } };
    const res = PrismaClientExceptionFilter.catch(error);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.error, 'Bad Request');
    assert(res.message.includes('warehouseId'));
    assert(res.message.includes('Foreign key constraint failed'));
  });

  test('Filter P2003: Foreign key without field_name defaults cleanly to "relation"', () => {
    const error = { code: 'P2003', meta: {} };
    const res = PrismaClientExceptionFilter.catch(error);
    assert.strictEqual(res.statusCode, 400);
    assert(res.message.includes('relation'));
  });

  test('Filter P2025: Record not found with custom cause formats 404 Not Found', () => {
    const error = { code: 'P2025', meta: { cause: 'PurchaseOrder with id 999 not found' } };
    const res = PrismaClientExceptionFilter.catch(error);
    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.error, 'Not Found');
    assert.strictEqual(res.message, 'PurchaseOrder with id 999 not found');
  });

  test('Filter P2025: Record not found without cause defaults cleanly', () => {
    const error = { code: 'P2025', meta: {} };
    const res = PrismaClientExceptionFilter.catch(error);
    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.message, 'Record to update or delete does not exist.');
  });

  test('Filter Unknown Error: Hides connection string and passwords in 500 Internal Server Error', () => {
    const error = {
      code: 'P1001',
      message: 'Failed to connect to postgresql://admin:SuperSecretPass123!@localhost:5432/sgmt',
    };
    const res = PrismaClientExceptionFilter.catch(error);
    assert.strictEqual(res.statusCode, 500);
    assert.strictEqual(res.error, 'Internal Server Error');
    assert.strictEqual(res.message, 'An unexpected database error occurred.');
    assert(!JSON.stringify(res).includes('SuperSecretPass123!'));
    assert(!JSON.stringify(res).includes('postgresql://'));
  });

  test('Filter Execution Context: Works with NestJS ArgumentsHost and Express response', () => {
    const filter = new PrismaClientExceptionFilter();
    let statusCalled = null;
    let jsonCalled = null;
    const mockResponse = {
      status: (code) => {
        statusCalled = code;
        return {
          json: (body) => {
            jsonCalled = body;
            return body;
          },
        };
      },
    };
    const mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
      }),
    };

    const error = { code: 'P2002', meta: { target: 'email' } };
    const returned = filter.catch(error, mockHost);

    assert.strictEqual(statusCalled, 409);
    assert.strictEqual(jsonCalled.statusCode, 409);
    assert.strictEqual(jsonCalled.error, 'Conflict');
    assert.deepStrictEqual(returned, jsonCalled);
  });

  // Summary
  console.log('\n\x1b[1m\x1b[34m============================================================\x1b[0m');
  console.log(`  ADVERSARIAL TESTS TOTAL : ${passCount + failCount}`);
  console.log(`  PASSED                  : \x1b[32m${passCount}\x1b[0m`);
  console.log(`  FAILED                  : ${failCount > 0 ? `\x1b[31m${failCount}\x1b[0m` : '\x1b[32m0\x1b[0m'}`);
  console.log('\x1b[1m\x1b[34m============================================================\x1b[0m\n');

  if (failCount > 0) {
    console.error(`\x1b[31mAdversarial verification failed with ${failCount} errors.\x1b[0m`);
    process.exit(1);
  } else {
    console.log('\x1b[32mALL ADVERSARIAL STRESS TESTS PASSED SUCCESSFULLY! (VERDICT: APPROVE)\x1b[0m\n');
  }
}

runAdversarialSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
