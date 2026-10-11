import { Injectable, NotFoundException, BadRequestException, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationChannelsService } from '../notifications/notification-channels.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestStatusDto } from './dto/update-request-status.dto';
import { RequestStatus, RequestUrgency, Prisma } from '@prisma/client';

const ALLOWED_REQUEST_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  [RequestStatus.BORRADOR]: [RequestStatus.PENDIENTE, RequestStatus.RECHAZADA],
  [RequestStatus.PENDIENTE]: [RequestStatus.APROBADA, RequestStatus.RECHAZADA],
  [RequestStatus.APROBADA]: [RequestStatus.CONVERTIDA, RequestStatus.RECHAZADA],
  [RequestStatus.RECHAZADA]: [],
  [RequestStatus.CONVERTIDA]: [],
};

@Injectable()
export class RequestsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly channelsService?: NotificationChannelsService,
  ) {}

  async findAll() {
    return this.prisma.purchaseRequest.findMany({
      include: {
        faena: true,
        requester: { select: { id: true, name: true, email: true } },
        lines: {
          include: {
            item: true,
            targetAsset: { select: { id: true, internalNumber: true, type: true } },
          },
        },
        quotations: {
          select: { id: true, quotationNumber: true, status: true, totalAmount: true },
        },
        purchaseOrder: {
          select: { id: true, orderNumber: true, status: true, totalAmount: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const request = await this.prisma.purchaseRequest.findUnique({
      where: { id },
      include: {
        faena: true,
        requester: { select: { id: true, name: true, email: true } },
        lines: {
          include: {
            item: true,
            targetAsset: { select: { id: true, internalNumber: true, type: true } },
          },
        },
        quotations: {
          include: {
            supplier: true,
            lines: { include: { item: true } },
          },
        },
        purchaseOrder: {
          include: {
            supplier: true,
            lines: { include: { item: true } },
          },
        },
      },
    });
    if (!request) {
      throw new NotFoundException(`Purchase request with id ${id} not found`);
    }
    return request;
  }

  async create(createRequestDto: CreateRequestDto, requesterId: string) {
    if (!createRequestDto.faenaId) {
      throw new BadRequestException('Faena ID is required');
    }
    if (!createRequestDto.justification || !createRequestDto.justification.trim()) {
      throw new BadRequestException('Justification is required');
    }

    const request = await this.prisma.$transaction(async (tx) => {
      let requestNumber = createRequestDto.requestNumber;
      if (!requestNumber) {
        const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
        try {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'folio_ST_' + dateStr}))`;
        } catch {
          // ignore lock error in mock/non-postgres environments
        }

        const latest = await tx.purchaseRequest.findFirst({
          where: { requestNumber: { startsWith: `ST-${dateStr}-` } },
          orderBy: { requestNumber: 'desc' },
          select: { requestNumber: true },
        });

        let nextSeq = 1;
        if (latest && latest.requestNumber) {
          const parts = latest.requestNumber.split('-');
          const lastNum = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(lastNum)) {
            nextSeq = lastNum + 1;
          }
        }
        const seqStr = nextSeq >= 10000 ? nextSeq.toString() : nextSeq.toString().padStart(4, '0');
        requestNumber = `ST-${dateStr}-${seqStr}`;
      }

      const linesCreate = (createRequestDto.lines || []).map((line) => ({
        itemId: line.itemId,
        quantity: new Prisma.Decimal(line.quantity),
        targetAssetId: line.targetAssetId || null,
        urgency: line.urgency || RequestUrgency.NORMAL,
        notes: line.notes || null,
      }));

      return tx.purchaseRequest.create({
        data: {
          requestNumber,
          faenaId: createRequestDto.faenaId,
          justification: createRequestDto.justification.trim(),
          requesterId,
          status: createRequestDto.status || RequestStatus.BORRADOR,
          lines: linesCreate.length > 0 ? { create: linesCreate } : undefined,
        },
        include: {
          faena: true,
          requester: { select: { id: true, name: true, email: true } },
          lines: {
            include: {
              item: true,
              targetAsset: true,
            },
          },
        },
      });
    });

    // Asynchronous notification dispatch (Telegram / Brevo Email)
    if (this.channelsService) {
      const itemsSummary = (request.lines || [])
        .map((l: any) => `• ${l.item.code}: ${Number(l.quantity)} un (${l.urgency || 'NORMAL'})`)
        .join('\n');

      this.channelsService
        .dispatchSystemAlert({
          event: 'pendingApprovals',
          title: `Nuevo Pedido de Terreno: ${request.requestNumber}`,
          summary: `📍 Faena: ${request.faena?.name || 'N/A'}\n👤 Solicitante: ${request.requester?.name || 'Operador Terreno'}\n📝 Motivo: ${request.justification}\n\n📦 Repuestos solicitados:\n${itemsSummary}`,
          details: {
            requestNumber: request.requestNumber,
            faena: request.faena?.name,
            itemsCount: request.lines?.length || 0,
          },
          link: '/compras',
        })
        .catch(() => {});
    }

    return request;
  }

  async updateStatus(id: string, updateDto: UpdateRequestStatusDto) {
    const request = await this.prisma.purchaseRequest.findUnique({ where: { id } });
    if (!request) {
      throw new NotFoundException(`Purchase request with id ${id} not found`);
    }

    if (request.status === updateDto.status) {
      return request;
    }

    if (request.status === RequestStatus.RECHAZADA || request.status === RequestStatus.CONVERTIDA) {
      throw new BadRequestException(`Cannot change status of ${request.status} field request`);
    }

    const allowed = ALLOWED_REQUEST_TRANSITIONS[request.status] || [];
    if (!allowed.includes(updateDto.status)) {
      throw new BadRequestException(`Invalid status transition from ${request.status} to ${updateDto.status}`);
    }

    return this.prisma.purchaseRequest.update({
      where: { id },
      data: {
        status: updateDto.status,
      },
      include: {
        faena: true,
        requester: { select: { id: true, name: true, email: true } },
        lines: { include: { item: true } },
      },
    });
  }

  async getTimeline(id: string) {
    const req = await this.findOne(id);

    const timelineEvents: Array<{
      step: number;
      phase: string;
      title: string;
      description: string;
      timestamp: Date;
      status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' | 'REJECTED';
      badge?: string;
      meta?: Record<string, any>;
    }> = [];

    // Phase 1: Solicitud de Terreno
    timelineEvents.push({
      step: 1,
      phase: 'SOLICITUD',
      title: `Solicitud de Pedido ${req.requestNumber}`,
      description: `Generada por ${req.requester.name} en faena ${req.faena.name}. Justificación: "${req.justification}"`,
      timestamp: req.createdAt,
      status: req.status === RequestStatus.RECHAZADA ? 'REJECTED' : 'COMPLETED',
      badge: req.status,
      meta: {
        totalLines: req.lines.length,
        items: req.lines.map((l) => ({
          code: l.item.code,
          name: l.item.description,
          qty: Number(l.quantity),
          unit: l.item.unitOfMeasure,
          urgency: l.urgency,
        })),
      },
    });

    // Phase 2: Cotizaciones
    if (req.quotations && req.quotations.length > 0) {
      const selected = req.quotations.find((q) => q.status === 'SELECCIONADA');
      timelineEvents.push({
        step: 2,
        phase: 'COTIZACIONES',
        title: `Proceso de Cotizaciones (${req.quotations.length} proveedores consultados)`,
        description: selected
          ? `Cotización ${selected.quotationNumber} seleccionada con proveedor ${selected.supplier.businessName} por $${Number(selected.totalAmount).toLocaleString('es-CL')}`
          : `${req.quotations.length} cotización(es) en evaluación o trámite.`,
        timestamp: selected ? selected.updatedAt : req.quotations[0].createdAt,
        status: selected ? 'COMPLETED' : 'IN_PROGRESS',
        badge: selected ? 'SELECCIONADA' : 'EN_EVALUACION',
        meta: {
          quotes: req.quotations.map((q) => ({
            number: q.quotationNumber,
            supplier: q.supplier.businessName,
            status: q.status,
            amount: Number(q.totalAmount),
          })),
        },
      });
    } else {
      timelineEvents.push({
        step: 2,
        phase: 'COTIZACIONES',
        title: 'Cotizaciones de Proveedores',
        description: req.status === RequestStatus.APROBADA ? 'Pendiente de solicitar cotizaciones' : 'A la espera de aprobación de solicitud',
        timestamp: req.updatedAt,
        status: req.status === RequestStatus.APROBADA ? 'IN_PROGRESS' : 'PENDING',
      });
    }

    // Phase 3: Orden de Compra
    if (req.purchaseOrder && req.purchaseOrder.length > 0) {
      for (const po of req.purchaseOrder) {
        timelineEvents.push({
          step: 3,
          phase: 'ORDEN_COMPRA',
          title: `Orden de Compra ${po.orderNumber}`,
          description: `Emitida a ${po.supplier.businessName} por $${Number(po.totalAmount).toLocaleString('es-CL')}. Estado: ${po.status}`,
          timestamp: po.createdAt,
          status: po.status === 'CANCELADA' || po.status === 'RECHAZADA' ? 'REJECTED' : po.status === 'RECEPCION_TOTAL' ? 'COMPLETED' : 'IN_PROGRESS',
          badge: po.status,
        });
      }
    } else {
      timelineEvents.push({
        step: 3,
        phase: 'ORDEN_COMPRA',
        title: 'Emisión de Orden de Compra',
        description: 'Pendiente de emisión de OC',
        timestamp: req.updatedAt,
        status: 'PENDING',
      });
    }

    return {
      requestId: req.id,
      requestNumber: req.requestNumber,
      status: req.status,
      faena: req.faena.name,
      requester: req.requester.name,
      timeline: timelineEvents,
    };
  }
}
