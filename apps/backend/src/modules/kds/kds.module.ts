import { Module } from '@nestjs/common';
import { KdsController } from './kds.controller';
import { KdsService } from './kds.service';
import { KdsGateway } from './kds.gateway';

@Module({
  controllers: [KdsController],
  providers: [KdsService, KdsGateway],
  exports: [KdsService, KdsGateway],
})
export class KdsModule {}
