# Syscall Frontend Integration Specification

This document is the implementation-facing contract for an AI coding agent building Syscall's frontend. It describes the backend as it exists in this repository; it is not a proposal for routes that do not exist. If this document and a live response differ, treat the running API and route implementation as authoritative, and update this document with any contract change.

## 1. Product and integration overview

Syscall is a phone-addressed, local-only mail application. An Indian mobile number maps to an address such as `9876543210@niti` (the domain is configurable, although `niti` is the current default). The backend provides authentication, account metadata, outbound/inbound mail records, drafts, spam flags, password reset, and an outbound conversational voice assistant.

The API is a JSON HTTP service, normally at `http://localhost:3000` for local development. All application routes are rooted at `/`; the API does not use a global `/api/v1` prefix. JSON request bodies must use `Content-Type: application/json`. Phone numbers should be sent in Indian E.164 format (`+91` followed by ten digits), except that the auth services normalize several input formats internally.

The backend currently has no frontend UI, OpenAPI/Swagger document, refresh-token endpoint, account-profile update endpoint, account-deletion endpoint, server-side search, pagination parameters, or public account-registration endpoint. New account creation is currently initiated through the voice assistant; OTP verification is for an account that already exists.

### Service and URL boundaries

| Surface | Typical local URL | Intended caller |
|---|---|---|
| API | `http://localhost:3000` | Frontend, local tools, Telnyx webhooks |
| Voice agent health | `http://localhost:4000/health` | Operations/health checks only; port binds to loopback |
| Voice media WebSocket | `wss://<tailnet-host>/voice-stream?...` | Telnyx only |
| Internal voice routes | API paths under `/internal/voice/...` | Voice-agent container only |
| Telnyx webhooks | `/webhooks/telnyx/voice`, `/webhooks/telnyx/sms` | Telnyx only |

Tailscale Funnel, when enabled, publishes only Telnyx webhook paths and the voice-media WebSocket path. Do not build the browser frontend against internal voice or provider webhook routes.

## 2. Browser integration and shared HTTP behavior

### CORS and development proxy

The API registers CORS with `origin: false`, so it does not currently grant cross-origin browser access. A browser app on a different origin will fail CORS checks even if the API itself is reachable. For local frontend work, proxy `/` API requests through the frontend dev server or serve both from one origin. For a separately hosted browser frontend, the backend needs an explicit allowlist for the frontend origin before direct browser requests can work. Do not use `mode: "no-cors"`; that makes responses unreadable and does not solve the integration.

### JSON, status codes, and errors

- Success responses are JSON. Empty success responses are not used by the documented routes.
- Error responses use `{ "error": "message" }`.
- Zod input-validation errors map to HTTP `400`.
- Explicit authentication/authorization/not-found errors use their route-specific `401`, `403`, or `404` statuses.
- Unexpected errors default to HTTP `500` and the generic body `{ "error": "Internal server error" }`.
- Several expected domain/service failures currently throw ordinary errors and therefore also map to `500` (examples: invalid/expired OTP, OTP cooldown, nonexistent login account, unavailable recipient, and some attachment failures). Do not assume these are `400`, `401`, `409`, or `413` until the backend error mapping is improved. A frontend should show a safe, retryable generic message for unrecognized `500`s and avoid depending on exact internal error text.
- Error message strings are not a stable machine-readable error code. There is no `code`, `details`, or field-error array in the current error envelope.
- Do not assume list responses include pagination metadata or a total count.

### Authentication header and session handling

Successful login and OTP verification return an opaque `sessionToken` in the JSON response. Send it on protected routes as:

```http
X-Session-Token: <sessionToken>
```

There is no `Authorization: Bearer` implementation and no cookie-based session flow. Sessions are Redis-backed and expire according to `SESSION_TTL_DAYS` (default 30 days). Password reset and logout-all revoke all earlier sessions. There is no refresh endpoint; when a protected route returns `401`, clear the frontend session and require the user to authenticate again.

