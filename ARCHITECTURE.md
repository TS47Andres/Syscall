# Syscall architecture

## Summary

Syscall is a containerized, single-recipient/single-sender phone-addressed mail system. The API owns synchronous HTTP workflows and domain orchestration; SMTP owns protocol handling and security gates; the worker owns durable asynchronous delivery and delayed unread notifications. MongoDB is the source of truth for users, mail, drafts, audit records, and webhook idempotency. Redis stores sessions, BullMQ state, and short-lived voice-call authorization. Raw MIME and generated attachment files live on the shared mail-storage volume. Optional Tailscale Funnel ingress publishes only Telnyx webhook paths and the voice media WebSocket path.

## Service boundaries

```text
frontend/      React/Vite browser application, built and served by Nginx
apps/api/       Fastify HTTP API, auth, mail, calls, Telnyx webhooks
apps/voice-agent/ Telnyx media WebSocket, Sarvam speech/chat, call-scoped actions
apps/smtp/      SMTP listener, MIME parsing, ClamAV scanning, message storage
apps/worker/    BullMQ consumers for immediate/delayed mail delivery and SMS notifications
packages/config Shared typed environment validation
packages/db     Mongoose connection and models
packages/domain Phone, address, auth, and mail rules
packages/logging Structured logging helpers
packages/mail   MIME, attachment, raw-file, and ClamAV helpers
packages/queues BullMQ queue names and connection factory
packages/telnyx Telnyx Voice/Messaging client and webhook verification
docker/         Service Dockerfiles and ClamAV configuration
scripts/        Local evaluation and status helpers
storage/        Local development mount points
```

## MongoDB schemas

- `users`: public UUIDv7, normalized phone fields, derived address, display name, optional generated avatar key, Argon2id password hash, password state, account state, login/revocation timestamps.
- `sessions`: Redis keys contain hashed opaque session tokens and user/revocation metadata.
- `otps`: phone-scoped hashed OTP, expiry, resend timestamp, failure count, and consumed timestamp.
- `password_reset_tokens`: hashed single-use token, expiry, consumed timestamp, and user reference.
- `emails`: public UUIDv7, sender/recipient references and addresses, parsed content and RFC thread headers, attachment metadata, raw MIME path, delivery/read/spam, participant-scoped star/trash/permanent-delete state, schedule time/version/source, and timestamps.
- `drafts`: public UUIDv7, owner, recipient, content, attachment metadata, draft state, and timestamps.
- `audit_logs`: public UUIDv7, event type, optional actor and related IDs, timestamp, and non-sensitive metadata.
- `webhook_events`: provider/event ID unique index and processing timestamp for idempotency.

Indexes cover phone/address uniqueness, email public IDs, inbox queries, draft ownership, token expiry lookups, audit timestamps, and webhook event IDs.

## API contract

The `frontend` Compose service serves the compiled SPA independently on host port 8080 by default. Nginx proxies `/api/`, `/calls/`, `/ready`, and `/health` to the API container, keeping browser calls same-origin without changing the API's CORS policy. Vite uses an equivalent localhost API proxy for development. Set `FRONTEND_PORT` to override the published browser port.

Auth routes issue opaque Redis-backed sessions through `X-Session-Token`. OTP request/verify, password login/set, logout/logout-all, forgot/reset password, and session inspection are under `/api/auth`. `POST /api/onboarding/call-request` starts rate-limited browser signup and carries short-lived caller-name context into the voice session. Mail routes send or reply with RFC thread headers, create/list/reschedule/cancel scheduled messages, list/open/trash/restore/permanently delete messages, download authorized attachments, and toggle participant-scoped stars and recipient spam. Draft routes provide attachment-aware CRUD and send. Profile routes read and update display name and generated JPEG avatar. `/calls/start` remains the general outbound call endpoint. Telnyx voice and SMS webhooks are under `/webhooks/telnyx`. Private API routes under `/internal/voice` require the shared `VOICE_AGENT_API_TOKEN` and accept one-time session activation, call-scoped actions, current-time context, and session closure. `/health` reports liveness; `/ready` checks API dependencies.

