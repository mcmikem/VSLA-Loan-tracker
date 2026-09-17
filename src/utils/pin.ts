/** PIN hardening: default 1234 must never authorize money movement. */

export const DEFAULT_PIN = '1234';

export function isDefaultPin(pin?: string): boolean {
  return (pin || '') === DEFAULT_PIN;
}

export function isValidPinFormat(pin: string): boolean {
  return /^\d{4,8}$/.test(pin);
}
