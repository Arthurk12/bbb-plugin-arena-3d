import { Vec3 } from '../../commons/types';
import { block, boxOn, stairs } from './service';
import { JumpPad, LevelBlock, LevelDefinition } from './types';

/*
 * "Rooftop Rumble": a walled 64 × 64 m yard. A central tower with stairs north and south,
 * four corner buildings with stairs, two high ledges reached by jump pads, crates and pillars
 * for cover, and a slime pit north of the tower. Data only: meters, y up, the yard's floor at 0.
 */

const HALF = 32;
const WALL_HEIGHT = 10;
const FLOOR_BOTTOM = -2.5;
const TOWER_TOP = 3;
const BUILDING_TOP = 4;
const LEDGE_TOP = 6;
const STEP_RISE = 0.5;
const STEP_RUN = 0.8;
const CRATE = 1.6;

const PIT = {
  x: 5, zNear: -14, zFar: -20, bottom: -1.5,
};

const floor: LevelBlock[] = [
  block([-HALF, FLOOR_BOTTOM, PIT.zNear], [HALF, 0, HALF], 'floor'),
  block([-HALF, FLOOR_BOTTOM, -HALF], [HALF, 0, PIT.zFar], 'floor'),
  block([-HALF, FLOOR_BOTTOM, PIT.zFar], [-PIT.x, 0, PIT.zNear], 'floor'),
  block([PIT.x, FLOOR_BOTTOM, PIT.zFar], [HALF, 0, PIT.zNear], 'floor'),
  block([-PIT.x, FLOOR_BOTTOM, PIT.zFar], [PIT.x, PIT.bottom, PIT.zNear], 'metal'),
  // A ledge inside the pit, so a jump gets you out.
  block([-PIT.x, FLOOR_BOTTOM, PIT.zFar], [-3.5, -0.75, PIT.zNear], 'metal'),
];

const walls: LevelBlock[] = [
  block([-HALF - 1, FLOOR_BOTTOM, -HALF - 1], [-HALF, WALL_HEIGHT, HALF + 1], 'wall'),
  block([HALF, FLOOR_BOTTOM, -HALF - 1], [HALF + 1, WALL_HEIGHT, HALF + 1], 'wall'),
  block([-HALF, FLOOR_BOTTOM, -HALF - 1], [HALF, WALL_HEIGHT, -HALF], 'wall'),
  block([-HALF, FLOOR_BOTTOM, HALF], [HALF, WALL_HEIGHT, HALF + 1], 'wall'),
];

const towerSteps = TOWER_TOP / STEP_RISE;
const tower: LevelBlock[] = [
  block([-4, 0, -4], [4, TOWER_TOP, 4], 'concrete'),
  ...stairs({
    foot: 4 + towerSteps * STEP_RUN,
    across: 0,
    direction: '-z',
    width: 3,
    steps: towerSteps,
    rise: STEP_RISE,
    run: STEP_RUN,
    baseY: 0,
    material: 'metal',
  }),
  ...stairs({
    foot: -4 - towerSteps * STEP_RUN,
    across: 0,
    direction: '+z',
    width: 3,
    steps: towerSteps,
    rise: STEP_RISE,
    run: STEP_RUN,
    baseY: 0,
    material: 'metal',
  }),
  boxOn([3.2, TOWER_TOP, 3.2], [1, 1, 1], 'crate'),
  boxOn([-3.2, TOWER_TOP, -3.2], [1, 1, 1], 'crate'),
  boxOn([3.2, TOWER_TOP, -3.2], [1, 1, 1], 'crate'),
  boxOn([-3.2, TOWER_TOP, 3.2], [1, 1, 1], 'crate'),
];

const buildingSteps = BUILDING_TOP / STEP_RISE;
const SIGNS: [number, number][] = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
const buildings: LevelBlock[] = SIGNS.flatMap(([sx, sz]) => [
  block(
    [Math.min(sx * 17, sx * 27), 0, Math.min(sz * 17, sz * 27)],
    [Math.max(sx * 17, sx * 27), BUILDING_TOP, Math.max(sz * 17, sz * 27)],
    'wall',
  ),
  ...stairs({
    foot: sx * (17 - buildingSteps * STEP_RUN),
    across: sz * 19,
    direction: sx > 0 ? '+x' : '-x',
    width: 2.4,
    steps: buildingSteps,
    rise: STEP_RISE,
    run: STEP_RUN,
    baseY: 0,
    material: 'metal',
  }),
  boxOn([sx * 25.5, BUILDING_TOP, sz * 25.5], [1.2, 1.2, 1.2], 'crate'),
]);

const ledges: LevelBlock[] = [
  block([28, 0, -8], [HALF, LEDGE_TOP, 8], 'concrete'),
  block([-HALF, 0, -8], [-28, LEDGE_TOP, 8], 'concrete'),
];