Treat the token as a credential: keep it out of URLs, logs, analytics, error reporting, and persistent browser storage where possible. The current backend does not issue an HttpOnly cookie, so frontend architecture must account for the security tradeoff of storing a JavaScript-accessible token. Logout should call the backend and then clear the local copy regardless of the response.

## 3. Shared data and validation rules

### Phone numbers and addresses

- Canonical internal/public phone representation is an Indian number: `+91[6-9][0-9]{9}`.
- The auth services call a normalizer that accepts input containing either a ten-digit Indian number or twelve digits beginning with `91` (punctuation is stripped before validation). Prefer to send canonical E.164 anyway.
- `/calls/start` uses a stricter route schema and requires exact `+91` E.164 form.
- Public `user.phone` is the ten-digit local portion without `+91`.
- Public mail addresses match `[6-9][0-9]{9}@[a-z0-9.-]+`; the intended recipient must be an existing active Syscall user. Current default domain is `niti`.

### Password

Password policy for set/reset is 8–128 characters, with at least one uppercase ASCII letter, one lowercase ASCII letter, one digit, and one non-alphanumeric special character. Password login accepts a string and checks it against the stored hash; the policy is enforced when setting/changing via the set/reset endpoints.

### Attachment

Attachment JSON is `{ "filename": string, "contentType": string, "contentBase64": string }`. Current allowed extension/MIME families are PDF, PNG, JPG/JPEG, GIF, TXT, DOC/DOCX, XLS/XLSX, PPT/PPTX, and ZIP. The extension and MIME type must be allowed and binary formats are checked against magic bytes. Each decoded attachment is limited by `MAX_ATTACHMENT_SIZE_MB` (default 10 MB); total decoded attachment bytes in one message are limited by `SMTP_MAX_MESSAGE_SIZE_MB` (default 25 MB). ClamAV scans mail as part of delivery/SMTP processing.

The Fastify API does not override its JSON body limit. Base64 increases payload size, so the effective HTTP request limit may be reached before the configured decoded attachment limits. Large-attachment support must be validated against the running deployment; do not promise a 10 MB upload from the current contract alone.

## 4. Public frontend endpoints

### Health and readiness

#### `GET /health`

Process liveness only; it does not prove dependencies or Telnyx are available.

Response `200`:

```json
{ "status": "ok", "service": "api" }
```

#### `GET /ready`

Checks MongoDB, Redis, ClamAV, and writable mail-storage directories. `telnyxConfigured` is informational and does not determine readiness.

Response `200` when ready, otherwise `503`:

```json
{
  "status": "ready",
  "dependencies": {
    "mongodb": true,
    "redis": true,
    "clamav": true,
    "filesystem": true,
    "telnyxConfigured": true
  }
}
```

The frontend generally should not gate normal signed-in navigation on readiness; reserve this for diagnostics/operations.

### Authentication

#### `POST /api/auth/otp/request`

Request an SMS OTP. The phone must be valid after service normalization. An OTP is six digits and expires after `OTP_EXPIRY_MINUTES` (default 5). Resend cooldown defaults to 60 seconds; the daily failed verification limit defaults to 3.

Request:

```json
{ "phone": "+919876543210" }
```

Response `202`:

```json
{ "status": "queued" }
```

The response means the SMS job was queued, not that the handset received it. Cooldown/limit failures currently surface through the generic error mapping (often HTTP 500); show a retry/help message rather than relying on a specific status.

#### `POST /api/auth/otp/verify`

Verify an OTP for an existing account, consume it, and create a session. This endpoint does not create a missing account.

Request:

```json
{ "phone": "+919876543210", "otp": "123456" }
```

`otp` must be exactly six decimal digits.

Response `200`:

