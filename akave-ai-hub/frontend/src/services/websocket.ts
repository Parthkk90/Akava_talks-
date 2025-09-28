import { storage } from './storage';

class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;

  constructor() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.url = `${protocol}//${window.location.host}/ws`;
  }

  connect(): void {
    const token = storage.getToken();
    if (!token) {
      console.error('WebSocket: No auth token found.');
      return;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket is already connected.');
      return;
    }

    this.ws = new WebSocket(`${this.url}?token=${token}`);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
    };

    this.ws.onmessage = (event) => {
      console.log('WebSocket message received:', event.data);
      // Here you can handle incoming messages and update the app state
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      // Optionally, implement reconnection logic here
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
    }
  }

  sendMessage(type: string, payload: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    } else {
      console.error('WebSocket is not connected.');
    }
  }
}

export const webSocketClient = new WebSocketClient();
