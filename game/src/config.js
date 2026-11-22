// config.js — every tunable number for BLUEPRINT: The Halcyon Heist, in one place.
// Palette: blueprint indigo paper, warm amber danger, gold loot, dark safe cover.
export const CANVAS_W = 1280;
export const CANVAS_H = 720;

export const PALETTE = {
  paper: '#0e1a3a',
  paperDeep: '#0a1226',
  grid: 'rgba(255,255,255,0.05)',
  wallFill: '#16264d',
  wallLine: '#e8f0ff',
  coverFill: '#0a1226',
  coverLine: '#5fd4e6',
  cone: 'rgba(255,170,40,0.26)',
  coneEdge: 'rgba(255,190,80,0.75)',
  coneHot: 'rgba(255,70,50,0.30)',
  coneGrey: 'rgba(160,170,190,0.18)',
  gold: '#f2c14e',
  goldGlow: '#ffd97a',
  amber: '#ffb02e',
  red: '#ff4d3d',
  white: '#eef3ff',
  dim: '#8fa3c8',
  hud: '#101d42',
};

export const THIEF = { radius: 12, walk: 150, sneak: 75, carrySlow: 0.9, noiseWalk: 60, noiseSneak: 0 };
export const GUARD = { radius: 13, patrol: 70, patrolFast: 92, chase: 170, catchDist: 22, hearRadius: 160 };
export const CONE = { halfAngle: (37.5 * Math.PI) / 180, range: 230, rays: 24 };
export const CAMERA = { sweepSpeed: (40 * Math.PI) / 180, range: 230 };

export const SUSPICION = {
  openPerSec: 55, sneakPerSec: 28, closePerSec: 80, closeDist: 90,
  decayPerSec: 25, graceSec: 1.5, loseSec: 4, waryAfter: 40, warySec: 10, investigateSec: 3,
};
export const ALARM = {
  cameraPerSec: 18, chasePerSec: 12, smokeCameraPerSec: 6, crackInstant: 8, plateInstant: 20,
  coinHeard: 4, decayPerSec: 4,
};
export const TOOLS = { coin: 3, smoke: 2, loop: 1, coinRange: 320, coinFlightSec: 0.45, smokeRadius: 110, smokeSec: 6, loopSec: 20 };
export const CHANNEL = { diamondSec: 1.2, paintingSec: 0.8, ingotSec: 1.0, doorSec: 3.0 };
export const ROOM_NAMES = ['ROOM 1 — GRAND GALLERY', 'ROOM 2 — SERVICE CORRIDOR', 'ROOM 3 — VAULT OF LIGHT'];
export const HUD_MIN_PX = 16;
