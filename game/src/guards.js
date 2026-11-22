// guards.js — patrols, vision cones, suspicion, alert + chase, coin investigation.
// Geometry helpers live here and are shared: cameras.js and thief.js import them.
// A cone is drawn clipped by walls, so the player sees exactly what the guard sees.
import { GUARD, CONE, SUSPICION, ALARM } from './config.js';

export function pointInRect(x, y, r) { return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; }
export function circleHitsRect(x, y, r, rect) {
  const cx = Math.max(rect.x, Math.min(x, rect.x + rect.w));
  const cy = Math.max(rect.y, Math.min(y, rect.y + rect.h));
  return (x - cx) ** 2 + (y - cy) ** 2 < r * r;
}
export function blockedAt(G, x, y, r) {
  if (x < 20 + r || x > 1280 - 20 - r || y < 20 + r || y > 720 - 20 - r) return true;
  for (const w of G.room.walls) if (circleHitsRect(x, y, r, w)) return true;
  for (const c of G.room.cover) if (circleHitsRect(x, y, r, c)) return true;
  return false;
}
export function lineBlocked(G, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0, dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 8));
  for (let i = 1; i < steps; i++) {
    const x = x0 + dx * i / steps, y = y0 + dy * i / steps;
    for (const w of G.room.walls) if (pointInRect(x, y, w)) return true;
    for (const c of G.room.cover) if (pointInRect(x, y, c)) return true;
    for (const s of G.clouds) if ((x - s.x) ** 2 + (y - s.y) ** 2 < s.r * s.r) return true;
  }
  return false;
}
export function inCone(gx, gy, facing, tx, ty, range) {
  const dx = tx - gx, dy = ty - gy, d = Math.hypot(dx, dy);
  if (d > (range || CONE.range)) return false;
  let a = Math.atan2(dy, dx) - facing;
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return Math.abs(a) < CONE.halfAngle;
}
// Raycast the cone edge so the drawn cone stops at walls and cover.
export function conePolygon(G, x, y, facing, range) {
  const pts = [{ x, y }];
  const maxR = range || CONE.range;
  for (let i = 0; i <= CONE.rays; i++) {
    const a = facing - CONE.halfAngle + (2 * CONE.halfAngle * i) / CONE.rays;
    let r = maxR;
    for (let d = 10; d <= maxR; d += 10) {
      const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
      let hit = false;
      for (const w of G.room.walls) if (pointInRect(px, py, w)) { hit = true; break; }
      if (!hit) for (const c of G.room.cover) if (pointInRect(px, py, c)) { hit = true; break; }
      if (hit) { r = d; break; }
    }
    pts.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r });
  }
  return pts;
}

export function guardSeesThief(G, g) {
  if (G.thiefHidden) return false;
  return inCone(g.x, g.y, g.facing, G.thief.x, G.thief.y, G.coneRange || CONE.range) &&
    !lineBlocked(G, g.x, g.y, G.thief.x, G.thief.y);
}

function guardWalkTo(G, g, tx, ty, dt, speed) {
  const dx = tx - g.x, dy = ty - g.y, d = Math.hypot(dx, dy);
  if (d < 4) return true;
  g.facing = Math.atan2(dy, dx);
  const nx = g.x + (dx / d) * speed * dt, ny = g.y + (dy / d) * speed * dt;
  if (!blockedAt(G, nx, g.y, GUARD.radius)) g.x = nx;
  if (!blockedAt(G, g.x, ny, GUARD.radius)) g.y = ny;
  return false;
}

export function updateGuards(G, dt) {
  const t = G.thief;
  for (const g of G.room.guards) {
    if (g.waryT > 0) g.waryT -= dt;
    const sees = guardSeesThief(G, g);
    if (sees) { g.lastSeen = { x: t.x, y: t.y }; G.anySeen = true; }
    // Hearing: a walking thief close by turns the guard to look.
    if (!sees && t.moving && !t.sneak && Math.hypot(g.x - t.x, g.y - t.y) < t.noise + 40 && g.state === 'patrol') {
      g.facing = Math.atan2(t.y - g.y, t.x - g.x);
    }
    if (g.state === 'patrol' || g.state === 'investigate') {
      if (sees) {
        const d = Math.hypot(g.x - t.x, g.y - t.y);
        const rate = d < SUSPICION.closeDist ? SUSPICION.closePerSec : (t.sneak ? SUSPICION.sneakPerSec : SUSPICION.openPerSec);
        g.suspicion += rate * dt;
        if (g.suspicion >= 100) {
          g.suspicion = 100; g.state = 'alert'; g.alertT = SUSPICION.graceSec;
          G.spotted++; G.events.push({ type: 'spotted', guard: g.name });
        }
      } else {
        g.suspicion = Math.max(0, g.suspicion - SUSPICION.decayPerSec * dt);
      }
    }
    if (g.state === 'patrol') {
      const wp = g.waypoints[g.wp];
      const spd = g.speed * (G.alarm.value >= 50 ? 1.15 : 1); // HEIGHTENED: patrols quicken
      if (g.pauseT > 0) {
        g.pauseT -= dt;
        g.facing = g.scanBase + Math.sin(G.time * 1.6) * (Math.PI / 4) * g.scanDir;
        if (g.pauseT <= 0) { g.wp = (g.wp + 1) % g.waypoints.length; }
      } else {
        const arrived = guardWalkTo(G, g, wp.x, wp.y, dt, spd);
        if (arrived) { g.pauseT = wp.pause || 1.5; g.scanBase = g.facing; g.scanDir = g.scanDir || 1; }
      }
    } else if (g.state === 'alert') {
      g.alertT -= dt;
      if (g.alertT <= 0) { g.state = 'chase'; g.stateT = 0; }
    } else if (g.state === 'chase') {
      G.alarm.value = Math.min(100, G.alarm.value + ALARM.chasePerSec * dt);
      g.stateT += dt;
      const tgt = g.lastSeen || { x: t.x, y: t.y };
      const arrived = guardWalkTo(G, g, tgt.x, tgt.y, dt, GUARD.chase);
      if (Math.hypot(g.x - t.x, g.y - t.y) < GUARD.catchDist) {
        G.events.push({ type: 'caught', guard: g.name });
      } else if (!sees && g.stateT > SUSPICION.loseSec) {
        g.state = 'patrol'; g.suspicion = SUSPICION.waryAfter; g.waryT = SUSPICION.warySec;
      }
    } else if (g.state === 'investigate') {
      if (g.target) {
        const arrived = guardWalkTo(G, g, g.target.x, g.target.y, dt, g.speed);
        if (arrived) {
          g.investigateT -= dt;
          g.facing += dt * 1.2;
          if (g.investigateT <= 0) { g.state = 'patrol'; g.suspicion = Math.min(100, g.suspicion + 15); g.target = null; }
        }
      } else { g.state = 'patrol'; }
    }
    g.suspicion = Math.max(0, Math.min(100, g.suspicion));
  }
}