```json
{
  "sessionToken": "<opaque-token>",
  "requiresPassword": true,
  "user": {
    "id": "<public UUID>",
    "phone": "9876543210",
    "emailAddress": "9876543210@niti",
    "passwordConfigured": false,
    "accountStatus": "active"
  }
}
```

`requiresPassword` is true when the user has not configured a password yet. Invalid/expired OTP and missing account failures currently become ordinary service errors and may return HTTP 500.

#### `POST /api/auth/password/login`

Log in using phone and configured password.

Request:

```json
{ "phone": "+919876543210", "password": "User-chosen secret" }
```

Response `200` uses the same `sessionToken`, `requiresPassword`, and `user` shape as OTP verify. `requiresPassword` is false. Invalid credentials return `401` with `{ "error": "Invalid phone or password." }`. Disabled or missing accounts are intentionally indistinguishable at the public response.

#### `POST /api/auth/password/set`

Requires `X-Session-Token`. Sets/configures the password for the current account; the route does not require the previous password. Frontend should only expose this when `user.passwordConfigured` is false unless the product deliberately offers password changes through this route.

Request:

```json
{ "password": "Strong1!password" }
```

Response `200`:

```json
{ "user": { "id": "<public UUID>", "phone": "9876543210", "emailAddress": "9876543210@niti", "passwordConfigured": true, "accountStatus": "active" } }
```

Invalid policy returns `400`; missing/invalid session returns `401`.

#### `POST /api/auth/logout`

Revokes the supplied session if present. The route does not require a session header; calling without one is still idempotently successful.

Request body: none.

Response `200`:

```json
{ "status": "logged-out" }
```

#### `POST /api/auth/logout-all`

Requires `X-Session-Token`. Revokes all sessions for the current account, including the current token.

Response `200`:

```json
{ "status": "logged-out-all" }
```

#### `POST /api/auth/forgot-password`

Request password reset SMS. The response is generic whether or not the account exists, to reduce account enumeration. If an account exists, the backend creates a one-time reset token and queues an SMS. The SMS link points to `PUBLIC_WEBHOOK_BASE_URL/reset-password?token=...` (or localhost fallback); this repository does not include the reset web page.

Request:

```json
{ "phone": "+919876543210" }
```

Response `202`:

```json
{ "status": "accepted" }
```

The reset token expires after `PASSWORD_RESET_EXPIRY_HOURS` (default 2 hours). The frontend reset page must read the token from the URL and submit it to the next endpoint; never log or send it to analytics.

#### `POST /api/auth/reset-password`

Consumes a valid reset token, sets the new password, consumes outstanding reset tokens for that user, and revokes all sessions.

Request:

```json
{ "token": "<one-time reset token>", "password": "Strong1!password" }
```

Response `200`:

```json
{ "status": "password-reset" }
```

Invalid/expired token returns `400`. Password policy errors return `400`. The user must log in again after reset.

### Outbound voice assistant

#### `POST /calls/start`

Starts an outbound Telnyx call to the requested Indian number. This can incur telephony charges and should be presented to the user as an explicit call action, not triggered automatically during page load. It requires voice configuration and `PUBLIC_WEBHOOK_BASE_URL` with HTTPS.

Request:

```json
{ "phone": "+919876543210" }
```

Response `200`:

```json
{ "status": "started", "callControlId": "<Telnyx call-control ID>" }
```

This confirms Telnyx accepted the call request; it does not confirm that the person answered, the media stream connected, or the conversation completed. There is no public call-status endpoint or call-history endpoint currently. Missing voice-agent token or public HTTPS URL returns `503`; invalid phone returns `400`. Telnyx credentials are also required for the provider request to succeed. This endpoint currently has no session authentication or call-rate limit in its route handler, so the frontend must only expose it as an explicit, protected product action; frontend checks alone are not an adequate abuse-control mechanism for a public deployment.

