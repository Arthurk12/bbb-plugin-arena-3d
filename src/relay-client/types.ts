import { Pose } from '../commons/types';
import { ClientMessage, ServerMessage, SnapshotMessage } from '../protocol/types';

/** The relay's clock as seen from here. */
export interface RelayClock {
  /** Feeds a pong: local time the ping left, relay time in the pong, local time it arrived. */
  onPong: (sentAt: number, relayTime: number, receivedAt: number) => void;
  /** Relay time matching local time `localNow`; null until the first pong. */
  relayNow: (localNow: number) => number | null;
  /** RTT of the sample in use, ms; null until the first pong. */
  rtt: () => number | null;
  reset: () => void;
}

export interface TimedPose {
  /** Relay time, ms. */
  t: number;
  pose: Pose;
}

/** Latest state of a remote player, from the last snapshot that listed them. */
export interface RemoteState {
  t: number;
  pose: Pose;
  w: number;
  alive: boolean;
  on: boolean;
}

export interface SnapshotStore {
  apply: (snapshot: SnapshotMessage) => void;
  remove: (userId: string) => void;
  clear: () => void;
  /** Pose at relay time `t`, blended, written into `out`; null for an unknown player. */
  sample: (userId: string, t: number, out: Pose) => Pose | null;
  latest: (userId: string) => RemoteState | null;
  userIds: () => string[];
}

export type ConnectionStatus = 'connecting' | 'open' | 'failed' | 'closed';

/** The part of a browser WebSocket the connection uses (the `ws` package has it too). */
export interface SocketLike {
  readyState: number;
  send: (data: string) => void;
  close: (code?: number, reason?: string) => void;
  onopen: ((event: unknown) => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: ((event: { code: number }) => void) | null;
  onerror: ((event: unknown) => void) | null;
}

export interface RelayConnectionOptions {
  /** Relay URL without the session token (see `resolveRelayUrl`). */
  url: string;
  sessionToken: string;
  round: string;
  onMessage: (message: ServerMessage) => void;
  onStatus: (status: ConnectionStatus) => void;
  /** Defaults to `(url) => new WebSocket(url)`. */
  createSocket?: (url: string) => SocketLike;
  /** Local clock, ms. Defaults to `performance.now()`. */
  now?: () => number;
}

export interface RelayConnection {
  /** Sends when open; dropped otherwise (the game sends state again soon). */
  send: (message: ClientMessage) => void;
  clock: RelayClock;
  status: () => ConnectionStatus;
  /** Final: no reconnection after this. */
  close: () => void;
}
