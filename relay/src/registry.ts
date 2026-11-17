import { RELAY_LIMITS } from '../../src/protocol/constants';
import { createRoom } from './room';
import { Room, RoomRegistry } from './types';

/**
 * One room per meeting and round, created on first use. A round that restarts gets a new room,
 * so its scores start from zero while the meeting keeps its place.
 */
export const createRoomRegistry = (
  clock: () => number,
  makeRoom: (key: string) => Room = (key) => createRoom(key, { clock }),
): RoomRegistry => {
  const rooms = new Map<string, Room>();

  return {
    get: (meetingId, round) => {
      const key = `${meetingId}:${round}`;
      let room = rooms.get(key);
      if (!room) {
        room = makeRoom(key);
        rooms.set(key, room);
      }
      return room;
    },

    // Rooms with nobody connected have nothing to draw, so they are not ticked.
    tickAll: () => {
      rooms.forEach((room) => {
        if (room.connectedCount() > 0) {
          room.tick();
        }
      });
    },

    // Empty rooms are kept for a while, so a reload does not lose the scores.
    sweep: () => {
      const now = clock();
      rooms.forEach((room, key) => {
        const emptySince = room.emptySince();
        if (emptySince !== null && now - emptySince >= RELAY_LIMITS.emptyRoomTtlMs) {
          rooms.delete(key);
        }
      });
    },

    size: () => rooms.size,
  };
};