During the live call, the assistant carries on a natural conversation and can invoke account creation or request a password-reset SMS when the caller asks. It can also compose plain-text email for an existing active Syscall recipient. The caller supplies only the recipient's ten-digit phone number; the API appends `LOCAL_MAIL_DOMAIN` and verifies the account. The agent collects or revises the recipient, subject, and body across turns, reads back the resulting address and a concise summary, and asks for confirmation. On the following caller turn, the voice-agent exposes the send action only for that staged email; Sarvam interprets whether the response is an unambiguous affirmative in context and in the caller's language, without a hardcoded phrase list. Attachments are not supported by the voice flow. A clear account-creation request directly invokes the creation action without a separate confirmation turn. There is no IVR/keypad menu or DTMF-triggered action. After completing a request, it asks whether the caller needs any other help in the current language; if the caller's contextual response is a clear decline, Sarvam decides whether to invoke `end_call` without a fixed phrase allowlist. The app speaks a localized goodbye, waits for Telnyx playback completion when available, then issues the hang-up command. The opening prompt is English/Hindi and asks the caller to speak their preferred language. Supported Sarvam voice locales are English, Hindi, Bengali, Tamil, Telugu, Kannada, Malayalam, Marathi, Gujarati, Punjabi, and Odia; response language and TTS voice are selected per caller turn, so the caller may switch languages during a call.

## 5. Mail endpoints

All mail routes require `X-Session-Token`. Mail sending also requires `user.passwordConfigured === true`; otherwise it returns `403`.

### `POST /api/mail/send`

Queue a new message to an existing active Syscall recipient. `to` must be a valid local address. The backend derives `from` from the authenticated user; the frontend must not send or allow editing a sender address.

Request for account or call-control actions:

```json
{
  "to": "9123456789@niti",
  "subject": "Hello",
  "textBody": "Plain-text message",
  "htmlBody": "<p>Optional HTML</p>",
  "attachments": [
    { "filename": "notes.txt", "contentType": "text/plain", "contentBase64": "SGVsbG8=" }
  ]
}
```

`subject` is required and limited to 998 characters. `textBody` defaults to empty string. `htmlBody` is optional or null. `attachments` is optional; each item needs all three string fields.

Response `202`:

```json
{ "publicId": "<message public UUID>", "deliveryStatus": "queued" }
```

`queued` is asynchronous acceptance, not delivery. The recipient must already exist and be active. A nonexistent recipient currently surfaces as a generic `500` service error.

### `GET /api/mail`

Returns up to the latest 100 messages where the caller is sender or recipient, sorted by creation time descending. There are no query filters, folder parameters, search, cursor, or pagination metadata. Deleted-for-this-user messages are omitted. A message may appear in either inbox or sent views; use `senderAddress`/`recipientAddress` and current user's `emailAddress` to classify it.

Response `200`: JSON array of message records, each with the fields described under “Message record.” No `readAt` side effect occurs from listing.

### `GET /api/mail/:publicId`

Returns one message only if the caller is an authorized participant and has not deleted their copy. If the caller is the recipient and `readAt` is null, this GET marks it read and audits the read. Opening a message is therefore a state-changing read operation. Sender-only views do not mark it read.

Response `200`: one “Message record.” `_id` and `__v` are removed from this detail response. Missing, unauthorized, or deleted-for-caller messages return `404`.

### `DELETE /api/mail/:publicId`

Soft-deletes the current user's view. Sender and recipient deletion timestamps are maintained separately. The message and stored files are permanently purged only after both participants have deleted it.

Response `200`:

```json
{ "status": "deleted" }
```

Unknown or non-participant message returns `404`. Treat the endpoint as irreversible from the caller's perspective; there is no undelete route.

### `POST /api/mail/:publicId/spam`

Marks a message as spam. Only the recipient can do this.

Response `200`:

```json
{ "isSpam": true }
```

### `DELETE /api/mail/:publicId/spam`

Removes the spam flag. Only the recipient can do this.

Response `200`:

```json
{ "isSpam": false }
```

