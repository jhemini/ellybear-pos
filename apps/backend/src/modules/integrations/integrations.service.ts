import { Injectable, NotFoundException } from '@nestjs/common';
import { IntegrationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class IntegrationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.integration.findMany({ where: { organizationId } });
  }

  async connect(organizationId: string, type: IntegrationType, credentials: Record<string, string>) {
    return this.prisma.integration.upsert({
      where: { organizationId_type: { organizationId, type } },
      create: { organizationId, type, name: type, credentials, isActive: true },
      update: { credentials, isActive: true },
    });
  }

  async disconnect(organizationId: string, type: IntegrationType) {
    return this.prisma.integration.update({
      where: { organizationId_type: { organizationId, type } },
      data: { isActive: false },
    });
  }

  // Webhook management
  async createWebhook(organizationId: string, dto: {
    name: string; url: string; secret: string; events: string[];
  }) {
    return this.prisma.webhook.create({ data: { organizationId, ...dto } });
  }

  async findWebhooks(organizationId: string) {
    return this.prisma.webhook.findMany({ where: { organizationId } });
  }

  // Dispatch an event to all matching active webhooks
  async dispatchEvent(organizationId: string, event: string, payload: any) {
    const webhooks = await this.prisma.webhook.findMany({
      where: { organizationId, isActive: true, events: { has: event } },
    });

    // Fire and forget — in production this would be a Bull queue job
    for (const wh of webhooks) {
      fetch(wh.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Ellybear-Event': event,
          'X-Ellybear-Secret': wh.secret,
        },
        body: JSON.stringify(payload),
      })
        .then(async (res) => {
          await this.prisma.webhookDelivery.create({
            data: {
              webhookId: wh.id,
              event,
              payload,
              statusCode: res.status,
              success: res.ok,
              deliveredAt: new Date(),
            },
          });
          await this.prisma.webhook.update({
            where: { id: wh.id },
            data: { lastTriggeredAt: new Date() },
          });
        })
        .catch(() => {
          this.prisma.webhook.update({
            where: { id: wh.id },
            data: { failureCount: { increment: 1 } },
          });
        });
    }
  }
}
