/**
 * File: carrierLookup.ts
 * Role: Identifies the original telecom carrier of Indian mobile numbers using
 *       libphonenumber-js parsing and Google's official libphonenumber carrier database.
 * Service: Frontend.
 */
import parsePhoneNumberFromString from 'libphonenumber-js';
import { indiaCarriers } from './indiaCarriers';

import airtelLogo from '../assets/carriers/airtel.png';
import bsnlLogo from '../assets/carriers/bsnl.png';
import jioLogo from '../assets/carriers/jio.png';
import viLogo from '../assets/carriers/vi.png';

export type CarrierBrandKey = 'airtel' | 'jio' | 'vi' | 'bsnl' | 'generic';

export interface CarrierLookupResult {
  carrier: string | null;
  brandKey: CarrierBrandKey;
  brandLogo: string | null;
  formattedNumber: string;
}

/**
 * Maps the raw carrier name to one of the 4 major active Indian operators and returns its logo.
 */
export function getCarrierBrand(carrierName: string | null): { brandKey: CarrierBrandKey; brandLogo: string | null } {
  if (!carrierName) {
    return { brandKey: 'generic', brandLogo: null };
  }
  const lower = carrierName.toLowerCase();
  if (lower.includes('jio')) {
    return { brandKey: 'jio', brandLogo: jioLogo };
  }
  if (lower.includes('airtel') || lower.includes('docomo') || lower.includes('telenor') || lower.includes('telewings')) {
    return { brandKey: 'airtel', brandLogo: airtelLogo };
  }
  if (lower.includes('vodafone') || lower.includes('idea')) {
    return { brandKey: 'vi', brandLogo: viLogo };
  }
  if (lower.includes('bsnl') || lower.includes('mtnl')) {
    return { brandKey: 'bsnl', brandLogo: bsnlLogo };
  }
  return { brandKey: 'generic', brandLogo: null };
}

/**
 * Looks up the original network carrier for a given mobile phone number.
 * Uses libphonenumber-js to parse and format the phone number according to E.164 / ITU specs,
 * then checks the prefix against Google's libphonenumber Indian carrier dataset.
 */
export function getCarrierInfo(phone: string): CarrierLookupResult {
  if (!phone) {
    return { carrier: null, brandKey: 'generic', brandLogo: null, formattedNumber: '' };
  }

  const cleanPhone = phone.trim().startsWith('+') ? phone.trim() : `+91${phone.replace(/\D/g, '')}`;
  const parsed = parsePhoneNumberFromString(cleanPhone, 'IN');

  const formattedNumber = parsed ? parsed.formatInternational() : `+91 ${phone.replace(/\D/g, '')}`;

  const digits = parsed
    ? `${parsed.countryCallingCode}${parsed.nationalNumber}`
    : `91${phone.replace(/\D/g, '').slice(-10)}`;

  let carrier: string | null = null;
  // Search prefixes from longest (7 digits) down to 3 digits
  for (let len = 7; len >= 3; len--) {
    const prefix = digits.slice(0, len);
    if (indiaCarriers[prefix]) {
      carrier = indiaCarriers[prefix];
      break;
    }
  }

  const { brandKey, brandLogo } = getCarrierBrand(carrier);

  return {
    carrier,
    brandKey,
    brandLogo,
    formattedNumber,
  };
}
