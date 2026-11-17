import { RELAY_DEFAULT_PATH, SESSION_TOKEN_PARAM } from './constants';

/**
 * Where the relay is. An explicit setting wins; otherwise the relay sits on the same host as
 * the script, since the BBB server that serves the plugin also serves the relay, even when the
 * page itself is behind a cluster proxy.
 */
export const resolveRelayUrl = (
  setting: string,
  scriptSrc: string | null,
  pageUrl: string,
): string => {
  const explicit = setting.trim();
  if (explicit) return explicit;
  const base = new URL(scriptSrc || pageUrl, pageUrl);
  const protocol = base.protocol === 'http:' ? 'ws:' : 'wss:';
  return `${protocol}//${base.host}${RELAY_DEFAULT_PATH}`;
};

/** Adds the session token the relay's nginx checks; the token is never logged by the caller. */
export const withSessionToken = (url: string, token: string): string => {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${SESSION_TOKEN_PARAM}=${encodeURIComponent(token)}`;
};
