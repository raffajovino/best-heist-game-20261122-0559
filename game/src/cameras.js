// cameras.js — wall cameras: fixed stares and sweeping arcs. A camera never chases;
// it is the alarm's engine. A looped camera shows STATIC for 20 s — but a guard who
// patrols past it notices and walks over to check.
import { CAMERA, ALARM } from './config.js';
import { inCone, lineBlocked, conePolygon } from './guards.js';

export function cameraSeesThief(G, cam) {
  if (cam.loopedT > 0 || G.thiefHidden) return false;
  return inCone(cam.x, cam.y, cam.angle, G.thief.x, G.thief.y, G.coneRange || CAMERA.range) &&
    !lineBlocked(G, cam.x, cam.y, G.thief.x, G.thief.y);
}

export function cameraConePolygon(G, cam) {
  return conePolygon(G, cam.x, cam.y, cam.angle, G.coneRange || CAMERA.range);
}

export function updateCameras(G, dt) {
  for (const cam of G.room.cameras) {
    if (cam.loopedT > 0) { cam.loopedT -= dt; continue; }
    if (cam.sweep > 0) {
      cam.phase += CAMERA.sweepSpeed * dt;
      cam.angle = cam.baseAngle + Math.sin(cam.phase) * cam.sweep;
    }
    const sees = cameraSeesThief(G, cam);
    if (sees) {
      G.anySeen = true;
      if (!cam.beeped) { cam.beeped = true; G.events.push({ type: 'cameraBeep' }); }
      G.alarm.value = Math.min(100, G.alarm.value + ALARM.cameraPerSec * dt);
      G.cameraSeen = true;
    } else {
      cam.beeped = false;
      // Smoke on the lens: the camera reports "something is wrong" instead of going quiet.
      let smoked = false;
      for (const s of G.clouds) if (Math.hypot(cam.x - s.x, cam.y - s.y) < s.r + 60) { smoked = true; break; }
      if (smoked) G.alarm.value = Math.min(100, G.alarm.value + ALARM.smokeCameraPerSec * dt);
    }
    // A guard who patrols past a looped camera walks over to check it.
    if (cam.loopedT > 0) {
      for (const g of G.room.guards) {
        if (g.state === 'patrol' && Math.hypot(g.x - cam.x, g.y - cam.y) < 120) {
          g.state = 'investigate'; g.target = { x: cam.x, y: cam.y }; g.investigateT = 3;
        }
      }
    }
  }
}
