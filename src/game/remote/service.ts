import { hashString } from '../../commons/utils';

const HUE_STEPS = 360;

/** Torso hue derived from the user id: the same on every client. */
export const userHue = (userId: string): number => (hashString(userId) % HUE_STEPS) / HUE_STEPS;

export const truncateName = (name: string, maxChars: number): string => (
  name.length > maxChars ? `${name.slice(0, maxChars - 1)}…` : name
);
