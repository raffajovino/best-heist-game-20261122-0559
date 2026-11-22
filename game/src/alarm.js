// alarm.js — the room's clock. 0–100 with tick marks at 50/75/100: HEIGHTENED at 50
// (guards faster, cones longer), LOCKDOWN WARNING at 75 (exit starts closing on a 10 s
// timer), LOCKDOWN at 100 (doors seal, 5 s to be in the doorway or the night is over).
import { ALARM } from './config.js';

export function raiseAlarm(G, amount) {
  G.alarm.value = Math.min(100, G.alarm.value + amount);
}

export function alarmState(value) {
  if (value >= 100) return 'lockdown';
  if (value >= 75) return 'warning';
  if (value >= 50) return 'heightened';
  return 'calm';
}

export function updateAlarm(G, dt) {
  const a = G.alarm;
  a.peak = Math.max(a.peak, a.value);
  G.peakAlarm = Math.max(G.peakAlarm, a.value);
  // Cool down while nobody sees the thief and she is out of the open.
  const hidden = !G.anySeen;
  if (hidden && a.value > G.room.floor) a.value = Math.max(G.room.floor, a.value - ALARM.decayPerSec * dt);
  const state = alarmState(a.value);
  if (state !== a.state) {
    a.state = state;
    if (state === 'warning') { a.lockdownT = 10; G.events.push({ type: 'warning' }); }
    if (state === 'lockdown') { a.lockdownT = 5; G.events.push({ type: 'lockdown' }); }
  }
  if (a.state === 'warning' || a.state === 'lockdown') {
    a.lockdownT -= dt;
    if (a.lockdownT <= 0 && a.state === 'lockdown') {
      const t = G.thief, e = G.room.exit;
      const inDoor = t.x >= e.x - 10 && t.x <= e.x + e.w + 10 && t.y >= e.y - 10 && t.y <= e.y + e.h + 10;
      if (!inDoor) G.events.push({ type: 'caught', guard: 'LOCKDOWN' });
    }
  }
}
