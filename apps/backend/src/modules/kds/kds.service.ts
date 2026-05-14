import { Injectable } from '@nestjs/common';
import { KdsStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { KdsGateway } from './kds.gateway';

@Injectable()
export class KdsService {
  constructor(
    private prisma: PrismaService,
    private kdsGateway: KdsGateway,
  ) {}

  async getActiveTickets(storeId: string, station?: string) {
    return this.prisma.kdsTicket.findMany({
      where: {
        storeId,
        status: { in: ['NEW', 'ACKNOWLEDGED', 'IN_PROGRESS'] },
        ...(station && { station }),
      },
      include: { order: { include: { table: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateStatus(ticketId: string, status: KdsStatus) {
    const ticket = await this.prisma.kdsTicket.update({
      where: { id: ticketId },
      data: {
        status,
        ...(status === 'IN_PROGRESS' && { startedAt: new Date() }),
        ...(status === 'READY' && { readyAt: new Date() }),
      },
      include: { order: true },
    });

    this.kdsGateway.broadcastTicketUpdate(ticket.storeId, ticket);

    // If ready, update order status
    if (status === 'READY') {
      await this.prisma.order.update({
        where: { id: ticket.orderId },
        data: { status: 'READY' },
      });
    }

    return ticket;
  }
}