Both spam operations return `404` for an unknown message or a message where caller is not recipient. Spam status does not currently move messages to a separate API folder or implement classification.

### Message record

Mail list/detail JSON is derived from the persistence model. The current record fields are:

| Field | Type / meaning |
|---|---|
| `publicId` | Public message identifier; use this in routes and React keys. |
| `senderUserId`, `recipientUserId` | Persistence-layer user identifiers; present in returned model objects but not stable public identifiers. Do not use for navigation or authorization. |
| `senderAddress`, `recipientAddress` | Local Syscall addresses. |
| `subject` | String, at most 998 characters at send. |
| `textBody` | Plain-text body, string. |
| `htmlBody` | HTML string or null. Render as untrusted content; sanitize or sandbox it. |
| `attachments` | Array of attachment metadata. |
| `deliveryStatus` | `queued`, `delivered`, or `failed`. |
| `isSpam` | Boolean. |
| `readAt` | ISO date string or null; recipient read timestamp. |
| `senderDeletedAt`, `recipientDeletedAt` | ISO date string or null; per-party soft deletion. |
| `createdAt`, `updatedAt` | ISO date strings. |
| `deliveredAt`, `failedAt` | ISO date string or null. |
| `lastDeliveryError` | String or null; avoid surfacing raw provider/internal detail directly. |
| `inReplyTo` | Message-ID string or null; usually null for frontend-originated sends. |
| `references` | String array; usually empty for frontend-originated sends. |
| `messageIdHeader` | SMTP Message-ID value. |
| `rawMimePath` | Internal filesystem path for the stored raw message; detail serialization currently includes this implementation field. Never render or expose it. |
| `__v` | Mongoose version field may be included. Ignore it. |
| `attachments[].originalFilename` | Display name supplied by sender. Never use as a path. |
| `attachments[].contentType` | Declared MIME type. |
| `attachments[].size` | Bytes. |
| `attachments[].storageKey` | Internal generated storage key; not a download URL. Do not expose as a link. |

The mail list overwrites `_id` with `undefined` (so JSON serialization omits it), while detail removes `_id` and `__v`; both responses can still expose persistence identifiers and internal fields noted above. These are implementation leaks, not frontend contract fields. Frontend should rely only on `publicId` and user-safe fields. There is currently no attachment download endpoint.

## 6. Draft endpoints

All draft routes require `X-Session-Token` and are scoped to the owner. Drafts are autosave-friendly records but the API does not provide conflict/version control or partial field-level errors.

### `POST /api/drafts`

Create a draft. `to` may be omitted or null; `subject` and `textBody` default to empty strings; `htmlBody` may be omitted/null; initial attachments are accepted with the same attachment shape and limits as send.

Request:

```json
{
  "to": "9123456789@niti",
  "subject": "Draft subject",
  "textBody": "Draft text",
  "htmlBody": null,
  "attachments": []
}
```

Response `200`:

```json
{ "publicId": "<draft public UUID>" }
```

### `GET /api/drafts`

Returns all drafts owned by the caller, sorted by `updatedAt` descending. There is no pagination. Current query does not filter by status, though only `draft` records can be edited/deleted/sent.

Response `200`: JSON array of draft records.

### `GET /api/drafts/:publicId`

Returns an owned draft or `404`.

Response `200`: draft persistence record including `publicId`, `recipientAddress`, `subject`, `textBody`, `htmlBody`, `attachments`, `status`, `createdAt`, and `updatedAt`. Lean results may also include persistence identifiers such as `_id`, `ownerUserId`, and `__v`; treat those as implementation details and rely on `publicId`.

### `PATCH /api/drafts/:publicId`

Updates only supplied fields among `to`, `subject`, `textBody`, and `htmlBody`. `to` can be set to null. This route does not update attachments. Only a record with status `draft` can be updated; otherwise it returns `404`.

Request example:

```json
{ "to": "9123456789@niti", "subject": "Updated", "textBody": "Updated text" }
```

