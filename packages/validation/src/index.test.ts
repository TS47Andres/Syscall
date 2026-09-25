/**
 * File: index.test.ts
 * Role: Protects security-critical password and Indian phone validation rules.
 * Service: Shared validation package.
 */
import { describe, expect, it } from 'vitest';
import { passwordSchema, resolveScheduleTime, toPhoneE164 } from './index.js';

// Verifies that password policy rejects missing complexity requirements.
describe('password policy', () => {
  it('requires all configured complexity classes', () => {
    expect(() => passwordSchema.parse('weakpassword')).toThrow();
    expect(passwordSchema.parse('Strong1!password')).toBe('Strong1!password');
  });
});

// Verifies that only Indian mobile numbers are normalized.
describe('phone normalization', () => {
  it('normalizes a ten-digit Indian mobile number', () => {
    expect(toPhoneE164('9876543210')).toBe('+919876543210');
    expect(() => toPhoneE164('12345')).toThrow();
  });
});

// Protects relative scheduling from local-clock drift and unsupported delivery windows.
describe('email scheduling time', () => {
  it('anchors relative delays to the supplied server time', () => {
    const now = new Date('2026-09-25T00:00:00.000Z');
    expect(resolveScheduleTime({ delaySeconds: 300 }, now).toISOString()).toBe('2026-09-25T00:05:00.000Z');
  });

  it('rejects ambiguous, too-soon, and over-one-year schedules', () => {
    const now = new Date('2026-09-25T00:00:00.000Z');
    expect(() => resolveScheduleTime({}, now)).toThrow();
    expect(() => resolveScheduleTime({ delaySeconds: 59 }, now)).toThrow();
    expect(() => resolveScheduleTime({ delaySeconds: 365 * 24 * 60 * 60 + 1 }, now)).toThrow();
  });
});
