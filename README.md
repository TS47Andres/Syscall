# Syscall

Syscall is a containerized backend for phone-addressed mail identities. Indian phone numbers map to local-only addresses such as `9876543210@niti`.

## Architecture

- `api` owns Fastify routes, authentication, mail orchestration, outbound-call setup, and signed Telnyx webhooks.
- `voice-agent` owns live call audio, language selection, conversation state, and narrowly scoped account actions. It uses Sarvam realtime speech recognition, chat completions, and speech synthesis for a conversational call flow.
- `smtp` validates local identities, parses MIME, scans attachments with ClamAV, and stores accepted mail.
- `worker` handles queued mail delivery, unread notifications, and Telnyx SMS.
- MongoDB stores domain records; Redis stores sessions, queues, and short-lived voice-call authorization.
- Tailscale Funnel optionally publishes only the Telnyx webhook and `/voice-stream` paths. Databases, Redis, SMTP, ClamAV, and the rest of the API stay private.

See [ARCHITECTURE.md](ARCHITECTURE.md) for data models, contracts, and call flow.
Frontend implementers and coding agents should use [FRONTEND_AGENT_SPEC.md](FRONTEND_AGENT_SPEC.md) for the detailed HTTP, auth, mail, draft, and voice integration contract.

## Local setup

```powershell
Copy-Item .env.example .env
# Configure required local services and provider credentials in .env.
docker compose up -d --build
```

The core stack starts MongoDB, Redis, ClamAV, API, SMTP, and worker. The voice agent is opt-in:

```powershell
docker compose --profile voice up -d --build
```

Set `SARVAM_API_KEY` and a random `VOICE_AGENT_API_TOKEN` in `.env` before starting the voice profile. The same internal token must be present for the API and agent. `.env.example` lists the supported settings and contains no credentials.

## Language behavior

The opening prompt is bilingual English/Hindi and asks the caller to speak their preferred language. Sarvam realtime STT detects the language; a recognized language with a configured Sarvam Bulbul v3 voice is selected and locked for the rest of the call, including Punjabi (`pa-IN`). Supported locale codes and common language names are normalized before selection, and confidence gating is used only when the detected code cannot be mapped to a supported voice. Later language-ID changes do not switch the agent's response language. The current output voices cover English, Hindi, Bengali, Tamil, Telugu, Kannada, Malayalam, Marathi, Gujarati, Punjabi, and Odia. For an unknown/unsupported language, the caller can continue in English/Hindi or use keypad options.

During the call, the agent can help with account creation and password-reset SMS. Account creation requires explicit confirmation. Press `1` to begin/confirm account creation, `2` to request password-reset instructions, and `9` to cancel a pending creation or repeat the welcome prompt.

## Tailscale Funnel

Install Tailscale for Windows, sign in, and enable HTTPS certificates and Funnel for your tailnet. Set `API_PORT` and `VOICE_AGENT_PORT` only if using non-default local ports. Start the API and voice profile, then run:

```powershell
npm run tailscale:funnel
```

The helper checks both health endpoints and publishes only `/webhooks/telnyx/` to the API and `/voice-stream` to the voice agent. Both Docker host ports bind to loopback. Copy the `https://<machine>.<tailnet>.ts.net` hostname shown by Tailscale into `.env` as `PUBLIC_WEBHOOK_BASE_URL`, then restart the stack and configure Telnyx with:

```text
https://<machine>.<tailnet>.ts.net/webhooks/telnyx/voice
https://<machine>.<tailnet>.ts.net/webhooks/telnyx/sms
```

The agent's call-media URL is generated from the same base URL. Use `npm run tailscale:funnel:status` to inspect Funnel routes and `npm run tailscale:funnel:reset` to remove them. Funnel activation changes public network state; run the helper only when ready to publish these paths. Telnyx webhook signature verification remains mandatory.

## Telnyx setup

Run `npm run telnyx:config` for the webhook URLs. Configure a Voice API application with the voice webhook, API v2, outbound connection, and assigned number. Configure a Messaging Profile with the SMS webhook and assigned number. Populate Telnyx credentials, IDs, sender configuration, and `PUBLIC_WEBHOOK_BASE_URL` in `.env`. Missing provider settings fail explicitly; they are not replaced with fake values.

## Health and logs

```powershell
curl http://localhost:3000/health
curl http://localhost:3000/ready
npm run status
docker compose logs -f api worker smtp
docker compose --profile voice logs -f voice-agent
```

## API examples

Request and verify OTP:

```powershell
curl -X POST http://localhost:3000/api/auth/otp/request -H 'content-type: application/json' -d '{"phone":"+919876543210"}'
curl -X POST http://localhost:3000/api/auth/otp/verify -H 'content-type: application/json' -d '{"phone":"+919876543210","otp":"123456"}'
```

Start an outbound conversational assistant call:

```powershell
curl -X POST http://localhost:3000/calls/start -H 'content-type: application/json' -d '{"phone":"+919876543210"}'
```

For internal SMTP evaluation, connect from another container to `smtp:2525`; do not expose it publicly. Mail is scanned by ClamAV before acceptance.

## Stop and reset

```powershell
docker compose down
docker compose down -v  # Destructively removes MongoDB, Redis, and mail-storage volumes.
```

## Current limits

Inbound calling, aliases, groups, external mail, spam classification, and public MX/DNS are outside the current implementation. The reset SMS link still requires a client-facing reset page; the API reset endpoint itself accepts a token and new password.
