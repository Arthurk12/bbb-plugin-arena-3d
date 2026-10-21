import { describe, expect, it } from 'vitest';
import {
  canHeal, createCombatState, heal, respawn, respawnDue, respawnInSeconds, restoreScore, takeDamage,
} from '../../src/game/combat/service';
import { RESPAWN_DELAY_MS, SPAWN_PROTECTION_MS } from '../../src/game/combat/constants';

const LATER = SPAWN_PROTECTION_MS + 1;

describe('combat', () => {
  it('loses health and dies, crediting the killer', () => {
    let state = createCombatState(0);
    ({ state } = takeDamage(state, 60, 'enemy', 'me', LATER));
    expect(state.health).toBe(40);
    const outcome = takeDamage(state, 60, 'enemy', 'me', LATER);
    expect(outcome.died).toBe(true);
    expect(outcome.taken).toBe(40);
    expect(outcome.state).toMatchObject({
      health: 0, alive: false, deaths: 1, lastKiller: 'enemy', killedBy: { enemy: 1 },
    });
  });

  it('counts a suicide as a death but not as anyone\'s frag', () => {
    const outcome = takeDamage(createCombatState(0), 1000, 'me', 'me', LATER);
    expect(outcome.state.deaths).toBe(1);
    expect(outcome.state.killedBy).toEqual({});
    expect(outcome.state.lastKiller).toBe('me');
  });

  it('protects freshly spawned players from others, not from slime', () => {
    const state = createCombatState(0);
    expect(takeDamage(state, 50, 'enemy', 'me', 10).taken).toBe(0);
    expect(takeDamage(state, 50, 'me', 'me', 10).taken).toBe(50);
  });

  it('ignores damage once dead', () => {
    const dead = takeDamage(createCombatState(0), 1000, 'enemy', 'me', LATER).state;
    expect(takeDamage(dead, 10, 'enemy', 'me', LATER + 1).taken).toBe(0);
  });

  it('respawns after the delay with full health', () => {
    const dead = takeDamage(createCombatState(0), 1000, 'enemy', 'me', LATER).state;
    expect(respawnDue(dead, LATER + RESPAWN_DELAY_MS - 1)).toBe(false);
    expect(respawnInSeconds(dead, LATER)).toBe(RESPAWN_DELAY_MS / 1000);
    expect(respawnDue(dead, LATER + RESPAWN_DELAY_MS)).toBe(true);
    const alive = respawn(dead, LATER + RESPAWN_DELAY_MS);
    expect(alive).toMatchObject({ health: 100, alive: true, deaths: 1 });
  });

  it('heals up to the maximum, only when hurt', () => {
    const full = createCombatState(0);
    expect(canHeal(full)).toBe(false);
    const hurt = takeDamage(full, 30, 'me', 'me', 0).state;
    expect(heal(hurt, 50).health).toBe(100);
  });

  it('restores the stored score after a reload', () => {
    const restored = restoreScore(createCombatState(0), {
      r: 'r',
      on: true,
      p: [0, 0, 0],
      y: 0,
      x: 0,
      h: 100,
      w: 0,
      s: 0,
      t: 0,
      hn: 0,
      dt: 3,
      lk: 'enemy',
      kb: { enemy: 2 },
      hits: [],
    });
    expect(restored).toMatchObject({ deaths: 3, lastKiller: 'enemy', killedBy: { enemy: 2 } });
  });
});
