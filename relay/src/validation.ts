import { Vec3 } from '../../src/commons/types';
import {
  MAX_COORDINATE, MAX_COUNTER, MAX_HEALTH, MAX_PICKUP_INDEX, MAX_WEAPON_INDEX,
} from '../../src/net/constants';
import { CLIENT_MESSAGE, ENV_KIND, ROUND_PATTERN } from '../../src/protocol/constants';
import { ClientMessage } from '../../src/protocol/types';
import { MAX_CAUSE_LENGTH } from './constants';

/** Seeds are 32-bit unsigned: anything else cannot have come from `seededRandom`. */
const MAX_SEED = 2 ** 32 - 1;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isInt = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;

const isVec3 = (value: unknown): value is Vec3 =>
  Array.isArray(value) && value.length === 3
  && value.every((n) => isFiniteNumber(n) && Math.abs(n) <= MAX_COORDINATE);

/**
 * Parses a frame from a client and rebuilds it with only the fields the relay knows, so extra
 * data a client sends never reaches the rest of the relay. Anything malformed gives null.
 */
export const parseClientMessage = (raw: string): ClientMessage | null => {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(data) || typeof data.type !== 'string') {
    return null;
  }

  switch (data.type) {
    case CLIENT_MESSAGE.HELLO: {
      const { v, round } = data;
      if (typeof v !== 'number' || !Number.isInteger(v) || typeof round !== 'string'
        || !ROUND_PATTERN.test(round)) {
        return null;
      }
      return { type: CLIENT_MESSAGE.HELLO, v, round };
    }

    case CLIENT_MESSAGE.POSE: {
      const { p, y, x, w, on } = data;
      if (!isVec3(p) || !isFiniteNumber(y) || !isFiniteNumber(x)
        || !isInt(w, 0, MAX_WEAPON_INDEX) || typeof on !== 'boolean') {
        return null;
      }
      return { type: CLIENT_MESSAGE.POSE, p: [p[0], p[1], p[2]], y, x, w, on };
    }

    case CLIENT_MESSAGE.SHOT: {
      const { id, vt, o, y, x, w, seed, ads } = data;
      if (!isInt(id, 0, MAX_COUNTER) || !isFiniteNumber(vt) || !isVec3(o)
        || !isFiniteNumber(y) || !isFiniteNumber(x) || !isInt(w, 0, MAX_WEAPON_INDEX)
        || !isInt(seed, 0, MAX_SEED) || typeof ads !== 'boolean') {
        return null;
      }
      return {
        type: CLIENT_MESSAGE.SHOT,
        id,
        vt,
        o: [o[0], o[1], o[2]],
        y,
        x,
        w,
        seed,
        ads,
      };
    }

    case CLIENT_MESSAGE.ENV: {
      const { kind, amount, cause } = data;
      if ((kind !== ENV_KIND.DAMAGE && kind !== ENV_KIND.HEAL)
        || !isFiniteNumber(amount) || amount <= 0 || amount > MAX_HEALTH
        || typeof cause !== 'string' || cause.length < 1 || cause.length > MAX_CAUSE_LENGTH) {
        return null;
      }
      return { type: CLIENT_MESSAGE.ENV, kind, amount, cause };
    }

    case CLIENT_MESSAGE.PING: {
      const { c } = data;
      if (!isFiniteNumber(c)) {
        return null;
      }
      return { type: CLIENT_MESSAGE.PING, c };
    }

    case CLIENT_MESSAGE.RELOAD: {
      const { w } = data;
      if (!isInt(w, 0, MAX_WEAPON_INDEX)) {
        return null;
      }
      return { type: CLIENT_MESSAGE.RELOAD, w };
    }

    case CLIENT_MESSAGE.PICKUP: {
      const { i } = data;
      if (!isInt(i, 0, MAX_PICKUP_INDEX)) {
        return null;
      }
      return { type: CLIENT_MESSAGE.PICKUP, i };
    }

    default:
      return null;
  }
};
