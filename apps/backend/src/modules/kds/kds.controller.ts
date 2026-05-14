import { Controller, Get, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { KdsService } from './kds.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { KdsStatus } from '@prisma/client';

@Controller('kds')
@UseGuards(JwtAuthGuard)
export class KdsController {
  constructor(private kdsService: KdsService) {}

  @Get('stores/:storeId/tickets')
  getTickets(
    @Param('storeId') storeId: string,
    @Query('station') station?: string,
  ) {
    return this.kdsService.getActiveTickets(storeId, station);
  }

  @Patch('tickets/:id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: KdsStatus) {
    return this.kdsService.updateStatus(id, status);
  }
}
