import { IncomingHttpHeaders } from 'http';
import { MAX_USER_ID_LENGTH } from '../../src/net/constants';
import { IDENTITY_HEADERS } from './constants';
import { Identity } from './types';

const readId = (value: string | string[] | undefined): string | null => (
  typeof value === 'string' && value.length > 0 && value.length <= MAX_USER_ID_LENGTH
    ? value
    : null
);

/**
 * bbb-web URL-encodes the display name in the header; a name that cannot be decoded falls back
 * to the user id rather than refusing the connection.
 */
const readName = (value: string | string[] | undefined, fallback: string): string => {
  if (typeof value !== 'string' || value.length === 0) {
    return fallback;
  }
  try {
    return decodeURIComponent(value);
  } catch {
    return fallback;
  }
};

/**
 * The identity comes from nginx's auth_request, which only lets through users BBB has already
 * authorized, so the relay trusts these headers and nothing in the WebSocket messages.
 */
export const readIdentity = (headers: IncomingHttpHeaders): Identity | null => {
  const userId = readId(headers[IDENTITY_HEADERS.USER_ID]);
  const meetingId = readId(headers[IDENTITY_HEADERS.MEETING_ID]);
  if (userId === null || meetingId === null) {
    return null;
  }
  return {
    userId,
    meetingId,
    name: readName(headers[IDENTITY_HEADERS.USER_NAME], userId),
  };
};
