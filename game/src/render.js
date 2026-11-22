// render.js — the blueprint look. Indigo paper, white line walls, dark cover, amber
// cones, gold loot: danger warm, safety dark, loot gold, readable at a glance. The HUD
// is drawn IN the canvas (never DOM) so every screenshot carries it, all text ≥16 px bold.
import { CANVAS_W, CANVAS_H, PALETTE, HUD_MIN_PX } from './config.js';
import { conePolygon } from './guards.js';
import { cameraConePolygon } from './cameras.js';
import { coinPosition } from './tools.js';
import { lootCount, totalLoot } from './thief.js';
import { alarmState } from './alarm.js';

const F = (px, bold) => `${bold ? 'bold ' : ''}${px}px monospace, sans-serif`;

function fillPoly(ctx, pts, fill, edge) {
  ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  if (edge) { ctx.strokeStyle = edge; ctx.lineWidth = 1.5; ctx.stroke(); }
}

export function renderGame(G) {
  const ctx = G.ctx;
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  drawPaper(ctx);
  drawRoom(ctx, G);
  drawCones(ctx, G);
  drawCover(ctx, G);
  drawLoot(ctx, G);
  drawExit(ctx, G);
  drawGuards(ctx, G);
  drawCameras(ctx, G);
  drawThief(ctx, G);
  drawToolsFx(ctx, G);
  drawHUD(ctx, G);
  if (G.state === 'title') drawTitle(ctx, G);
  else if (G.state === 'roomClear') drawRoomClear(ctx, G);
  else if (G.state === 'caught') drawCaught(ctx, G);
  else if (G.state === 'getaway') drawGetaway(ctx, G);
  else if (G.state === 'paused') drawPaused(ctx, G);
}

function drawPaper(ctx) {
  ctx.fillStyle = PALETTE.paper; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.strokeStyle = PALETTE.grid; ctx.lineWidth = 1;
  for (let x = 0; x <= CANVAS_W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); ctx.stroke(); }
  for (let y = 0; y <= CANVAS_H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke(); }
}

function drawRoom(ctx, G) {
  for (const w of G.room.walls) {
    ctx.fillStyle = PALETTE.wallFill; ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.strokeStyle = PALETTE.wallLine; ctx.lineWidth = 2; ctx.strokeRect(w.x, w.y, w.w, w.h);
    ctx.strokeStyle = 'rgba(232,240,255,0.35)'; ctx.lineWidth = 1;
    ctx.strokeRect(w.x + 4, w.y + 4, w.w - 8, w.h - 8);
  }
  if (G.room.vent) {
    const v = G.room.vent;
    ctx.fillStyle = 'rgba(95,212,230,0.10)'; ctx.fillRect(v.x, v.y, v.w, v.h);
    ctx.strokeStyle = PALETTE.coverLine; ctx.setLineDash([6, 4]); ctx.lineWidth = 1.5;
    ctx.strokeRect(v.x, v.y, v.w, v.h); ctx.setLineDash([]);
    ctx.fillStyle = PALETTE.coverLine; ctx.font = F(16, true);
    ctx.fillText('VENT — CRAWL', v.x + 8, v.y + v.h / 2 + 6);
  }
  if (G.room.plate) {
    const p = G.room.plate;
    ctx.fillStyle = G.room.plateHit ? 'rgba(255,77,61,0.35)' : 'rgba(255,176,46,0.25)';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeStyle = PALETTE.amber; ctx.lineWidth = 2; ctx.strokeRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = PALETTE.amber; ctx.font = F(16, true);
    ctx.fillText('PRESSURE PLATE', p.x + 6, p.y + p.h / 2 + 6);
  }
  if (G.room.door && !G.room.door.picked) {
    const d = G.room.door;
    ctx.fillStyle = PALETTE.amber; ctx.font = F(16, true);
    ctx.fillText('SERVICE DOOR — HOLD SPACE TO PICK', d.x - 60, d.y - 8);
  }
}

