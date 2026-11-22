// levels.js — the 3 rooms of the Halcyon Museum as data. buildRoom(index) returns a
// fresh room: walls and cover block movement and line-of-sight, guards patrol waypoint
// loops, cameras watch arcs, loot waits to be taken, the exit opens when its job is done.
import { ROOM_NAMES } from './config.js';

function rect(x, y, w, h) { return { x, y, w, h }; }
function guard(name, waypoints, speed) {
  return { name, waypoints, wp: 0, x: waypoints[0].x, y: waypoints[0].y, facing: 0,
    speed: speed || 70, pauseT: 0, scanDir: 1, suspicion: 0, state: 'patrol',
    stateT: 0, lastSeen: null, waryT: 0, investigateT: 0, target: null, alertT: 0 };
}
function camera(x, y, angleDeg, sweepDeg) {
  return { x, y, angle: (angleDeg * Math.PI) / 180, baseAngle: (angleDeg * Math.PI) / 180,
    sweep: (sweepDeg * Math.PI) / 180, phase: 0, loopedT: 0, spotted: false, beeped: false };
}
function loot(kind, x, y, label) { return { kind, x, y, label, taken: false }; }

export function buildRoom(index) {
  if (index === 0) return {
    index, name: ROOM_NAMES[0], floor: 0, entry: { x: 70, y: 650 },
    walls: [
      rect(560, 0, 24, 150),   // top stub — makes a choke lane by the cases
      rect(560, 570, 24, 150), // bottom stub
      rect(1120, 300, 160, 24), // short wall by the east case
    ],
    cover: [
      rect(300, 170, 120, 70), rect(300, 480, 120, 70),
      rect(760, 170, 120, 70), rect(760, 480, 120, 70),
      rect(620, 330, 42, 42), rect(620, 470, 42, 42),
      rect(150, 330, 56, 56), // the big plant by the painting
    ],
    guards: [
      guard('Bram', [{ x: 420, y: 360, pause: 1.6 }, { x: 900, y: 360, pause: 2.2 }, { x: 900, y: 540, pause: 1.4 }, { x: 420, y: 540, pause: 1.8 }]),
      guard('Ilsa', [{ x: 1080, y: 220, pause: 2.0 }, { x: 1080, y: 560, pause: 1.5 }]),
    ],
    cameras: [camera(640, 58, 90, 60)], // just below the HUD, sweeps the centre lane
    loot: [
      loot('diamond', 920, 118, 'LUMEN DIAMOND'),
      loot('painting', 46, 300, 'THE DROWNED SUN'),
    ],
    exit: rect(1180, 60, 64, 64), exitNeed: 'diamond', exitLocked: true,
    plate: null, vent: null, door: null,
  };
  if (index === 1) return {
    index, name: ROOM_NAMES[1], floor: 10, entry: { x: 100, y: 220 },
    walls: [
      rect(0, 0, 1280, 120),    // band above the horizontal arm
      rect(0, 320, 880, 400),   // block below the arm, left of the shaft
      rect(1100, 320, 180, 400), // block below the arm, right of the shaft
      rect(880, 300, 60, 20),   // service door (pickable shortcut, see door)
    ],
    cover: [rect(420, 250, 90, 46), rect(700, 150, 70, 40)],
    guards: [
      guard('Kessler', [{ x: 200, y: 220, pause: 1.2 }, { x: 1000, y: 220, pause: 1.2 }, { x: 990, y: 600, pause: 1.6 }], 92),
    ],
    cameras: [
      camera(520, 126, 90, 0),   // fixed — watches the vent exit
      camera(1050, 300, 180, 50), // sweeping — watches the corner
    ],
    loot: [],
    vent: rect(300, 140, 220, 60), // crawl space: hidden, 40% speed
    door: { x: 880, y: 300, w: 60, h: 20, picked: false },
    exit: rect(960, 600, 80, 60), exitNeed: null, exitLocked: false,
    plate: null,
  };
  return {
    index, name: ROOM_NAMES[2], floor: 20, entry: { x: 640, y: 600 },
    walls: [
      rect(280, 80, 24, 536), rect(976, 80, 24, 536),
      rect(280, 80, 330, 24), rect(670, 80, 330, 24), // top wall, skylight gap 610–670
      rect(280, 616, 300, 24), rect(700, 616, 300, 24), // bottom wall, entry gap 580–700
    ],
    cover: [rect(360, 200, 90, 50), rect(830, 460, 90, 50), rect(360, 460, 60, 60), rect(830, 200, 60, 60)],
    guards: [
      guard('Bram', [{ x: 480, y: 300, pause: 1.5 }, { x: 800, y: 300, pause: 1.5 }, { x: 800, y: 480, pause: 1.5 }, { x: 480, y: 480, pause: 1.5 }]),
      guard('Ilsa', [{ x: 360, y: 180, pause: 2.4 }, { x: 920, y: 180, pause: 2.4 }, { x: 920, y: 560, pause: 2.4 }, { x: 360, y: 560, pause: 2.4 }]),
    ],
    cameras: [camera(640, 108, 90, 60)],
    loot: [loot('ingot', 640, 360, 'GOLD INGOT')],
    exit: rect(610, 80, 60, 24), exitNeed: 'ingot', exitLocked: true, // the skylight
    plate: rect(580, 430, 120, 60), // pressure plate in front of the pedestal
    vent: null, door: null,
  };
}
