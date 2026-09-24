# Syscall architecture

## Summary

Syscall is a containerized, single-recipient/single-sender phone-addressed mail system. The API owns synchronous HTTP workflows and domain orchestration; SMTP owns protocol handling and security gates; the worker owns durable asynchronous delivery and delayed unread notifications. MongoDB is the source of truth for users, mail, drafts, audit records, and webhook idempotency. Redis stores sessions, BullMQ state, and short-lived voice-call authorization. Raw MIME and generated attachment files live on the shared mail-storage volume. Optional Tailscale Funnel ingress publishes only Telnyx webhook paths and the voice media WebSocket path.

## Service boundaries

```text
apps/api/       Fastify HTTP API, auth, mail, calls, Telnyx webhooks
apps/voice-agent/ Telnyx media WebSocket, Sarvam speech/chat, call-scoped actions
apps/smtp/      SMTP listener, MIME parsing, ClamAV scanning, message storage
apps/worker/    BullMQ consumers for mail delivery and unread SMS notifications
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

- `users`: public UUIDv7, normalized phone fields, derived address, Argon2id password hash, password state, account state, login/revocation timestamps.
- `sessions`: Redis keys contain hashed opaque session tokens and user/revocation metadata.
- `otps`: phone-scoped hashed OTP, expiry, resend timestamp, failure count, and consumed timestamp.
- `password_reset_tokens`: hashed single-use token, expiry, consumed timestamp, and user reference.
- `emails`: public UUIDv7, sender/recipient references and addresses, parsed content, attachment metadata, raw MIME path, delivery/read/spam/delete state, and timestamps.
- `drafts`: public UUIDv7, owner, recipient, content, attachment metadata, draft state, and timestamps.
- `audit_logs`: public UUIDv7, event type, optional actor and related IDs, timestamp, and non-sensitive metadata.
- `webhook_events`: provider/event ID unique index and processing timestamp for idempotency.

Indexes cover phone/address uniqueness, email public IDs, inbox queries, draft ownership, token expiry lookups, audit timestamps, and webhook event IDs.

## API contract

Auth routes issue opaque Redis-backed sessions through `X-Session-Token`. OTP request/verify, password login/set, logout/logout-all, and forgot/reset password are under `/api/auth`. Mail routes send, list, open, soft-delete, and toggle spam. Draft routes provide CRUD and draft send. `/calls/start` starts an outbound voice-agent call and returns a Telnyx call-control ID. Telnyx voice and SMS webhooks are under `/webhooks/telnyx`. Private API routes under `/internal/voice` require the shared `VOICE_AGENT_API_TOKEN` and accept only one-time session activation, call-scoped account/reset actions, and session closure. `/health` reports liveness; `/ready` checks API dependencies.

## Conversational call sequence

1. `/calls/start` stores a short-lived random stream ticket in Redis and asks Telnyx to call the normalized Indian number. The ticket is included only in the media-stream URL; Redis stores its hash and destination number.
2. Tailscale Funnel routes `/voice-stream` to the loopback-bound voice-agent container and `/webhooks/telnyx/` to the API. The agent validates the ticket before accepting the WebSocket upgrade.
3. Telnyx starts a bidirectional 8 kHz mono PCMU stream. The agent checks the call-control ID, called number, and codec, then consumes the one-time ticket through an authenticated API call.
4. The agent opens Sarvam realtime STT with automatic language detection and plays a bilingual English/Hindi welcome prompt. A detected locale that maps to a supported voice (including Punjabi `pa-IN`) is selected and locked for the call; supported locales are not rejected based on confidence. Confidence gating applies only when the detected code is unknown or unmapped. Later STT language-ID changes cannot switch responses or speech synthesis to another language.
5. Sarvam chat completion selects from a narrow tool set. Account creation requires a distinct caller confirmation turn; password reset sends generic SMS instructions. The API resolves the phone number from the active call record rather than trusting model-provided identity.
6. Sarvam TTS returns 8 kHz mu-law audio, which the agent packetizes into 20 ms Telnyx media frames. Caller speech interrupts queued audio. Press `1` begins/confirms account creation, `2` requests reset SMS, and `9` cancels pending creation or repeats the greeting.
7. When the Telnyx stream closes, the agent stops recognition/synthesis and removes the API-side call authorization.

## Password reset

1. API or agent supplies the normalized phone number.
2. The service looks up the account, creates a random token, stores only its hash and configured expiry, and enqueues an SMS with a reset URL. The response does not reveal whether an account exists.
3. `/api/auth/reset-password` validates a submitted token, sets an Argon2id password, consumes outstanding reset tokens, revokes sessions, and audits completion.

The backend endpoint exists; a separate user-facing reset page is not included in this backend repository and must be provided by a client before the SMS link can complete the workflow.

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

## Security and operational choices

- Telnyx webhooks are signature-verified and event IDs are deduplicated.
- Voice stream tickets are random, short-lived, one-time, and stored only as hashes. Internal agent routes require a configured shared secret; provider credentials never enter call prompts or logs.
- Voice actions are limited to the caller number bound to a live Telnyx call. Account creation is explicitly confirmed; reset messaging is generic to prevent account enumeration.
- Host ports for API and voice agent bind to loopback. Funnel publishes only required provider paths; MongoDB, Redis, SMTP, and ClamAV remain private.
- SMTP is internal-only. ClamAV is a hard dependency for accepted mail; unavailability returns SMTP 451.
- Raw mail/attachment storage uses generated paths on a local filesystem volume; multi-host object storage is out of scope.
- Provider webhook schemas and voice quality depend on Telnyx account configuration and should be evaluated with controlled calls before production use.
