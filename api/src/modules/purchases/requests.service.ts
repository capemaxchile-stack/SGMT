import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestStatusDto } from './dto/update-request-status.dto';
import { RequestStatus } from '@prisma/client';

const ALLOWED_REQUEST_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  [RequestStatus.BORRADOR]: [RequestStatus.PENDIENTE, RequestStatus.RECHAZADA],
  [RequestStatus.PENDIENTE]: [RequestStatus.APROBADA, RequestStatus.RECHAZADA],
  [RequestStatus.APROBADA]: [RequestStatus.CONVERTIDA, RequestStatus.RECHAZADA],
  [RequestStatus.RECHAZADA]: [],
  [RequestStatus.CONVERTIDA]: [],
};

@Injectable()
export class RequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.purchaseRequest.findMany({
      include: {
        faena: true,
        requester: { select: { id: true, name: true, email: true } },
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
        purchaseOrder: true,
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

    return this.prisma.$transaction(async (tx) => {
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

      return tx.purchaseRequest.create({
        data: {
          requestNumber,
          faenaId: createRequestDto.faenaId,
          justification: createRequestDto.justification.trim(),
          requesterId,
          status: createRequestDto.status || RequestStatus.BORRADOR,
        },
      });
    });
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
    });
  }
}
