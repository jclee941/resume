/**
 * Korean phone number normalization utilities.
 *
 * @module shared/phone
 */

/**
 * Convert a Korean phone number to E.164 format (+82...).
 * @param {string} phone
 * @returns {string}
 */
export function toE164(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) {
    return `+82${digits.slice(1)}`;
  }
  if (digits.startsWith('82')) {
    return `+${digits}`;
  }
  return phone;
}

/**
 * Alias for toE164 — normalize phone to international format.
 * @param {string} phone
 * @returns {string}
 */
export function normalizePhone(phone) {
  return toE164(phone);
}

/**
 * Convert an E.164 Korean phone number to local format (010-xxxx-xxxx).
 * @param {string} phone
 * @returns {string}
 */
export function toKoreanPhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/^\+82/, '0').replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  return digits;
}