Response `200`: updated draft record. `404` if not owned or not editable.

### `DELETE /api/drafts/:publicId`

Permanently deletes an owned draft whose status is `draft`.

Response `200`:

```json
{ "status": "deleted" }
```

### `POST /api/drafts/:publicId/send`

Queues an owned draft for sending. No request body is required. It must have a recipient; a missing recipient returns `400`. Unlike `/api/mail/send`, the current draft-send handler does not check `passwordConfigured`; do not rely on it to enforce password setup until the backend is aligned. The draft status becomes `queued` and the email is created. A recipient that is not an existing active user currently fails as a generic service error (`500`).

Response `202`:

```json
{ "publicId": "<created message public UUID>", "deliveryStatus": "queued" }
```

The response `publicId` identifies the message, not the draft. There is no send rollback endpoint.

## 7. Provider-only and internal endpoints (reference only)

These endpoints are listed for completeness, but a browser frontend must never call them. They either require a private service credential or are provider callbacks with signature verification.

### Telnyx webhooks

#### `POST /webhooks/telnyx/voice`
#### `POST /webhooks/telnyx/sms`

Telnyx sends JSON events with `telnyx-signature-ed25519` and `telnyx-timestamp` headers. The API verifies the signature against the raw JSON body and stores event IDs idempotently. A valid event with an ID returns `{ "received": true }`; a duplicate returns `{ "received": true, "duplicate": true }`; missing event ID returns `{ "received": true }`; invalid signature returns `401`. These handlers currently acknowledge/deduplicate events and do not expose event data to the frontend.

### Internal voice-agent API

Every route requires `X-Syscall-Voice-Token`; it is a service-to-service secret and must never be shipped to the frontend.

#### `POST /internal/voice/sessions/activate`

Request: `{ "ticket": string, "callControlId": string, "phone": "+91..." }`. The one-time ticket must be at least 32 characters; call-control ID at least 10 characters. Consumes and validates ticket, expected phone, and active call. Returns `{ "status": "active" }`; invalid/expired/mismatched call returns `401`.

#### `POST /internal/voice/actions`

Request:

```json
{ "callControlId": "<id>", "actionId": "<unique idempotency key>", "action": "create_account" }
```

`action` may be `create_account`, `request_password_reset`, `end_call`, `prepare_email`, `send_email`, or `discard_email`; `actionId` is 12–80 characters. Account creation resolves the phone from the active call, is idempotent by call/action ID, creates an account only if absent, and queues a confirmation SMS for a newly created account. Reset action queues generic reset instructions. `end_call` sends Telnyx's Call Control hang-up command; the voice agent exposes it to the conversational model only after asking whether more help is needed, and the model decides from the caller's natural-language answer whether it is a clear no (no fixed phrase allowlist). This is not an alternative public registration/reset endpoint. Inactive calls return `401`; an in-progress duplicate action may return `409`.

Email action examples:

```json
{ "callControlId": "<id>", "actionId": "<unique idempotency key>", "action": "prepare_email", "recipientPhone": "9876543210", "subject": "Hello", "textBody": "A plain-text message" }
{ "callControlId": "<id>", "actionId": "<unique idempotency key>", "action": "send_email", "draftId": "<prepared draft UUID>", "recipientPhone": "9876543210" }
{ "callControlId": "<id>", "actionId": "<unique idempotency key>", "action": "discard_email", "draftId": "<prepared draft UUID>" }
```

