import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { MessagesWsService } from './messages-ws.service';
import { Server, Socket } from 'socket.io';
import { NewMessageDto } from './dto/new-message.dto';
import { User } from 'src/auth/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '../auth/interfaces';

@WebSocketGateway({ cors: true })
export class MessagesWsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() wss: Server;

  constructor(
    private readonly messagesWsService: MessagesWsService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.headers.authentication as string;
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify(token);
      await this.messagesWsService.registerClient(client, payload.id);
    } catch (error) {
      client.disconnect();
      return;
    }

    // client.join('ventas');
    // client.join(client.id);
    // client.join(User.email);
    // this.wss.to('ventas').emit('');

    this.wss.emit(
      'clientes-updated',
      this.messagesWsService.getConnectedClients(),
    );
  }

  handleDisconnect(client: Socket) {
    // console.log('cliente descconectado', client.id);
    this.messagesWsService.removeClient(client.id);
    this.wss.emit(
      'clientes-updated',
      this.messagesWsService.getConnectedClients(),
    );
  }

  @SubscribeMessage('message-from-client')
  handleMessageFromClient(client: Socket, payload: NewMessageDto) {
    //! Emite únicamente al cliente.
    // client.emit('message-from-server', { fullName: 'marcelo', message: payload.message || 'no message' });

    //! Emitir a todos menos al cliente inicial
    // client.broadcast.emit('message-from-server', { fullName: 'marcelo', message: payload.message || 'no message' });

    //! Emitir a todos
    this.wss.emit('message-from-server', {
      fullName: this.messagesWsService.getUserFullName(client.id),
      message: payload.message || 'no message',
    });
  }
}
