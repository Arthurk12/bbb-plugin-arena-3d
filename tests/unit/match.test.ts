import { describe, expect, it } from 'vitest';
import { DataChannelEntryResponseType } from 'bigbluebutton-html-plugin-sdk';
import { newRoundId, parseMatchState } from '../../src/match/service';
import { MatchStatePayload } from '../../src/match/types';
import { ROUND_ID_LENGTH } from '../../src/match/constants';

const entry = (payloadJson: unknown) => ({
  entryId: 'e1', payloadJson,
} as DataChannelEntryResponseType<MatchStatePayload>);

describe('parseMatchState', () => {
  it('reads the latest entry', () => {
    expect(parseMatchState([entry({ active: true, round: 'abc' })])).toEqual({
      entryId: 'e1', active: true, round: 'abc',
    });
  });

  it('treats a missing or malformed entry as no match', () => {
    expect(parseMatchState(undefined)).toBeNull();
    expect(parseMatchState([])).toBeNull();
    expect(parseMatchState([entry({ active: true })])).toBeNull();
    expect(parseMatchState([entry({ active: 'yes', round: 'abc' })])?.active).toBe(false);
  });
});

describe('newRoundId', () => {
  it('makes distinct short ids', () => {
    const a = newRoundId();
    expect(a).toHaveLength(ROUND_ID_LENGTH);
    expect(newRoundId()).not.toBe(a);
  });
});
