// audio.js — all sound is synthesised in code (WebAudio, zero audio files, zero network).
// The music's tempo IS the tension: the bassline quickens as the alarm rises.
let ctx = null, master = null, muted = false, beatT = 0, beatN = 0;

export function isMuted() { return muted; }
export function toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.5; return muted; }

export function ensureAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ctx.destination);
  } catch (e) { ctx = null; }
}

function tone(freq, dur, type, vol, slideTo) {
  if (!ctx || muted) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(freq, ctx.currentTime);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
  g.gain.setValueAtTime(vol || 0.15, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  o.connect(g); g.connect(master); o.start(); o.stop(ctx.currentTime + dur);
}
function noiseBurst(dur, vol, freq) {
  if (!ctx || muted) return;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq || 1200;
  const g = ctx.createGain(); g.gain.value = vol || 0.2;
  src.connect(f); f.connect(g); g.connect(master); src.start();
}

export const sfx = {
  coinClink() { tone(1567, 0.12, 'triangle', 0.2); setTimeout(() => tone(2093, 0.18, 'triangle', 0.16), 60); },
  glassCrack() { noiseBurst(0.3, 0.3, 2400); tone(420, 0.4, 'sawtooth', 0.08, 90); },
  cameraBeep() { tone(880, 0.09, 'sine', 0.12); },
  spottedSting() { tone(233, 0.5, 'square', 0.14); tone(247, 0.5, 'square', 0.14); },
  klaxon() { tone(520, 0.35, 'square', 0.1, 392); },
  doorUnlock() { [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.25, 'triangle', 0.16), i * 90)); },
  fanfare() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.4, 'triangle', 0.18), i * 120)); },
  footstep(sneak) { if (!sneak) noiseBurst(0.05, 0.05, 500); },
  pick() { tone(1200, 0.06, 'square', 0.07); },
};

// A low pulsing bassline; the alarm sets the tempo (70 / 110 / 140 BPM).
export function updateMusic(G, dt) {
  if (!ctx || muted) return;
  const bpm = G.alarm.state === 'lockdown' || G.alarm.state === 'warning' ? 140 : G.alarm.state === 'heightened' ? 110 : 70;
  beatT += dt;
  const step = 60 / bpm / 2;
  if (beatT >= step) {
    beatT -= step; beatN++;
    const bass = [55, 55, 65.4, 49][Math.floor(beatN / 8) % 4];
    if (beatN % 2 === 0) tone(bass, 0.22, 'triangle', 0.12);
    if (beatN % 4 === 2) tone(1200, 0.03, 'square', 0.03);
  }
}
