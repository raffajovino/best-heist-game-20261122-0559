// tools.js — the three tools, each with a cost. Coin: pulls a guard off a doorway but
// the clink is heard by cameras. Smoke: hides a crossing, but a camera that sees smoke
// reports it. Loop: the rarest charge — a guard who passes the looped camera checks it.
import { TOOLS, GUARD, ALARM } from './config.js';

export function throwCoin(G, tx, ty) {
  if (G.tools.coin <= 0) { G.events.push({ type: 'noTool', tool: 'coin' }); return; }
  const d = Math.hypot(tx - G.thief.x, ty - G.thief.y);
  if (d > TOOLS.coinRange) { const s = TOOLS.coinRange / d; tx = G.thief.x + (tx - G.thief.x) * s; ty = G.thief.y + (ty - G.thief.y) * s; }
  G.tools.coin--;
  G.coins.push({ sx: G.thief.x, sy: G.thief.y, tx, ty, t: 0, dur: TOOLS.coinFlightSec });
  G.events.push({ type: 'coinThrown' });
}

export function throwSmoke(G, tx, ty) {
  if (G.tools.smoke <= 0) { G.events.push({ type: 'noTool', tool: 'smoke' }); return; }
  const d = Math.hypot(tx - G.thief.x, ty - G.thief.y);
  if (d > TOOLS.coinRange) { const s = TOOLS.coinRange / d; tx = G.thief.x + (tx - G.thief.x) * s; ty = G.thief.y + (ty - G.thief.y) * s; }
  G.tools.smoke--;
  G.clouds.push({ x: tx, y: ty, r: TOOLS.smokeRadius, t: TOOLS.smokeSec });
  G.events.push({ type: 'smokeThrown' });
}

export function loopCameraAt(G, x, y) {
  if (G.tools.loop <= 0) { G.events.push({ type: 'noTool', tool: 'loop' }); return false; }
  for (const cam of G.room.cameras) {
    if (Math.hypot(cam.x - x, cam.y - y) < 60) {
      cam.loopedT = TOOLS.loopSec; G.tools.loop--;
      G.events.push({ type: 'looped' });
      return true;
    }
  }
  return false;
}

export function updateTools(G, dt) {
  for (let i = G.coins.length - 1; i >= 0; i--) {
    const c = G.coins[i];
    c.t += dt;
    if (c.t >= c.dur) {
      G.coins.splice(i, 1);
      G.events.push({ type: 'coinLanded', x: c.tx, y: c.ty });
      for (const g of G.room.guards) {
        if (g.state === 'patrol' && Math.hypot(g.x - c.tx, g.y - c.ty) < GUARD.hearRadius) {
          g.state = 'investigate'; g.target = { x: c.tx, y: c.ty }; g.investigateT = 3;
        }
      }
      for (const cam of G.room.cameras) {
        if (cam.loopedT <= 0 && Math.hypot(cam.x - c.tx, cam.y - c.ty) < 200) {
          G.alarm.value = Math.min(100, G.alarm.value + ALARM.coinHeard);
        }
      }
    }
  }
  for (let i = G.clouds.length - 1; i >= 0; i--) {
    G.clouds[i].t -= dt;
    if (G.clouds[i].t <= 0) G.clouds.splice(i, 1);
  }
}

export function coinPosition(c) {
  const k = Math.min(1, c.t / c.dur);
  return { x: c.sx + (c.tx - c.sx) * k, y: c.sy + (c.ty - c.sy) * k - Math.sin(k * Math.PI) * 42, k };
}
