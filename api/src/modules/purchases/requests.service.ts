import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestStatusDto } from './dto/update-request-status.dto';
import { RequestStatus } from '@prisma/client';

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

  async create(createRequestDto: CreateRequestDto, requesterId: string) {
    return this.prisma.purchaseRequest.create({
      data: {
        requestNumber: createRequestDto.requestNumber,
        faenaId: createRequestDto.faenaId,
        justification: createRequestDto.justification,
        requesterId,
        status: RequestStatus.PENDIENTE,
      },
    });
  }

  async updateStatus(id: string, updateDto: UpdateRequestStatusDto) {
    const request = await this.prisma.purchaseRequest.findUnique({ where: { id } });
    if (!request) {
      throw new NotFoundException(`Purchase request with id ${id} not found`);
    }

    return this.prisma.purchaseRequest.update({
      where: { id },
      data: {
        status: updateDto.status,
      },
    });
  }
}
