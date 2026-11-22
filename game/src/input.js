// input.js — keyboard (WASD/arrows, Shift sneak, Space/E interact, 1/2/3 tools, P/Esc
// pause, R restart, M mute) and mouse (click-to-throw at the cursor). One click queue:
// the game consumes clicks once per frame, so a click never fires twice.
export function createInput(canvas) {
  const keys = { up: false, down: false, left: false, right: false, sneak: false, interact: false };
  const input = { keys, mouse: { x: 0, y: 0 }, clicks: [], pressed: {} };
  const down = (e) => {
    const k = e.key.toLowerCase();
    if (k === 'w' || k === 'arrowup') keys.up = true;
    if (k === 's' || k === 'arrowdown') keys.down = true;
    if (k === 'a' || k === 'arrowleft') keys.left = true;
    if (k === 'd' || k === 'arrowright') keys.right = true;
    if (k === 'shift') keys.sneak = true;
    if (k === ' ' || k === 'e') keys.interact = true;
    if (k === '1' || k === '2' || k === '3') input.pressed['tool' + k] = true;
    if (k === 'p' || k === 'escape') input.pressed.pause = true;
    if (k === 'r') input.pressed.restart = true;
    if (k === 'm') input.pressed.mute = true;
    if (k === 'enter') input.pressed.enter = true;
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
  };
  const up = (e) => {
    const k = e.key.toLowerCase();
    if (k === 'w' || k === 'arrowup') keys.up = false;
    if (k === 's' || k === 'arrowdown') keys.down = false;
    if (k === 'a' || k === 'arrowleft') keys.left = false;
    if (k === 'd' || k === 'arrowright') keys.right = false;
    if (k === 'shift') keys.sneak = false;
    if (k === ' ' || k === 'e') keys.interact = false;
  };
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    input.mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
    input.mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
  });
  canvas.addEventListener('mousedown', (e) => {
    const r = canvas.getBoundingClientRect();
    input.clicks.push({
      x: (e.clientX - r.left) * (canvas.width / r.width),
      y: (e.clientY - r.top) * (canvas.height / r.height),
    });
  });
  return input;
}
export function consumePressed(input) { const p = input.pressed; input.pressed = {}; return p; }
export function consumeClicks(input) { const c = input.clicks; input.clicks = []; return c; }
