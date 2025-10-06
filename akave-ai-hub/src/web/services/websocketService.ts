import { WebSocketServer } from 'ws';
import { WebSocket } from 'ws';
import { Server as HttpServer } from 'http';
import { URL } from 'url';
import { EventEmitter } from 'events';
import * as jose from 'jose';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in the .env file');
}

// Define the structure of a message
interface WebSocketMessage {
  type: string;
  payload: any;
}

export class WebSocketService extends EventEmitter {
  private wss: WebSocketServer | null = null;
  // A map to store connected clients, mapping user ID to WebSocket instance
  private clients: Map<string, WebSocket> = new Map();

  constructor(httpServer?: HttpServer) {
    super();
    if (httpServer) {
      this.attachToServer(httpServer);
    }
  }

  public attachToServer(httpServer: HttpServer): void {
    if (this.wss) {
      // Close existing WebSocket server if it exists
      this.wss.close();
    }
    
    this.wss = new WebSocketServer({
      server: httpServer, 
      path: '/ws' 
    });
    
    this.initialize();
    this.emit('attached');
  }

  private initialize(): void {
    if (!this.wss) {
      throw new Error('WebSocket server not initialized');
    }
    
    this.wss.on('connection', async (ws: WebSocket, req) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const token = url.searchParams.get('token');

      if (!token) {
        console.log('WebSocket connection rejected: No token provided.');
        ws.close(1008, 'Token required');
        return;
      }

      try {
        const secret = new TextEncoder().encode(JWT_SECRET);
        const { payload } = await jose.jwtVerify(token, secret);
        const userId = payload.id as string;

        // Store the authenticated client
        this.clients.set(userId, ws);
        console.log(`WebSocket client connected and authenticated for user: ${userId}`);

        ws.on('message', (message: string) => {
          this.handleMessage(userId, message);
        });

        ws.on('close', () => {
          this.clients.delete(userId);
          console.log(`WebSocket client disconnected for user: ${userId}`);
        });

        ws.on('error', (error) => {
          console.error(`WebSocket error for user ${userId}:`, error);
          this.clients.delete(userId);
        });

        // Send a welcome message
        ws.send(JSON.stringify({ type: 'connection_ack', payload: { message: 'Connection successful' } }));

      } catch (error) {
        console.log('WebSocket connection rejected: Invalid token.');
        ws.close(1008, 'Invalid token');
      }
    });

    console.log('WebSocket service initialized.');
  }

  private handleMessage(userId: string, message: string): void {
    try {
      const parsedMessage: WebSocketMessage = JSON.parse(message);
      console.log(`Received message from user ${userId}:`, parsedMessage);

      // Here you can implement logic to handle different message types
      // For example, subscribing to training job updates, etc.
      switch (parsedMessage.type) {
        case 'ping':
          this.sendMessage(userId, { type: 'pong', payload: 'ok' });
          break;
        // Add more cases as needed
        default:
          this.sendMessage(userId, { type: 'error', payload: 'Unknown message type' });
      }
    } catch (error) {
      console.error(`Failed to parse message from user ${userId}:`, message);
    }
  }

  public sendMessage(userId: string, message: WebSocketMessage): boolean {
    const client = this.clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  public broadcastToUser(userId: string, type: string, payload: any): boolean {
    return this.sendMessage(userId, { type, payload });
  }

  public broadcast(message: WebSocketMessage): void {
    this.clients.forEach((client, userId) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  public shutdown(): void {
    this.clients.forEach((client) => client.close());
    if (this.wss) {
      this.wss.close();
    }
  }
}