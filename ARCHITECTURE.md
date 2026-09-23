# Syscall architecture

## Summary

Syscall is a local-only, single-recipient/single-sender PhoneMail mail system. The API owns synchronous HTTP workflows and domain orchestration; the SMTP service owns SMTP protocol handling and security gates; the worker owns durable asynchronous delivery and delayed unread notifications. MongoDB is the source of truth for users, mail, drafts, audit records, and webhook idempotency. Redis stores sessions and BullMQ state. Raw MIME and generated attachment files live on the shared mail-storage volume. Tailscale Funnel is an optional host-side ingress that publishes only the Telnyx webhook path for end-to-end testing; data services and SMTP remain private.

## Proposed tree

```text
apps/api/       Fastify HTTP API, auth, mail, drafts, calls, Telnyx webhooks
apps/smtp/      smtp-server listener, MIME parsing, ClamAV scanning, message storage
apps/worker/    BullMQ consumers for SMTP delivery and unread SMS notifications
packages/config Shared typed environment validation
packages/db    Mongoose connection and models
packages/domain Phone, address, auth, IVR, and mail rules
packages/logging Structured logging helpers
packages/mail   MIME, attachment, raw-file, and ClamAV helpers
packages/queues BullMQ queue names and connection factory
packages/telnyx Telnyx Voice/Messaging client and webhook verification
docker/         service Dockerfiles and ClamAV configuration
scripts/        local evaluation and status helpers
storage/        local development mount points
```

## MongoDB schemas

- `users`: public UUIDv7, normalized phone fields, derived address, Argon2id password hash, password state, account state, login/revocation timestamps.
- `sessions`: not persisted in MongoDB; Redis keys contain hashed opaque session tokens and user/revocation metadata.
- `otps`: phone-scoped hashed OTP, expiry, resend timestamp, failure count, and consumed timestamp.
- `password_reset_tokens`: hashed single-use token, expiry, consumed timestamp, and user reference.
- `emails`: public UUIDv7, sender/recipient references and addresses, parsed content, attachment metadata, raw MIME path, delivery/read/spam/delete state, and timestamps.
- `drafts`: public UUIDv7, owner, recipient, content, attachment metadata, draft state, and timestamps.
- `audit_logs`: public UUIDv7, event type, optional actor and related IDs, timestamp, and non-sensitive metadata.
- `webhook_events`: provider/event ID unique index and processing timestamp for idempotency.

Indexes cover phone/address uniqueness, email public IDs, inbox queries, draft ownership, token expiry lookups, audit timestamps, and webhook event IDs.

## API contract summary

Auth routes issue opaque 30-day Redis-backed sessions through an `X-Session-Token` response/header. OTP request/verify, password login/set, logout/logout-all, forgot/reset password are under `/api/auth`. Mail routes send, list, open, soft-delete, and toggle spam. Draft routes provide CRUD and draft send. `/calls/start` starts an outbound call. Telnyx voice and SMS webhooks are under `/webhooks/telnyx`. `/health` reports process liveness and `/ready` checks MongoDB, Redis, writable storage, and ClamAV.

## Sequence flows

### IVR account creation

1. API calls Telnyx with a webhook callback URL and phone context.
2. Voice webhook verifies signature, extracts event ID, and enqueues/executes the IVR transition.
3. Option 1 normalizes the callee phone, checks `users`, and creates a user if absent.
4. The service queues a confirmation SMS and returns a Telnyx speak/gather response.

### Forgot password

1. API or IVR supplies the normalized phone.
2. The service checks the user, creates a random token, stores only its hash and a two-hour expiry, and sends an SMS link.
3. Reset validates the token, sets an Argon2id password, consumes all outstanding reset tokens, and revokes sessions.

### OTP login

1. Request validates phone and cooldown/rate limits, hashes a six-digit OTP, and sends it through the SMS queue.
2. Verify compares the hash, enforces expiry and daily failure limits, creates a Redis session, and records first-login password setup state.
3. Password set validates policy, hashes Argon2id, and clears the setup requirement.

### Sending mail

1. Authenticated API request derives `From` from the session user and validates the recipient.
2. MongoDB stores an email with `queued` status before a BullMQ job is created.
3. The worker builds MIME and sends it to the internal SMTP service through Nodemailer.
4. SMTP validates both identities, parses/scans/stores the message, and the worker updates delivery state.

### Receiving mail

1. SMTP accepts only known `@niti` sender and recipient identities.
2. MIME and attachments are validated and scanned; raw MIME/files use generated UUID paths.
3. MongoDB stores the incoming email unread and a 60-second delayed unread check is queued.

### Unread email SMS

1. The delayed job re-reads the email.
2. If `readAt` is still null, it queues an SMS containing sender, subject, and attachment count.
3. If the email was opened, no SMS is sent.

## Risks and explicit choices

- Telnyx webhook signing keys and exact event schemas vary by account/API version. The adapter isolates provider details and rejects unverifiable webhooks.
- SMTP itself is intentionally internal-only; API delivery uses the SMTP service name, never localhost.
- ClamAV is a hard dependency for accepted mail. Unavailability returns SMTP 451.
- MongoDB and Redis startup health does not prove Telnyx credentials exist. Telnyx actions fail clearly until configured.
- This implementation uses a local filesystem volume for raw mail and attachments; multi-host object storage is out of scope.
- Password setup after first OTP is enforced by a session flag; clients must call `/api/auth/password/set` before normal mail actions.
- Purging a message preserves a minimal audit event while removing content and files.