const cover: LevelBlock[] = [
  boxOn([10, 0, 10], [CRATE, CRATE, CRATE], 'crate'),
  boxOn([10.2, CRATE, 10.1], [1.1, 1.1, 1.1], 'crate'),
  boxOn([-10, 0, 12], [CRATE, CRATE, CRATE], 'crate'),
  boxOn([12, 0, -8], [CRATE, CRATE, CRATE], 'crate'),
  boxOn([-12, 0, -6], [CRATE, CRATE, CRATE], 'crate'),
  boxOn([-11, 0, -7.4], [CRATE, CRATE, CRATE], 'crate'),
  boxOn([6, 0, 22], [CRATE, CRATE, CRATE], 'crate'),
  boxOn([-6, 0, -26], [CRATE, CRATE, CRATE], 'crate'),
  boxOn([13, 0, -24], [CRATE, CRATE, CRATE], 'crate'),
  boxOn([-13, 0, 26], [CRATE, CRATE, CRATE], 'crate'),
  boxOn([16, 0, 7], [1, 7, 1], 'metal'),
  boxOn([-16, 0, 7], [1, 7, 1], 'metal'),
  boxOn([16, 0, -7], [1, 7, 1], 'metal'),
  boxOn([-16, 0, -7], [1, 7, 1], 'metal'),
];

const PAD_HEIGHT = 0.25;
const PAD_LAUNCH_UP = 17; // m/s: clears the 6 m ledges
const PAD_LAUNCH_SIDE = 6; // m/s
const padAt = (x: number, launch: Vec3): JumpPad => ({
  min: [x - 1, 0, -1], max: [x + 1, PAD_HEIGHT, 1], launch,
});
const pads: JumpPad[] = [
  padAt(23, [PAD_LAUNCH_SIDE, PAD_LAUNCH_UP, 0]),
  padAt(-23, [-PAD_LAUNCH_SIDE, PAD_LAUNCH_UP, 0]),
];

const NEON = 0.12;
const decor: LevelBlock[] = [
  block([-PIT.x, -1.05, PIT.zFar], [PIT.x, -1, PIT.zNear], 'slime'),
  block([-4, TOWER_TOP, 4 - NEON], [4, TOWER_TOP + NEON, 4], 'neonPink'),
  block([-4, TOWER_TOP, -4], [4, TOWER_TOP + NEON, -4 + NEON], 'neonPink'),
  block([28, LEDGE_TOP, -8], [28 + NEON, LEDGE_TOP + NEON, 8], 'neonCyan'),
  block([-28 - NEON, LEDGE_TOP, -8], [-28, LEDGE_TOP + NEON, 8], 'neonCyan'),
  ...SIGNS.map(([sx, sz]) => block(
    [Math.min(sx * 17, sx * 27), BUILDING_TOP, sz > 0 ? 17 : -17 - NEON],
    [Math.max(sx * 17, sx * 27), BUILDING_TOP + NEON, sz > 0 ? 17 + NEON : -17],
    sx * sz > 0 ? 'neonCyan' : 'neonPink',
  )),
];

const QUARTER = Math.PI / 4;

export const ARENA_LEVEL: LevelDefinition = {
  blocks: [
    ...floor, ...walls, ...tower, ...buildings, ...ledges, ...cover,
    ...pads.map((pad) => ({ min: pad.min, max: pad.max, material: 'pad' as const })),
  ],
  pads,
  hazards: [
    {
      min: [-PIT.x, PIT.bottom - 0.1, PIT.zFar],
      max: [PIT.x, -0.9, PIT.zNear],
      damagePerSecond: 30,
    },
  ],
  decor,
  pickups: [
    { position: [0, TOWER_TOP, 0], heal: 50 },
    { position: [30, LEDGE_TOP, 0], heal: 25 },
    { position: [-30, LEDGE_TOP, 0], heal: 25 },
    { position: [0, PIT.bottom, -17], heal: 50 },
    { position: [24.5, BUILDING_TOP, -19.5], heal: 25 },
    { position: [-24.5, BUILDING_TOP, 19.5], heal: 25 },
  ],
  spawns: [
    { position: [0, 0, 14], yaw: 0 },
    { position: [0, 0, -26], yaw: Math.PI },
    { position: [14, 0, 0], yaw: Math.PI / 2 },
    { position: [-14, 0, 0], yaw: -Math.PI / 2 },
    { position: [22, BUILDING_TOP, 22], yaw: QUARTER },
    { position: [-22, BUILDING_TOP, 22], yaw: -QUARTER },
    { position: [22, BUILDING_TOP, -22], yaw: 3 * QUARTER },
    { position: [-22, BUILDING_TOP, -22], yaw: -3 * QUARTER },
    { position: [24, 0, 11], yaw: Math.PI / 2 },
    { position: [-24, 0, -11], yaw: -Math.PI / 2 },
  ],
  killY: -10,
};
