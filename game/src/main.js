// main.js — the game loop and state machine: title → play → roomClear → caught →
// getaway. Fixed timestep (1/60) with an accumulator; the room flow is the payoff:
// take the loot, reach the exit, and the next room of the museum opens.
import { CANVAS_W, CANVAS_H, TOOLS } from './config.js';
import { buildRoom } from './levels.js';
import { createThief, moveThief, interactThief, thiefHidden } from './thief.js';
import { updateGuards } from './guards.js';
import { updateCameras } from './cameras.js';
import { updateAlarm, raiseAlarm, alarmState } from './alarm.js';
import { throwCoin, throwSmoke, loopCameraAt, updateTools } from './tools.js';
import { createInput, consumePressed, consumeClicks } from './input.js';
import { ensureAudio, toggleMute, sfx, updateMusic } from './audio.js';
import { renderGame } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
canvas.width = CANVAS_W; canvas.height = CANVAS_H;

function newGame() {
  const G = {
    canvas, ctx: canvas.getContext('2d'),
    state: 'title', time: 0, roomTime: 0, totalTime: 0,
    roomIndex: 0, room: null, thief: null,
    alarm: { value: 0, peak: 0, state: 'calm', lockdownT: 0 },
    tools: { coin: TOOLS.coin, smoke: TOOLS.smoke, loop: TOOLS.loop, selected: 1 },
    coins: [], clouds: [], events: [],
    spotted: 0, peakAlarm: 0, totalLootTaken: 0,
    anySeen: false, cameraSeen: false, thiefHidden: false, coneRange: 230,
    caughtCause: '', tally: null, ui: { buttons: [] },
    input: createInput(canvas), frozen: false, stepT: 0,
  };
  loadRoom(G, 0);
  return G;
}

function loadRoom(G, i) {
  G.roomIndex = i;
  G.room = buildRoom(i);
  if (G.room.door) G.room.doorWall = G.room.walls.find(w => w.x === G.room.door.x && w.y === G.room.door.y);
  G.thief = createThief(G.room.entry.x, G.room.entry.y);
  G.alarm = { value: G.room.floor, peak: G.room.floor, state: alarmState(G.room.floor), lockdownT: 0 };
  G.tools = { coin: TOOLS.coin, smoke: TOOLS.smoke, loop: TOOLS.loop, selected: 1 };
  G.coins = []; G.clouds = []; G.roomTime = 0; G.events = [];
  G.coneRange = 230;
}

function getawayRank(G) {
  if (G.spotted === 0 && G.peakAlarm < 50) return 'GHOST — NEVER SEEN';
  if (G.spotted <= 2 && G.peakAlarm < 75) return 'CLEAN GETAWAY';
  return 'LOUD — BUT FREE';
}

function clickButton(G, c) {
  for (const b of G.ui.buttons) {
    if (c.x >= b.x && c.x <= b.x + b.w && c.y >= b.y && c.y <= b.y + b.h) return b.id;
  }
  return null;
}

