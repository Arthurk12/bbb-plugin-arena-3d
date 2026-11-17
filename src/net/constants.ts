/** Positions outside this box are rejected as corrupt. */
export const MAX_COORDINATE = 1000; // meters

export const MAX_HEALTH = 100;

export const MAX_WEAPON_INDEX = 7;

/** Highest pickup index a client may name. */
export const MAX_PICKUP_INDEX = 63;

export const MAX_USER_ID_LENGTH = 128;

/** Integers above this would overflow a Java int downstream; counters stay below it. */
export const MAX_COUNTER = 2 ** 31 - 1;
