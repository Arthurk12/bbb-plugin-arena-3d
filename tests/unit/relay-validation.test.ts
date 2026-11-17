import { describe, expect, it } from 'vitest';
import { parseClientMessage } from '../../relay/src/validation';
import { MAX_CAUSE_LENGTH } from '../../relay/src/constants';
import {
  MAX_COORDINATE, MAX_HEALTH, MAX_PICKUP_INDEX, MAX_WEAPON_INDEX,
} from '../../src/net/constants';

const send = (message: unknown): string => JSON.stringify(message);

const hello = { type: 'hello', v: 1, round: 'abc-123' };
const pose = { type: 'pose', p: [1, 2, 3], y: 0.5, x: -0.1, w: 2, on: true };
const shot = {
  type: 'shot', id: 7, vt: 1000, o: [0, 1.5, 0], y: 0.2, x: 0, w: 1, seed: 42, ads: false,
};
const env = { type: 'env', kind: 'damage', amount: 10, cause: 'fall' };
const ping = { type: 'ping', c: 123.5 };

describe('parseClientMessage', () => {
  it('keeps the known fields of each of the 5 message types', () => {
    expect(parseClientMessage(send(hello))).toEqual(hello);
    expect(parseClientMessage(send(pose))).toEqual(pose);
    expect(parseClientMessage(send(shot))).toEqual(shot);
    expect(parseClientMessage(send(env))).toEqual(env);
    expect(parseClientMessage(send(ping))).toEqual(ping);
  });

  it('drops fields it does not know', () => {
    const parsed = parseClientMessage(send({ ...pose, extra: 'x', hp: 999 }));
    expect(parsed).toEqual(pose);
    expect(parsed).not.toHaveProperty('extra');
    expect(parsed).not.toHaveProperty('hp');
  });

  it('returns null for malformed JSON', () => {
    expect(parseClientMessage('{not json')).toBeNull();
    expect(parseClientMessage('')).toBeNull();
  });

  it('returns null for non-object frames', () => {
    expect(parseClientMessage('42')).toBeNull();
    expect(parseClientMessage('"hello"')).toBeNull();
    expect(parseClientMessage('null')).toBeNull();
    expect(parseClientMessage('[1,2,3]')).toBeNull();
    expect(parseClientMessage(send({ v: 1 }))).toBeNull();
  });

  it('returns null for an unknown type', () => {
    expect(parseClientMessage(send({ ...ping, type: 'teleport' }))).toBeNull();
  });

  describe('coordinates', () => {
    it('accepts a position at the limit and rejects one past it', () => {
      expect(parseClientMessage(send({ ...pose, p: [MAX_COORDINATE, 0, 0] }))).not.toBeNull();
      expect(parseClientMessage(send({ ...pose, p: [MAX_COORDINATE + 1, 0, 0] }))).toBeNull();
      expect(parseClientMessage(send({ ...shot, o: [0, -(MAX_COORDINATE + 1), 0] }))).toBeNull();
    });

    it('rejects NaN and Infinity (sent as null by JSON, or as text)', () => {
      expect(parseClientMessage(send({ ...pose, p: [Number.NaN, 0, 0] }))).toBeNull();
      expect(parseClientMessage(send({ ...pose, p: [Number.POSITIVE_INFINITY, 0, 0] }))).toBeNull();
      expect(parseClientMessage(send({ ...pose, y: Number.NaN }))).toBeNull();
      expect(parseClientMessage(send({ ...ping, c: null }))).toBeNull();
    });

    it('rejects a position that is not exactly three numbers', () => {
      expect(parseClientMessage(send({ ...pose, p: [1, 2] }))).toBeNull();
      expect(parseClientMessage(send({ ...pose, p: [1, 2, 3, 4] }))).toBeNull();
    });
  });

  describe('weapons', () => {
    it('rejects a non-integer weapon', () => {
      expect(parseClientMessage(send({ ...pose, w: 1.5 }))).toBeNull();
      expect(parseClientMessage(send({ ...shot, w: 0.1 }))).toBeNull();
    });

    it('rejects a weapon above MAX_WEAPON_INDEX', () => {
      expect(parseClientMessage(send({ ...pose, w: MAX_WEAPON_INDEX + 1 }))).toBeNull();
      expect(parseClientMessage(send({ ...shot, w: MAX_WEAPON_INDEX + 1 }))).toBeNull();
      expect(parseClientMessage(send({ ...pose, w: MAX_WEAPON_INDEX }))).not.toBeNull();
    });

    it('requires a shot to say whether it went through the scope', () => {
      const { ads, ...withoutAds } = shot;
      expect(ads).toBe(false);
      expect(parseClientMessage(send(withoutAds))).toBeNull();
      expect(parseClientMessage(send({ ...shot, ads: 1 }))).toBeNull();
      expect(parseClientMessage(send({ ...shot, ads: true }))).toEqual({ ...shot, ads: true });
    });

    it('parses reloads and pickups, with their index in range', () => {
      expect(parseClientMessage(send({ type: 'reload', w: 3 }))).toEqual({ type: 'reload', w: 3 });
      expect(parseClientMessage(send({ type: 'pickup', i: 2 }))).toEqual({ type: 'pickup', i: 2 });
      expect(parseClientMessage(send({ type: 'reload', w: -1 }))).toBeNull();
      expect(parseClientMessage(send({ type: 'reload', w: MAX_WEAPON_INDEX + 1 }))).toBeNull();
      expect(parseClientMessage(send({ type: 'pickup', i: 1.5 }))).toBeNull();
      expect(parseClientMessage(send({ type: 'pickup', i: MAX_PICKUP_INDEX + 1 }))).toBeNull();
    });
  });

  describe('round', () => {
    it('accepts a round id of letters, digits, _ and -', () => {
      expect(parseClientMessage(send({ ...hello, round: 'a' }))).not.toBeNull();
      expect(parseClientMessage(send({ ...hello, round: 'A_9-z' }))).not.toBeNull();
    });

    it('rejects an empty round', () => {
      expect(parseClientMessage(send({ ...hello, round: '' }))).toBeNull();
    });

    it('rejects a 65-character round and accepts one of 64', () => {
      expect(parseClientMessage(send({ ...hello, round: 'a'.repeat(65) }))).toBeNull();
      expect(parseClientMessage(send({ ...hello, round: 'a'.repeat(64) }))).not.toBeNull();
    });

    it('rejects a round with a space', () => {
      expect(parseClientMessage(send({ ...hello, round: 'ab cd' }))).toBeNull();
    });
  });

  describe('env', () => {
    it('rejects an amount of 0', () => {
      expect(parseClientMessage(send({ ...env, amount: 0 }))).toBeNull();
    });

    it('rejects an amount above MAX_HEALTH and accepts MAX_HEALTH', () => {
      expect(parseClientMessage(send({ ...env, amount: MAX_HEALTH + 1 }))).toBeNull();
      expect(parseClientMessage(send({ ...env, amount: MAX_HEALTH }))).not.toBeNull();
    });

    it('rejects an unknown kind', () => {
      expect(parseClientMessage(send({ ...env, kind: 'poison' }))).toBeNull();
    });

    it('rejects a cause that is empty or too long', () => {
      expect(parseClientMessage(send({ ...env, cause: '' }))).toBeNull();
      expect(parseClientMessage(send({ ...env, cause: 'x'.repeat(MAX_CAUSE_LENGTH + 1) }))).toBeNull();
    });
  });
});
