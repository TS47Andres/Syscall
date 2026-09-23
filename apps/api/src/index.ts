/**
 * File: index.ts
 * Role: Starts the Syscall HTTP API and manages its shared connections.
 * Service: API.
 */
import { Redis } from 'ioredis';
import { loadConfig } from '@syscall/config';
import { connectDatabase, disconnectDatabase } from '@syscall/db';
import { createLogger } from '@syscall/logging';
import { buildApp } from './app.js';

// Starts the API after validating configuration and infrastructure dependencies.
async function start(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger('api-bootstrap');
  await connectDatabase(config.MONGODB_URI);
  const redis = new Redis(config.REDIS_URL);
  await redis.ping();
  const { app } = await buildApp(config, redis);
  const shutdown = async (signal: string): Promise<void> => { logger.info({ signal }, 'Shutting down API'); await app.close(); await redis.quit(); await disconnectDatabase(); process.exit(0); };
  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  await app.listen({ port: config.API_PORT, host: '0.0.0.0' });
  logger.info({ port: config.API_PORT }, 'Syscall API listening');
}

void start().catch((error: unknown) => { const logger = createLogger('api-bootstrap'); logger.error({ err: error }, 'API failed to start'); process.exit(1); });
