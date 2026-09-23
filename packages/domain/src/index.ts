/**
 * File: index.ts
 * Role: Defines domain-level state transitions shared by application services.
 * Service: Shared domain package.
 */
export type IvrState = 'main' | 'create-account' | 'forgot-password';
export type DeliveryStatus = 'queued' | 'delivered' | 'failed';
export type DraftStatus = 'draft' | 'queued' | 'sent';

// Returns the next IVR state after a DTMF input.
export function nextIvrState(state: IvrState, digit: string): IvrState {
  if (digit === '9') return 'main';
  if (state === 'main' && digit === '1') return 'create-account';
  if (state === 'main' && digit === '2') return 'forgot-password';
  return state;
}

