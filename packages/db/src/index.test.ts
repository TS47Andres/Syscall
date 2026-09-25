/**
 * File: index.test.ts
 * Role: Protects persistence invariants for queued and delivered email records.
 * Service: Shared database package.
 */
import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import { Email } from './index.js';

// Ensures an outbound email can be queued before SMTP creates its raw-MIME file.
describe('email record schema', () => {
  it('accepts an empty raw MIME path while an outbound message is queued', () => {
    const email = new Email({
      senderUserId: new mongoose.Types.ObjectId(),
      senderAddress: '7682001264@niti',
      recipientUserId: new mongoose.Types.ObjectId(),
      recipientAddress: '9300640012@niti',
      subject: 'Test message',
      textBody: 'A plain-text test message.',
      attachments: [],
      rawMimePath: '',
      messageIdHeader: '<test-message@syscall>',
      deliveryStatus: 'queued',
    });

    expect(email.validateSync()).toBeUndefined();
  });
});
