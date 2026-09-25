import type { Email } from '../types';

export const isPromoMail = (mail: Email): boolean => {
  const t = (mail.subject + ' ' + mail.textBody).toLowerCase();
  return (
    t.includes('promo') ||
    t.includes('offer') ||
    t.includes('discount') ||
    t.includes('sale') ||
    t.includes('deal') ||
    t.includes('coupon') ||
    t.includes('save ') ||
    t.includes('special')
  );
};

export const isSocialMail = (mail: Email): boolean => {
  const t = (mail.subject + ' ' + mail.textBody).toLowerCase();
  return (
    t.includes('social') ||
    t.includes('connect') ||
    t.includes('network') ||
    t.includes('linkedin') ||
    t.includes('twitter') ||
    t.includes('instagram') ||
    t.includes('facebook') ||
    t.includes('youtube') ||
    t.includes('community') ||
    t.includes('invite')
  );
};

export const isPurchaseMail = (mail: Email): boolean => {
  const t = (mail.subject + ' ' + mail.textBody).toLowerCase();
  return (
    t.includes('purchase') ||
    t.includes('order') ||
    t.includes('invoice') ||
    t.includes('receipt') ||
    t.includes('bill') ||
    t.includes('payment') ||
    t.includes('transaction') ||
    t.includes('paid')
  );
};

export const isImportantMail = (mail: Email, starredIds: Set<string>): boolean => {
  const t = (mail.subject + ' ' + mail.textBody).toLowerCase();
  return (
    starredIds.has(mail.publicId) ||
    t.includes('important') ||
    t.includes('urgent') ||
    t.includes('otp') ||
    t.includes('security') ||
    t.includes('telecom') ||
    t.includes('alert') ||
    t.includes('welcome')
  );
};

export const isUpdateMail = (mail: Email): boolean => {
  const t = (mail.subject + ' ' + mail.textBody).toLowerCase();
  return (
    t.includes('update') ||
    t.includes('notification') ||
    t.includes('confirm') ||
    t.includes('receipt') ||
    t.includes('bill') ||
    t.includes('statement') ||
    t.includes('alert') ||
    t.includes('security') ||
    t.includes('verify') ||
    t.includes('welcome') ||
    t.includes('telecom') ||
    t.includes('account')
  );
};
