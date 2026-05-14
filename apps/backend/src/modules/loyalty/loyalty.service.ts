import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LoyaltyService {
  constructor(private prisma: PrismaService) {}

  async getProgram(organizationId: string) {
    return this.prisma.loyaltyProgram.findUnique({ where: { organizationId } });
  }

  async createOrUpdateProgram(organizationId: string, dto: {
    name?: string;
    pointsPerCurrency?: number;
    pointsValue?: number;
    minimumRedeemPoints?: number;
    expiryDays?: number;
    isActive?: boolean;
  }) {
    return this.prisma.loyaltyProgram.upsert({
      where: { organizationId },
      create: { organizationId, ...dto },
      update: dto,
    });
  }

  async getAccount(customerId: string) {
    return this.prisma.loyaltyAccount.findUnique({
      where: { customerId },
      include: {
        loyaltyProgram: true,
        transactions: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
  }

  async enrollCustomer(customerId: string, organizationId: string) {
    const program = await this.getProgram(organizationId);
    if (!program) throw new NotFoundException('No loyalty program configured');

    const existing = await this.prisma.loyaltyAccount.findUnique({ where: { customerId } });
    if (existing) return existing;

    return this.prisma.loyaltyAccount.create({
      data: { customerId, loyaltyProgramId: program.id, points: 0 },
    });
  }

  async redeemPoints(customerId: string, organizationId: string, points: number) {
    const account = await this.getAccount(customerId);
    if (!account) throw new NotFoundException('Customer has no loyalty account');

    const program = await this.getProgram(organizationId);
    if (!program) throw new NotFoundException('No loyalty program');

    if (points < program.minimumRedeemPoints) {
      throw new BadRequestException(`Minimum redemption is ${program.minimumRedeemPoints} points`);
    }
    if (account.points < points) {
      throw new BadRequestException(`Insufficient points. Available: ${account.points}`);
    }

    const dollarValue = points * Number(program.pointsValue);

    await this.prisma.loyaltyAccount.update({
      where: { customerId },
      data: { points: { decrement: points } },
    });

    await this.prisma.loyaltyTransaction.create({
      data: {
        loyaltyAccountId: account.id,
        points: -points,
        description: `Redeemed for $${dollarValue.toFixed(2)} discount`,
      },
    });

    return { pointsRedeemed: points, dollarValue };
  }
}
