// shots.js — deterministic staged screenshots. Each ?shot= plays the REAL rules forward
// from a fresh room with a scripted autopilot and a fixed seed, then freezes the frame:
// the screenshot is what a real game looks like, and the same seed always gives the
// same frame. Cover: room 1 mid-heist with everything in one frame. Patrol: sneak +
// suspicion + coin mid-air + smoke. Alarm: the fair caught moment at high alarm.
// Getaway: the payoff screen with its tally.
import { mulberry32 } from './random.js';
import { throwCoin, throwSmoke } from './tools.js';

const STEP = 1 / 60;

function steer(G, tx, ty) {
  const t = G.thief;
  const dx = tx - t.x, dy = ty - t.y;
  const k = G.input.keys;
  k.left = dx < -8; k.right = dx > 8; k.up = dy < -8; k.down = dy > 8;
  k.sneak = true;
  return Math.hypot(dx, dy) < 14;
}

function runSteps(G, seconds, drive) {
  const n = Math.round(seconds / STEP);
  for (let i = 0; i < n; i++) {
    if (drive) drive(i * STEP);
    // One real play tick, through the live game's own update (main.js exposes it).
    window.__step(G, STEP);
  }
}

export function stageShot(G, name) {
  G.rng = mulberry32(name === 'cover' ? 11 : name === 'patrol' ? 22 : name === 'alarm' ? 33 : 44);
  G.state = 'play';
  if (name === 'cover') {
    const path = [{ x: 200, y: 600 }, { x: 340, y: 470 }];
    let pi = 0;
    runSteps(G, 6, () => { if (pi < path.length && steer(G, path[pi].x, path[pi].y)) pi++; });
    G.alarm.value = 12; G.alarm.peak = 12;
  } else if (name === 'patrol') {
    const path = [{ x: 120, y: 480 }, { x: 150, y: 420 }];
    let pi = 0, smoked = false, coined = false;
    runSteps(G, 3.5, (t) => {
      if (pi < path.length && steer(G, path[pi].x, path[pi].y)) pi++;
      if (!smoked && t > 2.8) { smoked = true; throwSmoke(G, 850, 200); }
      if (!coined && t > 3.3) { coined = true; throwCoin(G, 700, 300); }
    });
    G.room.guards[0].suspicion = 50;
    G.alarm.value = 18; G.alarm.peak = 18;
  } else if (name === 'alarm') {
    const cam = G.room.cameras[0];
    cam.angle = Math.atan2(230 - cam.y, 750 - cam.x); cam.sweep = 0;
    G.thief.x = 750; G.thief.y = 230; G.thief.carrying = true;
    G.room.loot[0].taken = true; G.room.exitLocked = false; G.totalLootTaken = 1;
    G.alarm.value = 85; G.alarm.peak = 85;
    G.time = 118; G.roomTime = 118; G.totalTime = 118; // mid-heist, not the first second
    const g = G.room.guards[0];
    g.state = 'chase'; g.suspicion = 100; g.x = 620; g.y = 300;
    g.lastSeen = { x: 750, y: 230 }; g.stateT = 0;
    runSteps(G, 0.15, null);
  } else if (name === 'getaway') {
    // Backdrop: the vault, then the payoff card with a real tally.
    const loadRoom = window.__loadRoom;
    if (loadRoom) loadRoom(G, 2);
    G.tally = { loot: 3, time: 252, peakAlarm: 61, spotted: 2, toolsLeft: 2, rank: 'CLEAN GETAWAY' };
    G.state = 'getaway';
    G.frozen = true;
    return;
  }
  G.frozen = true;
}
