import { DatabaseService } from './databaseService';
import { akaveService } from './akaveService';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Initialize all core services for the Akave AI Hub
 * This function sets up the database and storage services
 */
export async function initializeServices() {
  try {
    console.log('🔧 Initializing Akave AI Hub services...');
    
    // Initialize database service
    console.log('📦 Initializing database service...');
    const dbService = new DatabaseService();
    await dbService.initialize();
    console.log('✅ Database service initialized');
    
    // Initialize Akave O3 storage service
    console.log('☁️  Initializing Akave O3 storage...');
    await akaveService.initialize();
    console.log('✅ Akave O3 storage initialized');
    
    console.log('🎯 All core services initialized successfully');
    
    return {
      dbService,
      akaveService
    };
  } catch (error: any) {
    console.error('❌ Failed to initialize services:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'Unknown error');
    throw new Error(`Service initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Graceful shutdown of services
 */
export async function shutdownServices() {
  try {
    console.log('🔄 Shutting down services...');
    
    // Close database connections
    // Note: better-sqlite3 databases are closed automatically when the process exits
    // but you could add explicit cleanup here if needed
    
    console.log('✅ Services shutdown complete');
  } catch (error: any) {
    console.error('❌ Error during service shutdown:', error);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n⏹️  Received SIGINT, shutting down gracefully...');
  await shutdownServices();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⏹️  Received SIGTERM, shutting down gracefully...');
  await shutdownServices();
  process.exit(0);
});