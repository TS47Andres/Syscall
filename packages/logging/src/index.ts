/**
 * File: index.ts
 * Role: Provides consistent structured JSON logging.
 * Service: Shared logging package.
 */
import pino, { type Logger } from 'pino';

// Creates a service-scoped logger with JSON output suitable for Docker logs.
export function createLogger(service: string): Logger {
  return pino({ base: { service }, level: process.env.LOG_LEVEL ?? 'info' });
}

