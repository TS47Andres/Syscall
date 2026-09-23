/**
 * File: index.test.ts
 * Role: Protects security-critical password and Indian phone validation rules.
 * Service: Shared validation package.
 */
import { describe, expect, it } from 'vitest';
import { passwordSchema, toPhoneE164 } from './index.js';

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