## Conversational call sequence

1. `POST /api/onboarding/call-request` rate-limits by destination number, rejects existing active accounts, stores a short-lived random stream ticket and requested display name in Redis, then asks Telnyx to call the normalized Indian number. General calls use `/calls/start` and do not receive account-creation tools. The ticket is included only in the media-stream URL; Redis stores its hash and call context.
2. Tailscale Funnel routes `/voice-stream` to the loopback-bound voice-agent container and `/webhooks/telnyx/` to the API. The agent validates the ticket before accepting the WebSocket upgrade.
3. Telnyx starts a bidirectional 8 kHz mono PCMU stream. The agent checks the call-control ID, called number, and codec, then consumes the one-time ticket through an authenticated API call.
4. The agent opens Sarvam realtime STT with automatic language detection and plays a bilingual English/Hindi welcome prompt. For each caller turn, it selects a supported voice from that turn's detected locale and transcript script; confident language changes take effect immediately. A previous turn's voice is only a fallback for an ambiguous turn, not a call-wide lock.
5. On account-setup calls, the assistant reads back the supplied name and waits for the caller to confirm or correct it. After name confirmation, it asks whether to create the account. The API changes call state to allow account creation only after the question has actually been spoken, and only exposes `create_account` for the caller's next clear affirmative answer. Ordinary calls cannot use this tool. Password-reset requests send generic SMS instructions. For email, the agent gathers the recipient's ten-digit phone number, subject, and complete plain-text body across turns; the API appends `LOCAL_MAIL_DOMAIN` and validates the active Syscall account. For immediate delivery, it stages or revises the draft, reads back its destination and summary, then exposes send only after an affirmative answer to the just-spoken confirmation. For scheduled delivery, it also resolves a relative delay or India-local date/time, reads back the exact IST time, and only creates the schedule after caller confirmation. The voice-agent fetches current backend time and timezone context on each caller turn. The API anchors relative delays to its own clock. It also exposes tools to list, cancel, and reschedule pending voice schedules. An immediate confirmed send reports that it was queued; a scheduled send reports its scheduled time, never that it has already been delivered. A final failure SMS is queued only after a voice scheduled email's SMTP attempt starts and exhausts retries. Once a request is completed, the assistant asks whether more help is needed in the current language.
6. After that check-in, the voice-agent exposes `end_call` to Sarvam. The model interprets the caller's natural-language reply and decides whether it is a clear no; there is no local fixed phrase list. If selected, the agent speaks a localized goodbye, waits for Telnyx's playback mark when available, then invokes the API's authenticated hang-up action. Telnyx's `call.hangup` webhook is logged as the provider confirmation. The API resolves the active call-control ID rather than trusting model-provided identity.
7. Sarvam TTS returns 8 kHz mu-law audio, which the agent packetizes into 20 ms Telnyx media frames. Sarvam VAD speech-start interrupts active synthesis, clears Telnyx's queued audio, and aborts an in-flight chat request. The finalized caller transcript is added to conversation history. Callers request account actions conversationally; there is no keypad menu or DTMF action handler.
8. When the Telnyx stream closes, the agent stops recognition/synthesis and removes the API-side call authorization.

## Password reset

1. API or agent supplies the normalized phone number.
2. The service looks up the account, creates a random token, stores only its hash and configured expiry, and enqueues an SMS with a reset URL. The response does not reveal whether an account exists.
3. `/api/auth/reset-password` validates a submitted token, sets an Argon2id password, consumes outstanding reset tokens, revokes sessions, and audits completion.

The frontend offers OTP-based password recovery and accepts an existing one-time reset token on `/reset-password`; the API remains authoritative for token consumption and password policy.

