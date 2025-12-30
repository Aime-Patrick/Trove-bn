import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Lottery } from '../schemas/lottery.schema';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class LotteryGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinGroup')
  handleJoinGroup(client: Socket, groupId: string) {
    client.join(groupId);
    console.log(`Client ${client.id} joined group ${groupId}`);
  }

  broadcastLotteryUpdate(
    groupId: string,
    data: Partial<Lottery> | Record<string, unknown>,
  ) {
    if (this.server) {
      this.server.to(groupId).emit('lotteryUpdate', data);
    }
  }

  broadcastMemberJoined(groupId: string, member: any) {
    if (this.server) {
      this.server.to(groupId).emit('memberJoined', member);
    }
  }

  broadcastGroupUpdate(groupId: string, group: any) {
    if (this.server) {
      this.server.to(groupId).emit('groupUpdate', group);
    }
  }

  @SubscribeMessage('message')
  handleMessage(client: Socket, payload: unknown): string {
    return 'Hello world!';
  }
}