`prepare_email` validates the sender against the active call's phone and requires the recipient to be an existing active account. `recipientPhone` is the recipient's ten-digit Indian phone number; the API derives `recipientAddress` by appending `LOCAL_MAIL_DOMAIN`. Subject and `textBody` are also required; subject is limited to 998 characters and the plain-text body to 12,000 characters. It stores one replaceable draft under that call ID in Redis for 15 minutes and returns `{ "action": "prepare_email", "status": "prepared", "draftId": "...", "recipientAddress": "...", "subject": "..." }`. It does not send mail. `send_email` requires the matching draft ID and queues the message through the existing email worker, returning `{ "action": "send_email", "status": "queued", "publicId": "...", "recipientAddress": "..." }`; a synchronous send failure returns `{ "action": "send_email", "status": "failed", "failureNotificationQueued": true|false }`. The voice agent invokes it only after the confirmation prompt and the conversational model interprets a clear affirmative. The `recipientPhone` is included so a confirmed attempt that fails before queueing can still be identified in the sender's SMS. After queue acceptance, the voice agent tells the caller the recipient should receive the email shortly. If the confirmed send fails before queueing or after SMTP retries are exhausted, Syscall queues an SMS to the sender naming the recipient number. Draft validation failures and cancellations do not send a failure SMS. `discard_email` removes the matching pending draft. Closing the call removes any pending draft. These actions are voice-agent-only; normal frontend mail must continue using the authenticated `/api/mail/send` route.

#### `POST /internal/voice/sessions/close`

Request: `{ "callControlId": "<id>" }`. Deletes API-side authorization and any pending voice email draft for the active call. Returns `{ "status": "closed" }`.

### Voice-agent health and media WebSocket

- `GET http://localhost:4000/health` returns `{ "status": "ok", "service": "voice-agent" }`; port 4000 binds to host loopback in Compose.
- `GET /voice-stream?ticket=<one-time-ticket>` is a WebSocket upgrade path, not an HTTP frontend API. The ticket is short-lived and one-use. Only Telnyx should receive it.
- Telnyx media uses bidirectional 8 kHz mono PCMU frames. The agent starts Sarvam realtime STT, returns synthesized PCMU audio, and handles barge-in. DTMF is not used for application actions; callers interact with the assistant conversationally.

## 8. Suggested frontend flows

### New account

There is no public account-creation endpoint. Current supported path: the user initiates/answers a voice call and asks the conversational assistant to create an account; a clear request invokes the internal action directly without keypad input or a second confirmation. Upon success, the backend creates the user's `@niti` identity and queues an SMS. The frontend can then use OTP request/verify or password login to authenticate. Do not fabricate a registration endpoint or create an account by calling `/internal/voice/actions`.

### Existing account first sign-in

1. Collect phone; call `POST /api/auth/otp/request`.
2. Collect the 6-digit OTP; call `POST /api/auth/otp/verify`.
3. Keep `sessionToken` in the session manager and attach `X-Session-Token` to authenticated requests.
4. If `requiresPassword` is true, require password setup with `POST /api/auth/password/set` before showing mail features.

### Returning user

Call `POST /api/auth/password/login`, then attach the returned token. On `401`, clear session state. If forgotten password, call `/api/auth/forgot-password`, serve a frontend reset page that submits `/api/auth/reset-password`, then require login again.

### Compose/send

Use `/api/drafts` for create/autosave, then `/api/drafts/:publicId/send` or directly `/api/mail/send`. Show the `202` result as queued, not delivered. Polling is not available as a dedicated endpoint; refresh `GET /api/mail` to observe a later delivery status.

### Mailbox

Fetch `GET /api/mail`; the backend returns at most 100 latest records. Open by `publicId`; opening as recipient marks the message read. Use `DELETE /api/mail/:publicId` for per-user soft delete, and the spam routes only for recipient-owned messages. Since there is no pagination/search/download API, do not build UI controls that imply those server capabilities.

## 9. Frontend security and accessibility requirements