## OTP login

1. Request validates phone and cooldown/rate limits, hashes a six-digit OTP, and sends it through the SMS queue.
2. Verify compares the hash, enforces expiry and daily failure limits, creates a Redis session, and records first-login password setup state.
3. Password set validates policy, hashes with Argon2id, and clears the setup requirement.

## Sending and receiving mail

1. An authenticated API request derives `From` from the session user and validates the recipient.
2. MongoDB stores an email with `queued` status before a BullMQ job is created.
3. The worker builds MIME and sends it to the internal SMTP service through Nodemailer.
4. SMTP validates identities, parses and scans attachments, stores accepted mail, and updates delivery state.
5. A delayed unread job re-reads the email and queues an SMS only if it is still unread.

Scheduled email creation accepts a complete message directly through `POST /api/mail/scheduled`; it does not require a draft. MongoDB stores status `scheduled`, a UTC `scheduledAt`, and a monotonically increasing `scheduleVersion`. BullMQ holds a delayed job keyed by email ID and version. The worker atomically transitions only the matching due version from `scheduled` to `queued` before using the existing SMTP retry path. The periodic worker recovery pass reconciles MongoDB scheduled records with missing, failed, or completed queue jobs, so a Redis job loss does not silently drop the schedule. Rescheduling enqueues a new version before updating MongoDB, then invalidates the previous job; cancellation atomically changes status and increments the version before best-effort queue removal. These version checks make a stale or racing delayed job a no-op. Schedule times are constrained to 1 minute through 365 days ahead. The recipient-facing list/detail routes hide `scheduled` and `cancelled` messages; the sender can list their pending schedules and change/cancel only while status remains `scheduled`.

Voice email uses the same queue and delivery path, without attachments. The private API resolves the sender from the active call's bound phone number and requires that account to be active; it also requires the recipient to be an existing active Syscall account. Immediate-send drafts remain in Redis under the call ID for up to 15 minutes and are removed after send, discard, or call close. For schedules, the complete message and resolved future time are staged under that call-scoped key, then the confirmed internal action persists the complete email and delayed job. Relative phrases such as “after 2 days” mean exactly 48 hours. Absolute date/time strings include the `+05:30` offset. Time context comes from an authenticated internal API route; backend time is authoritative. `scheduledByVoice` allows the worker to queue the sender's technical-failure SMS only after a scheduled SMTP attempt starts and ultimately fails, not when the schedule is created or cancelled.

## Security and operational choices

- Telnyx webhooks are signature-verified and event IDs are deduplicated.
- Voice stream tickets are random, short-lived, one-time, and stored only as hashes. Internal agent routes require a configured shared secret; provider credentials never enter call prompts or logs.
- Voice actions are limited to the phone number bound to a live Telnyx call. Browser account creation requires sequential caller-name confirmation and explicit account-creation consent; ordinary calls cannot create accounts. Reset messaging is generic to prevent account enumeration. Voice email sending requires the staged-draft confirmation flow described above.
- Scheduled email APIs require a user session and configured password. Each schedule is sender-owned; recipients cannot view it before delivery starts. Cancellation and rescheduling are conditional atomic state changes, and versioned delayed jobs cannot bypass them.
- Voice email currently treats the number being called as the sender identity, as agreed for this stage; OTP/account authentication is a planned later safeguard. Email content is staged briefly in Redis and is never logged by the voice agent or API action route.
- Host ports for API and voice agent bind to loopback. Funnel publishes only required provider paths; MongoDB, Redis, SMTP, and ClamAV remain private.
- SMTP is internal-only. ClamAV is a hard dependency for accepted mail; unavailability returns SMTP 451.
- Raw mail/attachment storage uses generated paths on a local filesystem volume; multi-host object storage is out of scope.
- Provider webhook schemas and voice quality depend on Telnyx account configuration and should be evaluated with controlled calls before production use.
