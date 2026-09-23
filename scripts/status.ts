/**
 * File: status.ts
 * Role: Prints concise dependency and integration readiness diagnostics.
 * Service: Operations scripts.
 */
import { loadConfig, isTelnyxConfigured } from '@syscall/config';

// Queries the API readiness endpoint without printing any secret values.
async function printStatus(): Promise<void> {
  const config = loadConfig();
  try {
    const response = await fetch(`http://127.0.0.1:${config.API_PORT}/ready`);
    const body = await response.json() as { dependencies?: Record<string, boolean> };
    const dependencies = body.dependencies ?? {};
    for (const [name, ready] of Object.entries(dependencies)) console.log(`${name}: ${ready ? 'READY' : 'NOT READY'}`);
  } catch (error) {
    console.error(`API readiness unavailable: ${error instanceof Error ? error.message : 'unknown error'}`);
    process.exitCode = 1;
  }
  console.log(`Public webhook base URL: ${config.PUBLIC_WEBHOOK_BASE_URL ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
  console.log(`Telnyx: ${isTelnyxConfigured(config) ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
}

void printStatus();
