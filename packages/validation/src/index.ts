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

