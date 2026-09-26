/**
 * File: carrierLookup.ts
 * Role: Identifies the original telecom carrier of Indian mobile numbers using
 *       libphonenumber-js parsing and Google's official libphonenumber carrier database.
 * Service: Frontend.
 */
import parsePhoneNumberFromString from 'libphonenumber-js';
import { indiaCarriers } from './indiaCarriers';

export interface CarrierLookupResult {
  carrier: string | null;
  formattedNumber: string;
}

/**
 * Looks up the original network carrier for a given mobile phone number.
 * Uses libphonenumber-js to parse and format the phone number according to E.164 / ITU specs,
 * then checks the prefix against Google's libphonenumber Indian carrier dataset.
 */
export function getCarrierInfo(phone: string): CarrierLookupResult {
  if (!phone) {
    return { carrier: null, formattedNumber: '' };
  }

  const cleanPhone = phone.trim().startsWith('+') ? phone.trim() : `+91${phone.replace(/\D/g, '')}`;
  const parsed = parsePhoneNumberFromString(cleanPhone, 'IN');

  const formattedNumber = parsed ? parsed.formatInternational() : `+91 ${phone.replace(/\D/g, '')}`;

  const digits = parsed
    ? `${parsed.countryCallingCode}${parsed.nationalNumber}`
    : `91${phone.replace(/\D/g, '').slice(-10)}`;

  // Search prefixes from longest (7 digits) down to 3 digits
  for (let len = 7; len >= 3; len--) {
    const prefix = digits.slice(0, len);
    if (indiaCarriers[prefix]) {
      return {
        carrier: indiaCarriers[prefix],
        formattedNumber,
      };
    }
  }

  return {
    carrier: null,
    formattedNumber,
  };
}
