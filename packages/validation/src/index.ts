/**
 * File: index.ts
 * Role: Contains shared input and identity validation rules.
 * Service: Shared validation package.
 */
import { z } from 'zod';

export const phoneSchema = z.string().regex(/^\+91[6-9]\d{9}$/, 'Phone must be an Indian E.164 number');
export const phone10Schema = z.string().regex(/^[6-9]\d{9}$/, 'Phone must be an Indian 10-digit number');
export const passwordSchema = z.string().min(8).max(128).regex(/[A-Z]/, 'Password needs an uppercase letter').regex(/[a-z]/, 'Password needs a lowercase letter').regex(/\d/, 'Password needs a digit').regex(/[^A-Za-z0-9]/, 'Password needs a special character');
export const addressSchema = z.string().regex(/^[6-9]\d{9}@[a-z0-9.-]+$/, 'Invalid local email address');
export const scheduleTimeZone = 'Asia/Kolkata';
export const minimumScheduleDelaySeconds = 60;
export const maximumScheduleDelaySeconds = 365 * 24 * 60 * 60;

// Resolves an explicit-offset timestamp or relative delay against an authoritative clock.
export function resolveScheduleTime(input: { scheduledAt?: string; delaySeconds?: number }, now = new Date()): Date {
  const hasTimestamp = input.scheduledAt !== undefined;
  const hasDelay = input.delaySeconds !== undefined;
  if (hasTimestamp === hasDelay) throw new Error('Provide exactly one scheduledAt timestamp or delaySeconds value.');
  const scheduledAt = hasTimestamp
    ? new Date(z.string().datetime({ offset: true }).parse(input.scheduledAt))
    : new Date(now.getTime() + Number(z.number().int().parse(input.delaySeconds)) * 1000);
  const delayMs = scheduledAt.getTime() - now.getTime();
  if (!Number.isFinite(scheduledAt.getTime())) throw new Error('Scheduled time is invalid.');
  if (delayMs < minimumScheduleDelaySeconds * 1000) throw new Error('Email must be scheduled at least one minute in the future.');
  if (delayMs > maximumScheduleDelaySeconds * 1000) throw new Error('Email cannot be scheduled more than one year in advance.');
  return scheduledAt;
}

// Converts a supported Indian phone value to canonical E.164 format.
export function toPhoneE164(value: string): string {
  const digits = value.replace(/\D/g, '');
  const phone10 = digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits;
  return phone10Schema.parse(phone10) && `+91${phone10}`;
}

// Returns the local ten-digit portion of a canonical Indian phone number.
export function toPhone10(value: string): string {
  const e164 = toPhoneE164(value);
  return e164.slice(3);
}

// Derives the only supported public address from a ten-digit phone number.
export function toLocalAddress(phone10: string, domain: string): string {
  return `${phone10Schema.parse(phone10)}@${domain}`;
}
