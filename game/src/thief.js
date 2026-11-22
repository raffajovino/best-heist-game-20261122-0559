// thief.js — Wren: move/sneak, noise, and the interact channel (grab loot, crack the
// glass case, pick the service door). Movement is axis-separated so she slides along
// walls instead of sticking on them.
import { THIEF, CHANNEL, ALARM } from './config.js';
import { blockedAt, lineBlocked } from './guards.js';

export function createThief(x, y) {
  return { x, y, r: THIEF.radius, dirX: 0, dirY: 1, sneak: false, moving: false,
    carrying: false, channel: null, noise: 0 };
}

export function thiefHidden(G) {
  const t = G.thief;
  for (const c of G.clouds) if ((t.x - c.x) ** 2 + (t.y - c.y) ** 2 < c.r * c.r) return true;
  if (G.room.vent && t.x >= G.room.vent.x && t.x <= G.room.vent.x + G.room.vent.w &&
      t.y >= G.room.vent.y && t.y <= G.room.vent.y + G.room.vent.h) return true;
  return false;
}

export function moveThief(G, dt, keys) {
  const t = G.thief;
  let dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  let dy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
  t.moving = dx !== 0 || dy !== 0;
  if (!t.moving) { t.noise = 0; return; }
  const len = Math.hypot(dx, dy); dx /= len; dy /= len;
  t.dirX = dx; t.dirY = dy;
  t.sneak = !!keys.sneak;
  let speed = t.sneak ? THIEF.sneak : THIEF.walk;
  if (t.carrying) speed *= THIEF.carrySlow;
  if (G.room.vent && t.x >= G.room.vent.x && t.x <= G.room.vent.x + G.room.vent.w &&
      t.y >= G.room.vent.y && t.y <= G.room.vent.y + G.room.vent.h) speed *= 0.4;
  const nx = t.x + dx * speed * dt, ny = t.y + dy * speed * dt;
  if (!blockedAt(G, nx, t.y, t.r)) t.x = nx;
  if (!blockedAt(G, t.x, ny, t.r)) t.y = ny;
  t.noise = t.sneak ? THIEF.noiseSneak : THIEF.noiseWalk;
  if (G.room.plate && !G.room.plateHit && t.x >= G.room.plate.x && t.x <= G.room.plate.x + G.room.plate.w &&
      t.y >= G.room.plate.y && t.y <= G.room.plate.y + G.room.plate.h) {
    G.room.plateHit = true;
    G.events.push({ type: 'plate' });
  }
}

// Interact: hold Space near loot / the service door. Being seen interrupts the case crack.
export function interactThief(G, dt) {
  const t = G.thief, ev = G.events;
  let target = null;
  for (const l of G.room.loot) {
    if (!l.taken && Math.hypot(l.x - t.x, l.y - t.y) < 52) { target = { kind: l.kind, item: l }; break; }
  }
  if (!target && G.room.door && !G.room.door.picked &&
      Math.hypot(G.room.door.x + 30 - t.x, G.room.door.y + 10 - t.y) < 56) {
    target = { kind: 'door', item: G.room.door };
  }
  if (!target) { t.channel = null; return; }
  const secs = target.kind === 'diamond' ? CHANNEL.diamondSec
    : target.kind === 'painting' ? CHANNEL.paintingSec
    : target.kind === 'ingot' ? CHANNEL.ingotSec : CHANNEL.doorSec;
  if (!t.channel || t.channel.kind !== target.kind) t.channel = { kind: target.kind, t: 0, secs, item: target.item };
  if (target.kind === 'diamond' && G.anySeen) { t.channel = null; ev.push({ type: 'interrupted' }); return; }
  t.channel.t += dt;
  if (t.channel.t < secs) return;
  t.channel = null;
  if (target.kind === 'diamond') {
    target.item.taken = true; t.carrying = true;
    G.room.exitLocked = false;
    ev.push({ type: 'crack' });
    for (const g of G.room.guards) {
      if (Math.hypot(g.x - t.x, g.y - t.y) < 200 && g.state === 'patrol') { g.facing = Math.atan2(t.y - g.y, t.x - g.x); }
    }
  } else if (target.kind === 'door') {
    target.item.picked = true;
    G.room.walls = G.room.walls.filter(w => w !== G.room.doorWall);
    ev.push({ type: 'picked' });
  } else {
    target.item.taken = true;
    ev.push({ type: 'grabbed', kind: target.kind });
  }
}

export function lootCount(G) { return G.room.loot.filter(l => l.taken).length; }
export function totalLoot(G) { return G.room.loot.length; }
