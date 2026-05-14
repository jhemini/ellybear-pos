import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/kds',
})
export class KdsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(KdsGateway.name);

  afterInit() {
    this.logger.log('KDS WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`KDS client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`KDS client disconnected: ${client.id}`);
  }

  // Client joins a store's KDS room
  @SubscribeMessage('join-store')
  handleJoinStore(client: Socket, storeId: string) {
    client.join(`store:${storeId}`);
    this.logger.log(`Client ${client.id} joined store ${storeId}`);
  }

  // Broadcast new ticket to kitchen
  broadcastNewTicket(storeId: string, ticket: any) {
    this.server.to(`store:${storeId}`).emit('ticket:new', ticket);
  }

  // Broadcast status update
  broadcastTicketUpdate(storeId: string, ticket: any) {
    this.server.to(`store:${storeId}`).emit('ticket:updated', ticket);
  }

  // Broadcast low stock alert
  broadcastLowStock(storeId: string, alert: any) {
    this.server.to(`store:${storeId}`).emit('inventory:low-stock', alert);
  }
}