function drawCones(ctx, G) {
  for (const g of G.room.guards) {
    const hot = g.state === 'chase' || g.state === 'alert' || g.suspicion > 60 || g.waryT > 0;
    fillPoly(ctx, conePolygon(G, g.x, g.y, g.facing), hot ? PALETTE.coneHot : PALETTE.cone,
      hot ? 'rgba(255,90,60,0.8)' : PALETTE.coneEdge);
  }
  for (const cam of G.room.cameras) {
    if (cam.loopedT > 0) fillPoly(ctx, cameraConePolygon(G, cam), PALETTE.coneGrey, 'rgba(160,170,190,0.6)');
    else fillPoly(ctx, cameraConePolygon(G, cam), PALETTE.cone, PALETTE.coneEdge);
  }
}

function drawCover(ctx, G) {
  for (const c of G.room.cover) {
    ctx.fillStyle = PALETTE.coverFill; ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.strokeStyle = PALETTE.coverLine; ctx.lineWidth = 1.5; ctx.strokeRect(c.x, c.y, c.w, c.h);
    ctx.strokeStyle = 'rgba(95,212,230,0.4)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x + c.w, c.y + c.h); ctx.stroke();
  }
}

function drawLoot(ctx, G) {
  for (const l of G.room.loot) {
    if (l.taken) continue;
    const pulse = 1 + 0.12 * Math.sin(G.time * 3);
    ctx.save();
    ctx.shadowColor = PALETTE.goldGlow; ctx.shadowBlur = 18 * pulse;
    ctx.fillStyle = PALETTE.gold;
    if (l.kind === 'diamond') {
      ctx.beginPath(); ctx.moveTo(l.x, l.y - 16); ctx.lineTo(l.x + 13, l.y); ctx.lineTo(l.x, l.y + 16); ctx.lineTo(l.x - 13, l.y); ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0; ctx.strokeStyle = '#fff2c0'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.fillRect(l.x - 1, l.y - 22, 2, 6); ctx.fillRect(l.x - 1, l.y + 16, 2, 6);
    } else if (l.kind === 'painting') {
      ctx.fillRect(l.x - 14, l.y - 18, 28, 36);
      ctx.shadowBlur = 0; ctx.fillStyle = '#7a4a1f'; ctx.fillRect(l.x - 10, l.y - 14, 20, 28);
      ctx.fillStyle = '#ffb02e'; ctx.beginPath(); ctx.arc(l.x, l.y + 2, 7, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath(); ctx.moveTo(l.x - 14, l.y + 10); ctx.lineTo(l.x - 9, l.y - 10); ctx.lineTo(l.x + 9, l.y - 10); ctx.lineTo(l.x + 14, l.y + 10); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = PALETTE.gold; ctx.font = F(16, true);
    const lw = ctx.measureText(l.label).width;
    const lx = Math.max(4, Math.min(l.x - 52, CANVAS_W - lw - 4));
    ctx.fillText(l.label, lx, l.y + 34);
  }
}

function drawExit(ctx, G) {
  const e = G.room.exit;
  const locked = G.room.exitLocked;
  ctx.fillStyle = locked ? 'rgba(255,77,61,0.20)' : 'rgba(95,212,230,0.25)';
  ctx.fillRect(e.x, e.y, e.w, e.h);
  ctx.strokeStyle = locked ? PALETTE.red : PALETTE.coverLine; ctx.lineWidth = 3;
  ctx.strokeRect(e.x, e.y, e.w, e.h);
  ctx.fillStyle = locked ? PALETTE.red : PALETTE.coverLine; ctx.font = F(16, true);
  ctx.fillText(locked ? 'LOCKED' : (G.room.index === 2 ? 'SKYLIGHT ↑' : 'EXIT →'), e.x - 6, e.y + e.h + 20);
}

function drawGuards(ctx, G) {
  for (const g of G.room.guards) {
    ctx.save();
    ctx.fillStyle = '#1a2a55'; ctx.strokeStyle = PALETTE.white; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(g.x, g.y, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = PALETTE.red; ctx.fillRect(g.x - 13, g.y - 8, 26, 5);
    // Facing tick.
    ctx.strokeStyle = PALETTE.white; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(g.x + Math.cos(g.facing) * 18, g.y + Math.sin(g.facing) * 18); ctx.stroke();
    // Suspicion meter + "!" above the head.
    if (g.suspicion > 2 || g.state === 'alert' || g.state === 'chase') {
      ctx.fillStyle = 'rgba(10,18,38,0.85)'; ctx.fillRect(g.x - 14, g.y - 36, 28, 8);
      ctx.fillStyle = g.suspicion > 60 ? PALETTE.red : PALETTE.amber;
      ctx.fillRect(g.x - 14, g.y - 36, 28 * (g.suspicion / 100), 8);
      ctx.strokeStyle = PALETTE.white; ctx.lineWidth = 1; ctx.strokeRect(g.x - 14, g.y - 36, 28, 8);
      ctx.fillStyle = g.state === 'chase' ? PALETTE.red : PALETTE.white;
      ctx.font = F(20, true); ctx.fillText('!', g.x - 4, g.y - 40);
    }
    ctx.restore();
  }
}

function drawCameras(ctx, G) {
  for (const cam of G.room.cameras) {
    ctx.save();
    ctx.fillStyle = '#22335f'; ctx.strokeStyle = PALETTE.white; ctx.lineWidth = 1.5;
    ctx.fillRect(cam.x - 9, cam.y - 7, 18, 14); ctx.strokeRect(cam.x - 9, cam.y - 7, 18, 14);
    if (cam.loopedT > 0) {
      ctx.fillStyle = PALETTE.dim; ctx.font = F(16, true);
      ctx.fillText('STATIC', cam.x - 24, cam.y - 14);
    } else {
      const blink = Math.sin(G.time * 6) > 0;
      ctx.fillStyle = blink ? PALETTE.red : '#7a1a12';
      ctx.beginPath(); ctx.arc(cam.x + 6, cam.y - 3, 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}

function drawThief(ctx, G) {
  const t = G.thief;
  // Her pale awareness radius — the room is night outside it.
  const grad = ctx.createRadialGradient(t.x, t.y, 8, t.x, t.y, 92);
  grad.addColorStop(0, 'rgba(255,240,200,0.14)'); grad.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(t.x, t.y, 92, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.fillStyle = '#0a1226'; ctx.strokeStyle = PALETTE.white; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = PALETTE.gold; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(t.x + t.dirX * 16, t.y + t.dirY * 16); ctx.stroke();
  if (t.carrying) {
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath(); ctx.moveTo(t.x + 14, t.y - 6); ctx.lineTo(t.x + 19, t.y); ctx.lineTo(t.x + 14, t.y + 6); ctx.lineTo(t.x + 9, t.y); ctx.closePath(); ctx.fill();
  }
  // Interact channel ring.
  if (t.channel) {
    const k = t.channel.t / t.channel.secs;
    ctx.strokeStyle = PALETTE.gold; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(t.x, t.y, 20, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

function drawToolsFx(ctx, G) {
  for (const c of G.coins) {
    const p = coinPosition(c);
    ctx.fillStyle = PALETTE.gold; ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff2c0'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  for (const s of G.clouds) {
    const a = 0.30 + 0.08 * Math.sin(G.time * 4);
    ctx.fillStyle = `rgba(200,210,230,${a})`;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(220,230,250,0.7)'; ctx.lineWidth = 2; ctx.stroke();
  }
}

function fmtTime(s) { const m = Math.floor(s / 60), ss = Math.floor(s % 60); return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`; }

function drawHUD(ctx, G) {
  ctx.fillStyle = 'rgba(10,18,38,0.88)'; ctx.fillRect(0, 0, CANVAS_W, 48);
  ctx.strokeStyle = 'rgba(232,240,255,0.4)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, 48); ctx.lineTo(CANVAS_W, 48); ctx.stroke();
  ctx.font = F(HUD_MIN_PX, true);
  ctx.fillStyle = PALETTE.white;
  ctx.fillText(G.room.name, 16, 20);
  ctx.fillText(`TIME ${fmtTime(G.time)}`, 16, 42);
  ctx.fillText(`SPOTTED ${G.spotted}×`, 260, 20);
  // Alarm bar, centre-left, with tick marks at 50/75/100.
  ctx.fillText('ALARM', 420, 20);
  const bx = 500, bw = 320, by = 10, bh = 16;
  ctx.fillStyle = '#0a1226'; ctx.fillRect(bx, by, bw, bh);
  const av = G.alarm.value;
  ctx.fillStyle = av >= 75 ? PALETTE.red : av >= 50 ? PALETTE.amber : '#4d8fd1';
  ctx.fillRect(bx, by, bw * (av / 100), bh);
  ctx.strokeStyle = PALETTE.white; ctx.lineWidth = 1.5; ctx.strokeRect(bx, by, bw, bh);
  for (const t of [50, 75, 100]) {
    const x = bx + bw * (t / 100);
    ctx.beginPath(); ctx.moveTo(x, by - 3); ctx.lineTo(x, by + bh + 3); ctx.stroke();
  }
  ctx.fillStyle = av >= 75 ? PALETTE.red : av >= 50 ? PALETTE.amber : PALETTE.dim;
  ctx.fillText(alarmState(av).toUpperCase(), 830, 20);
  ctx.fillStyle = PALETTE.gold;
  ctx.fillText(`◆ ${lootCount(G)}/${totalLoot(G)}`, 1000, 20);
  const sel = G.tools.selected;
  // Tools line on the second row, starting clear of the exit message: it must fit
  // inside 1280 px (the contact sheet shrinks the whole HUD, so nothing may overflow).
  const toolParts = [`1 COIN ×${G.tools.coin}`, `2 SMOKE ×${G.tools.smoke}`, `3 LOOP ×${G.tools.loop}`];
  let tx = 830;
  toolParts.forEach((part, i) => {
    ctx.fillStyle = sel === i + 1 ? PALETTE.gold : PALETTE.white;
    ctx.fillText(part, tx, 42);
    tx += ctx.measureText(part + '   ').width;
  });
  if (G.room.exitLocked) {
    const need = G.room.exitNeed === 'ingot' ? 'TAKE THE INGOT — SKYLIGHT LOCKED' : 'TAKE THE DIAMOND — EXIT LOCKED';
    ctx.fillStyle = PALETTE.red; ctx.fillText(need, 420, 42);
  }
  // Lockdown banner: the alarm's clock, readable in a screenshot.
  if (G.alarm.state === 'warning' || G.alarm.state === 'lockdown') {
    const label = G.alarm.state === 'warning'
      ? `LOCKDOWN WARNING — ${Math.ceil(G.alarm.lockdownT)}s`
      : `LOCKDOWN — ${Math.ceil(G.alarm.lockdownT)}s TO THE EXIT`;
    ctx.font = F(20, true);
    const w = ctx.measureText(label).width + 32;
    ctx.fillStyle = 'rgba(255,77,61,0.92)'; ctx.fillRect((CANVAS_W - w) / 2, CANVAS_H - 44, w, 32);
    ctx.fillStyle = '#fff'; ctx.fillText(label, (CANVAS_W - w) / 2 + 16, CANVAS_H - 22);
  }
}

function dim(ctx) { ctx.fillStyle = 'rgba(8,14,32,0.72)'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H); }
function card(ctx, x, y, w, h) {
  ctx.fillStyle = '#101d42'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = PALETTE.white; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
}
function button(ctx, id, x, y, w, h, label) {
  ctx.fillStyle = PALETTE.gold; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#0a1226'; ctx.font = F(20, true);
  const tw = ctx.measureText(label).width;
  ctx.fillText(label, x + (w - tw) / 2, y + h / 2 + 7);
  return { id, x, y, w, h };
}

function drawTitle(ctx, G) {
  dim(ctx);
  ctx.fillStyle = PALETTE.gold; ctx.font = F(64, true);
  ctx.fillText('BLUEPRINT', 340, 180);
  ctx.fillStyle = PALETTE.white; ctx.font = F(32, true);
  ctx.fillText('THE HALCYON HEIST', 420, 230);
  ctx.font = F(18, true); ctx.fillStyle = PALETTE.dim;
  ctx.fillText('Wren steals the Lumen Diamond — one night, three rooms, one blueprint.', 300, 280);
  ctx.fillStyle = PALETTE.white; ctx.font = F(18, true);
  ctx.fillText('WASD move · Shift sneak · Click throw · 1/2/3 tools · Space interact', 330, 340);
  ctx.fillText('Read the cones before you move. The alarm is the clock.', 380, 372);
  G.ui.buttons = [button(ctx, 'start', 490, 420, 300, 56, 'START THE HEIST')];
}

function drawRoomClear(ctx, G) {
  dim(ctx);
  card(ctx, 390, 200, 500, 260);
  ctx.fillStyle = PALETTE.gold; ctx.font = F(36, true); ctx.fillText('ROOM CLEAR', 480, 260);
  ctx.fillStyle = PALETTE.white; ctx.font = F(18, true);
  ctx.fillText(`TIME ${fmtTime(G.roomTime)}`, 440, 310);
  ctx.fillText(`PEAK ALARM ${Math.round(G.alarm.peak)}`, 440, 340);
  ctx.fillText(`SPOTTED ${G.spotted}×`, 440, 370);
  ctx.fillText(`LOOT ◆ ${lootCount(G)}/${totalLoot(G)}`, 440, 400);
  G.ui.buttons = [button(ctx, 'next', 490, 410, 300, 56, 'NEXT ROOM →')];
}

function drawCaught(ctx, G) {
  dim(ctx);
  card(ctx, 390, 200, 500, 260);
  ctx.fillStyle = PALETTE.red; ctx.font = F(36, true); ctx.fillText('CAUGHT', 520, 260);
  ctx.fillStyle = PALETTE.white; ctx.font = F(18, true);
  ctx.fillText(G.caughtCause || 'The museum wins this round.', 420, 320);
  ctx.fillText('The blueprint does not lie — read the cones next time.', 420, 352);
  G.ui.buttons = [button(ctx, 'retry', 490, 410, 300, 56, 'RETRY  (R)')];
}

function drawGetaway(ctx, G) {
  dim(ctx);
  card(ctx, 340, 140, 600, 420);
  ctx.fillStyle = PALETTE.gold; ctx.font = F(40, true); ctx.fillText('GETAWAY', 520, 200);
  ctx.fillStyle = PALETTE.white; ctx.font = F(18, true);
  const t = G.tally;
  ctx.fillText(`LOOT ${t.loot}/3`, 420, 260);
  ctx.fillText(`TIME ${fmtTime(t.time)}`, 420, 292);
  ctx.fillText(`PEAK ALARM ${t.peakAlarm}`, 420, 324);
  ctx.fillText(`SPOTTED ${t.spotted}×`, 420, 356);
  ctx.fillText(`TOOLS LEFT ${t.toolsLeft}`, 420, 388);
  ctx.fillStyle = PALETTE.gold; ctx.font = F(24, true);
  ctx.fillText(t.rank, 420, 440);
  G.ui.buttons = [button(ctx, 'again', 490, 480, 300, 56, 'PLAY AGAIN  (R)')];
}

function drawPaused(ctx, G) {
  dim(ctx);
  ctx.fillStyle = PALETTE.white; ctx.font = F(36, true); ctx.fillText('PAUSED', 560, 340);
  ctx.font = F(18, true); ctx.fillText('P / Esc to resume · M to mute', 500, 380);
  G.ui.buttons = [];
}
