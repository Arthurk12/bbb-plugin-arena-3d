const NGROK_SKIP_WARNING_HEADER = 'ngrok-skip-browser-warning';

export const isDevelopment = (): boolean => (
  !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
);

/**
 * In development the bundle is usually served through ngrok, whose free tier answers browser
 * requests with an HTML warning page unless this header is sent. Production sends nothing.
 */
export const devRequestHeaders = (): Record<string, string> => (
  isDevelopment() ? { [NGROK_SKIP_WARNING_HEADER]: 'any' } : {}
);

/* eslint-disable no-bitwise -- FNV-1a is defined in terms of 32-bit operations */
/** Stable 32-bit FNV-1a hash: the same id gives the same look on every client. */
export const hashString = (value: string): number => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};
/* eslint-enable no-bitwise */

export const clamp = (value: number, min: number, max: number): number => (
  Math.min(max, Math.max(min, value))
);