function update(G, dt) {
  const pressed = consumePressed(G.input);
  if (pressed.mute) toggleMute();
  if (pressed.pause && (G.state === 'play' || G.state === 'paused')) {
    G.state = G.state === 'play' ? 'paused' : 'play';
    return;
  }
  const clicks = consumeClicks(G.input);
  if (clicks.length) ensureAudio();
  if (G.state !== 'play') {
    if (G.state === 'paused') return;
    for (const c of clicks) {
      const id = clickButton(G, c);
      if (id === 'start') { ensureAudio(); G.state = 'play'; }
      else if (id === 'next') { loadRoom(G, G.roomIndex + 1); G.state = 'play'; }
      else if (id === 'retry') { loadRoom(G, G.roomIndex); G.state = 'play'; }
      else if (id === 'again') {
        G.totalLootTaken = 0; G.spotted = 0; G.peakAlarm = 0; G.totalTime = 0;
        loadRoom(G, 0); G.state = 'play';
      }
    }
    if (pressed.enter || pressed.restart) {
      if (G.state === 'title') { ensureAudio(); G.state = 'play'; }
      else if (G.state === 'roomClear') { loadRoom(G, G.roomIndex + 1); G.state = 'play'; }
      else if (G.state === 'caught') { loadRoom(G, G.roomIndex); G.state = 'play'; }
      else if (G.state === 'getaway') {
        G.totalLootTaken = 0; G.spotted = 0; G.peakAlarm = 0; G.totalTime = 0;
        loadRoom(G, 0); G.state = 'play';
      }
    }
    return;
  }
  if (pressed.restart) { loadRoom(G, G.roomIndex); return; }

  G.time += dt; G.roomTime += dt; G.totalTime += dt;
  G.thiefHidden = thiefHidden(G);
  G.coneRange = 230 + (G.alarm.value >= 50 ? 10 : 0);
  if (pressed.tool1) G.tools.selected = 1;
  if (pressed.tool2) G.tools.selected = 2;
  if (pressed.tool3) G.tools.selected = 3;
  for (const c of clicks) {
    if (G.tools.selected === 1) throwCoin(G, c.x, c.y);
    else if (G.tools.selected === 2) throwSmoke(G, c.x, c.y);
    else if (G.tools.selected === 3) loopCameraAt(G, c.x, c.y);
  }
  moveThief(G, dt, G.input.keys);
  if (G.input.keys.interact) interactThief(G, dt);
  else G.thief.channel = null;
  updateTools(G, dt);
  G.anySeen = false; G.cameraSeen = false;
  updateGuards(G, dt);
  updateCameras(G, dt);
  for (const ev of G.events) {
    if (ev.type === 'crack') { sfx.glassCrack(); raiseAlarm(G, ALARM_CRACK); G.totalLootTaken++; }
    else if (ev.type === 'grabbed') { sfx.doorUnlock(); G.totalLootTaken++; }
    else if (ev.type === 'picked') { sfx.pick(); }
    else if (ev.type === 'spotted') { sfx.spottedSting(); }
    else if (ev.type === 'cameraBeep') { sfx.cameraBeep(); }
    else if (ev.type === 'coinLanded') { sfx.coinClink(); }
    else if (ev.type === 'plate') { raiseAlarm(G, ALARM_PLATE); sfx.klaxon(); }
    else if (ev.type === 'warning' || ev.type === 'lockdown') { sfx.klaxon(); }
    else if (ev.type === 'caught') {
      G.caughtCause = ev.guard === 'LOCKDOWN'
        ? 'Lockdown sealed the doors before you reached the exit.'
        : `Guard ${ev.guard} caught you in the open.`;
      G.state = 'caught';
    }
  }
  G.events = [];
  updateAlarm(G, dt);
  updateMusic(G, dt);
  if (G.thief.moving) {
    G.stepT += dt;
    const interval = G.thief.sneak ? 0.5 : 0.34;
    if (G.stepT > interval) { G.stepT = 0; sfx.footstep(G.thief.sneak); }
  }
  const e = G.room.exit, t = G.thief;
  if (!G.room.exitLocked && t.x >= e.x - 6 && t.x <= e.x + e.w + 6 && t.y >= e.y - 6 && t.y <= e.y + e.h + 6) {
    if (G.roomIndex >= 2) {
      G.tally = {
        loot: G.totalLootTaken, time: G.totalTime, peakAlarm: Math.round(G.peakAlarm),
        spotted: G.spotted, toolsLeft: G.tools.coin + G.tools.smoke + G.tools.loop,
        rank: getawayRank(G),
      };
      G.state = 'getaway'; sfx.fanfare();
    } else {
      G.state = 'roomClear'; sfx.doorUnlock();
    }
  }
}

const ALARM_CRACK = 8;
const ALARM_PLATE = 20;

const G = newGame();
window.__game = G;
window.__step = (gg, dt) => update(gg, dt);
window.__loadRoom = (gg, i) => loadRoom(gg, i);

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) stageShot(G, shot);

let last = 0, acc = 0;
function frame(ts) {
  requestAnimationFrame(frame);
  const now = ts / 1000;
  const dt = Math.min(0.1, now - (last || now));
  last = now;
  if (!G.frozen) {
    acc += dt;
    const step = 1 / 60;
    let n = 0;
    while (acc >= step && n < 5) { update(G, step); acc -= step; n++; }
  }
  renderGame(G);
}
requestAnimationFrame(frame);
