import { describe, expect, it } from 'vitest';
import { resolveRelayUrl, withSessionToken } from '../../src/relay-client/url';

describe('resolveRelayUrl', () => {
  it('returns an explicit setting as is', () => {
    expect(resolveRelayUrl('wss://relay.example/x', 'https://bbb.example/a.js', 'https://p/'))
      .toBe('wss://relay.example/x');
  });

  it('uses the script host with wss from an https script', () => {
    expect(resolveRelayUrl('', 'https://bbb.example/plugin/arena.js', 'https://page/'))
      .toBe('wss://bbb.example/arena-relay');
  });

  it('resolves a relative script src against the page', () => {
    expect(resolveRelayUrl('', '/plugins/x.js', 'https://bbb.example.com/html5client/'))
      .toBe('wss://bbb.example.com/arena-relay');
  });

  it('uses ws from an http page when there is no script', () => {
    expect(resolveRelayUrl('  ', null, 'http://localhost:8080/meeting'))
      .toBe('ws://localhost:8080/arena-relay');
  });
});

describe('withSessionToken', () => {
  it('adds the token as the first query parameter', () => {
    expect(withSessionToken('wss://h/arena-relay', 'abc'))
      .toBe('wss://h/arena-relay?sessionToken=abc');
  });

  it('appends to an existing query', () => {
    expect(withSessionToken('wss://h/arena-relay?x=1', 'abc'))
      .toBe('wss://h/arena-relay?x=1&sessionToken=abc');
  });

  it('encodes the token', () => {
    expect(withSessionToken('wss://h/arena-relay', 'a b/c'))
      .toBe('wss://h/arena-relay?sessionToken=a%20b%2Fc');
  });
});