- Never put OTPs, passwords, reset tokens, session tokens, voice tickets, or service credentials in URLs, logs, telemetry, or client error reports.
- Do not call `/internal/voice/*` or Telnyx webhooks from browser code.
- Never trust `htmlBody`; sanitize it and render in an appropriately sandboxed context. Do not load remote content automatically without a deliberate privacy decision.
- Never treat `storageKey` as a download URL or filesystem path. No attachment download endpoint exists.
- Use `publicId`, not Mongo `_id`, as the stable frontend identifier.
- Handle `401` globally by clearing session state and returning to sign-in; handle `403` as authenticated-but-not-allowed (commonly password not configured); handle `404` without revealing other users' message existence.
- Treat `202` as accepted/queued and display asynchronous status honestly.
- Make voice calls explicit user actions and confirm the destination before starting; calls can incur provider charges.
- Keep account-enumeration-safe UI copy for forgot-password and reset flows.
- Support keyboard navigation, visible focus states, mobile layouts, accessible labels, and clear loading/error/empty states; the API itself does not supply presentation or localized copy.

## 10. Contract gaps to coordinate with backend before production frontend launch

1. Configure explicit CORS allowlisted origins or put the frontend and API behind a same-origin reverse proxy.
2. Map expected domain errors to appropriate HTTP statuses and stable machine-readable `errorCode` values; currently many become `500`.
3. Add API request/response schemas (OpenAPI or equivalent) to prevent drift.
4. Decide and document a secure browser session strategy; current token is JavaScript-readable and there is no refresh flow.
5. Provide a public account-creation path if voice-only registration is not acceptable.
6. Add attachment download/read capability and resolve practical request-body size limits for base64 uploads.
7. Add pagination/search/filtering for mail and drafts if mailbox scale requires it.
8. Add a public call status/history mechanism only if the UI needs post-initiation state; `/calls/start` alone only reports request acceptance.
9. Implement and host the user-facing reset page referenced by reset SMS links.
10. Align the password-setup guard between direct mail send and draft send.

## 11. Endpoint inventory checklist

| Method | Path | Audience |
|---|---|---|
| `GET` | `/health` | Operations/frontend diagnostics |
| `GET` | `/ready` | Operations |
| `POST` | `/api/auth/otp/request` | Frontend |
| `POST` | `/api/auth/otp/verify` | Frontend |
| `POST` | `/api/auth/password/login` | Frontend |
| `POST` | `/api/auth/password/set` | Frontend, authenticated |
| `POST` | `/api/auth/logout` | Frontend |
| `POST` | `/api/auth/logout-all` | Frontend, authenticated |
| `POST` | `/api/auth/forgot-password` | Frontend |
| `POST` | `/api/auth/reset-password` | Frontend |
| `POST` | `/calls/start` | Frontend, explicit call action |
| `POST` | `/api/mail/send` | Frontend, authenticated |
| `GET` | `/api/mail` | Frontend, authenticated |
| `GET` | `/api/mail/:publicId` | Frontend, authenticated |
| `DELETE` | `/api/mail/:publicId` | Frontend, authenticated |
| `POST` | `/api/mail/:publicId/spam` | Frontend, authenticated recipient |
| `DELETE` | `/api/mail/:publicId/spam` | Frontend, authenticated recipient |
| `POST` | `/api/drafts` | Frontend, authenticated |
| `GET` | `/api/drafts` | Frontend, authenticated |
| `GET` | `/api/drafts/:publicId` | Frontend, authenticated |
| `PATCH` | `/api/drafts/:publicId` | Frontend, authenticated |
| `DELETE` | `/api/drafts/:publicId` | Frontend, authenticated |
| `POST` | `/api/drafts/:publicId/send` | Frontend, authenticated |
| `POST` | `/webhooks/telnyx/voice` | Telnyx only |
| `POST` | `/webhooks/telnyx/sms` | Telnyx only |
| `POST` | `/internal/voice/sessions/activate` | Voice-agent only |
| `POST` | `/internal/voice/actions` | Voice-agent only |
| `POST` | `/internal/voice/sessions/close` | Voice-agent only |
| `GET` | `:4000/health` | Operations only |
| `WS` | `/voice-stream?ticket=...` | Telnyx only |
