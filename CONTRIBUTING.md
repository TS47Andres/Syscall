# Contributing to Syscall

## Purpose

Syscall is a local-only, containerized backend for PhoneMail-style phone-based email identities. Contributions must preserve the service boundaries, security invariants, and explicit-failure behavior described in the project brief.

## Required source-file header

Every source file must begin with a short heading comment that states:

- the file purpose;
- the role it plays in the system; and
- the service or shared module it belongs to.

Example:

```ts
/**
 * File: telnyx.service.ts
 * Role: Encapsulates Telnyx Voice and Messaging API calls.
 * Service: API.
 */
```

## Commenting rules

- Add a short comment immediately before every function or method describing its purpose.
- Add concise comments for meaningful variables when their intent or security significance is not obvious.
- Comments must explain responsibility, intent, or non-obvious behavior; do not add comments that merely restate names.

## Code standards

- Use strict TypeScript and small, focused functions.
- Keep API, SMTP, worker, and shared package responsibilities separate.
- Prefer explicit dependency passing and typed configuration.
- Validate all external input and handle asynchronous errors explicitly.
- Use structured JSON logging and graceful shutdown.
- Never hardcode credentials, tokens, or private keys.
- Do not silently fall back to fake credentials, disabled security checks, in-memory persistence, or unavailable infrastructure.
- Missing required configuration must fail with a clear component-specific error.
- Avoid giant controllers, duplicated business rules, hidden side effects, magic constants, and swallowed exceptions.

## Security invariants

- Store phone numbers internally in E.164 format and expose only the local 10-digit identity in `@niti` addresses.
- Hash passwords with Argon2id and OTP/reset/session secrets with one-way or cryptographically secure mechanisms appropriate to their use.
- Never log passwords, OTP plaintext, API keys, raw session tokens, or reset tokens.
- Treat unavailable ClamAV as an SMTP temporary failure; never accept mail without the configured malware scan.
- Never use an original attachment filename as a filesystem path.
- Verify Telnyx webhook signatures and process webhook event IDs idempotently.

## Testing policy

Create tests only when they materially protect security-sensitive or domain-critical behavior, such as password rules, OTP limits, IVR transitions, SMTP validation, attachment validation, delete/purge semantics, or webhook idempotency. Do not add placeholder or trivial tests.

## Change checklist

Before submitting a change:

1. Run formatting, type checking, and the meaningful test suite.
2. Confirm all new source files have the required header and function comments.
3. Confirm new configuration is represented in `.env.example` without secret values.
4. Confirm Docker health checks and service dependencies remain valid.
5. Update the README when behavior, routes, environment variables, or operational procedures change.
