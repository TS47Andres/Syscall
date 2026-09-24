/**
 * File: index.ts
 * Role: Defines domain-level state transitions shared by application services.
 * Service: Shared domain package.
 */
export type DeliveryStatus = 'queued' | 'delivered' | 'failed';
export type DraftStatus = 'draft' | 'queued' | 'sent';
