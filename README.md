# Syscall

Syscall is a production-style local backend foundation for the PhoneMail hackathon concept: Indian phone numbers become local-only identities such as `9876543210@niti`.

## Architecture

- `api` owns Fastify HTTP routes, auth/session orchestration, drafts, mail APIs, calls, and Telnyx webhooks.
- `smtp` is the internal `smtp-server` listener. It validates local identities, parses MIME, validates/scans attachments, and stores accepted mail.
- `worker` consumes BullMQ jobs for SMTP delivery, delayed unread checks, and Telnyx SMS.
- MongoDB stores domain records and audit logs; Redis stores sessions and queue state; ClamAV is mandatory for accepted messages.
- Tailscale Funnel provides optional host-side HTTPS ingress for Telnyx webhooks without requiring a custom domain.

See [ARCHITECTURE.md](ARCHITECTURE.md) for schemas, contracts, flows, decisions, and risks.

## Start locally

```powershell
Copy-Item .env.example .env
# Populate Telnyx values when testing provider integrations.
docker compose up -d --build
```

The required deployment command is `docker compose up -d` after `.env` is configured. Compose starts MongoDB, Redis, ClamAV, API, SMTP, and worker. SMTP is only reachable inside the Docker network. Public ingress is managed outside Docker by Tailscale so the database, queue, SMTP listener, and malware scanner remain private.

## Environment

All supported variables are listed in `.env.example`. Required operational values are `MONGODB_URI`, `REDIS_URL`, `SMTP_HOST`, `CLAMAV_HOST`, `CLAMAV_PORT`, storage paths, and—when using Telnyx—`TELNYX_API_KEY`, `TELNYX_PUBLIC_KEY`, `TELNYX_PHONE_NUMBER`, `TELNYX_CONNECTION_ID`, `TELNYX_MESSAGING_PROFILE_ID`, and `PUBLIC_WEBHOOK_BASE_URL`.

## Tailscale Funnel

Install Tailscale for Windows, sign in, and enable MagicDNS, HTTPS certificates, and Funnel for your tailnet. Tailscale provides a `*.ts.net` hostname and HTTPS certificate.

After the Docker stack is healthy, run:

```powershell
npm run tailscale:funnel
```

The helper checks the local API and publishes only `/webhooks/telnyx`. It does not expose MongoDB, Redis, SMTP, ClamAV, or the rest of the API. Copy the hostname printed by Tailscale and set it in `.env`:

```env
PUBLIC_WEBHOOK_BASE_URL=https://<your-machine>.<your-tailnet>.ts.net
```

The generated Telnyx URLs are then:

```text
https://<your-machine>.<your-tailnet>.ts.net/webhooks/telnyx/voice
https://<your-machine>.<your-tailnet>.ts.net/webhooks/telnyx/sms
```

Use `npm run tailscale:funnel:status` to inspect the current route and `npm run tailscale:funnel:reset` to remove it. The URL is public, so Telnyx signature verification remains mandatory.

## Telnyx setup

After the stack is healthy, run `npm run telnyx:config`. Configure a Telnyx Voice Application using the voice webhook URL, enable the outbound connection, configure the Messaging Profile using the SMS webhook URL, then populate the five Telnyx variables in `.env` and restart the stack. Missing Telnyx settings do not fake provider actions; affected endpoints return a configuration error.

## Health and logs

```powershell
curl http://localhost:3000/health
curl http://localhost:3000/ready
npm run status
docker compose logs -f api worker smtp
docker compose logs -f mongodb redis clamav
```

## API examples

Request OTP:

```powershell
curl -X POST http://localhost:3000/api/auth/otp/request -H 'content-type: application/json' -d '{"phone":"+919876543210"}'
```

Verify OTP and save the returned session token:

```powershell
curl -X POST http://localhost:3000/api/auth/otp/verify -H 'content-type: application/json' -d '{"phone":"+919876543210","otp":"123456"}'
```

Set a first password or log in with `/api/auth/password/login`, then use `X-Session-Token` for mail:

```powershell
curl http://localhost:3000/api/mail -H "X-Session-Token: <session-token>"
curl -X POST http://localhost:3000/api/mail/send -H "X-Session-Token: <session-token>" -H 'content-type: application/json' -d '{"to":"9123456789@niti","subject":"Hello","textBody":"Local mail test"}'
curl http://localhost:3000/api/mail/<public-id> -H "X-Session-Token: <session-token>"
```

Start an outbound IVR call:

```powershell
curl -X POST http://localhost:3000/calls/start -H 'content-type: application/json' -d '{"phone":"+919876543210"}'
```

For direct SMTP testing from another container, use Nodemailer or `swaks` against `smtp:2525` with a known sender and recipient; keep TLS disabled because this listener is Docker-network-internal and not a public relay. The worker uses the same internal endpoint for API mail delivery, so the full SMTP validation path is exercised automatically.

## Stop and reset

```powershell
docker compose down
docker compose down -v  # removes named MongoDB, Redis, and mail-storage volumes
```

The volume reset command is destructive and removes local persisted data.

## Final handoff checklist

- Containers: `api`, `smtp`, `worker`, `mongodb`, `redis`, `clamav`.
- Host port: `3000` by default (`API_PORT` controls the host side). SMTP is internal on `2525`; MongoDB, Redis, and ClamAV are internal only.
- Missing variables in a fresh `.env`: Telnyx credentials and `PUBLIC_WEBHOOK_BASE_URL`. These are intentionally not fabricated.
- Tailscale action: sign in, enable Funnel, run `npm run tailscale:funnel`, and copy the generated hostname into `PUBLIC_WEBHOOK_BASE_URL`.
- Telnyx action: configure the Voice Application, Messaging Profile, and webhook URLs printed by `npm run telnyx:config`.
- Known limitations: inbound calling, aliases, groups, external mail, spam classification, and public MX/DNS are intentionally not implemented. Telnyx provider event variation may require account-specific IVR event mapping.
