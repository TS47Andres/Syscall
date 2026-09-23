/**
 * File: telnyx-config.ts
 * Role: Prints provider setup values derived from local configuration.
 * Service: Operations scripts.
 */
import { loadConfig } from '@syscall/config';
import { webhookUrl } from '@syscall/telnyx';

// Prints Telnyx setup instructions without fabricating missing public URLs.
function printTelnyxConfig(): void {
  const config = loadConfig();
  console.log('----------------------------------------\nTELNYX CONFIGURATION\n----------------------------------------');
  if (config.PUBLIC_WEBHOOK_BASE_URL) console.log(`Voice Webhook:\n${webhookUrl(config, 'voice')}\n\nMessaging Webhook:\n${webhookUrl(config, 'sms')}`);
  else console.log('Webhook URLs cannot yet be generated: PUBLIC_WEBHOOK_BASE_URL is missing.');
  console.log('\nWebhook API Version:\nv2\n\nOutbound Voice Application:\nRequired\n\nMessaging Profile:\nRequired\n\nRequired environment variables:\n\nTELNYX_API_KEY\nTELNYX_PUBLIC_KEY\nTELNYX_PHONE_NUMBER\nTELNYX_CONNECTION_ID\nTELNYX_MESSAGING_PROFILE_ID\n----------------------------------------');
}

printTelnyxConfig();

