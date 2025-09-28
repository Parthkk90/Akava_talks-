import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { setupRoutes } from './routes';
import { initializeServices } from './services/initializeServices';
import { akaveService } from './services/akaveService';
import { BlockchainService } from './services/blockchainService';
import { WebSocketService } from './services/websocketService';
import { TrainingService } from './services/trainingService';
import { QueryService } from './services/queryService';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize services and start server
async function startServer() {
  try {
    console.log('🚀 Starting Akave AI Hub server...');
    
    // Initialize core services
    const { dbService } = await initializeServices();
    
    // Initialize other services
    console.log('⚙️ Setting up additional services...');
    const blockchainService = new BlockchainService();
    const wsService = new WebSocketService(); // Will attach to HTTP server after it's created
    const trainingService = new TrainingService(dbService, akaveService, wsService);
    const queryService = new QueryService(dbService, akaveService);
    
    // Setup routes
    console.log('🛣️ Setting up routes...');
    app.use('/api', setupRoutes(
      dbService, 
      akaveService, 
      blockchainService, 
      wsService, 
      trainingService, 
      queryService
    ));

    // Health check
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        contract: process.env.MANIFEST_REGISTRY_CONTRACT_ADDRESS,
        services: ['database', 'akave', 'blockchain', 'websocket']
      });
    });

    // Error handling
    app.use(notFoundHandler);
    app.use(errorHandler);
    
    const server = app.listen(PORT, () => {
      // Now attach the WebSocket service to the HTTP server
      wsService.attachToServer(server);
      
      console.log('🎉 Server started successfully!');
      console.log(`🌐 Server running on http://localhost:${PORT}`);
      console.log(`💊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔌 API endpoints: http://localhost:${PORT}/api`);
      console.log(`🔗 Contract: ${process.env.MANIFEST_REGISTRY_CONTRACT_ADDRESS}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    });
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n⏹️  Received SIGINT, shutting down gracefully...');
      server.close(() => {
        console.log('✅ HTTP server closed');
        process.exit(0);
      });
    });

    process.on('SIGTERM', async () => {
      console.log('\n⏹️  Received SIGTERM, shutting down gracefully...');
      server.close(() => {
        console.log('✅ HTTP server closed');
        process.exit(0);
      });
    });
  } catch (error: any) {
    console.error('❌ Failed to start server:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'Unknown error');
    process.exit(1);
  }
}

startServer();

export default app;