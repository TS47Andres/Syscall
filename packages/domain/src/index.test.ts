/**
 * File: index.test.ts
 * Role: Protects the outbound IVR state transition rules.
 * Service: Shared domain package.
 */
import { describe, expect, it } from 'vitest';
import { nextIvrState } from './index.js';

// Verifies the supported main-menu transitions and repeat behavior.
describe('IVR state machine', () => {
  it('routes account creation, password reset, and repeat inputs', () => {
    expect(nextIvrState('main', '1')).toBe('create-account');
    expect(nextIvrState('main', '2')).toBe('forgot-password');
    expect(nextIvrState('main', '9')).toBe('main');
    expect(nextIvrState('create-account', '9')).toBe('main');
    expect(nextIvrState('main', '7')).toBe('main');
  });
});
