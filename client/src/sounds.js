// Tiny synthesized game sound effects using Web Audio API
// No external files needed — all sounds are generated procedurally

let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Resume if suspended (browsers require user gesture)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(freq, duration, type = 'sine', volume = 0.15, decay = true) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    if (decay) {
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    }
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Audio not available — silently ignore
  }
}

function playNoise(duration, volume = 0.06) {
  try {
    const ctx = getCtx();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2000;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  } catch (e) {}
}

// ---- Sound Effects ----

// Coin/chip pickup — bright metallic clink
export function playChipTake() {
  playTone(1200, 0.08, 'sine', 0.12);
  setTimeout(() => playTone(1800, 0.06, 'sine', 0.08), 40);
  setTimeout(() => playTone(2400, 0.1, 'sine', 0.06), 70);
}

// Card purchase — satisfying deep thud + shimmer
export function playCardPurchase() {
  playTone(220, 0.15, 'sine', 0.18);
  setTimeout(() => playTone(440, 0.12, 'triangle', 0.1), 60);
  setTimeout(() => playTone(660, 0.2, 'sine', 0.06), 120);
  setTimeout(() => playTone(880, 0.15, 'sine', 0.04), 180);
}

// Card reserve — quick swoosh
export function playCardReserve() {
  playNoise(0.12, 0.08);
  playTone(400, 0.1, 'sawtooth', 0.04);
  setTimeout(() => playTone(600, 0.08, 'sine', 0.06), 50);
}

// Your turn notification — gentle two-tone bell
export function playYourTurn() {
  playTone(523, 0.2, 'sine', 0.1);  // C5
  setTimeout(() => playTone(659, 0.3, 'sine', 0.1), 150);  // E5
}

// Bonus tile claimed — ascending sparkle
export function playBonusTile() {
  const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.2, 'sine', 0.08), i * 80);
  });
}

// Victory fanfare — triumphant ascending chord
export function playVictory() {
  // First chord
  playTone(262, 0.4, 'sine', 0.1);   // C4
  playTone(330, 0.4, 'sine', 0.08);  // E4
  playTone(392, 0.4, 'sine', 0.08);  // G4
  // Rising arpeggio
  setTimeout(() => {
    playTone(392, 0.3, 'sine', 0.1);  // G4
    playTone(494, 0.3, 'sine', 0.08); // B4
  }, 350);
  setTimeout(() => {
    playTone(523, 0.5, 'sine', 0.12); // C5
    playTone(659, 0.5, 'sine', 0.08); // E5
    playTone(784, 0.5, 'sine', 0.06); // G5
  }, 650);
}

// Game over (you lost) — descending minor
export function playDefeat() {
  playTone(392, 0.3, 'sine', 0.08);  // G4
  setTimeout(() => playTone(349, 0.3, 'sine', 0.08), 250);  // F4
  setTimeout(() => playTone(330, 0.4, 'sine', 0.1), 500);   // E4
  setTimeout(() => playTone(262, 0.5, 'sine', 0.1), 750);   // C4
}

// Pass turn — low thump
export function playPass() {
  playTone(180, 0.12, 'sine', 0.1);
  playNoise(0.06, 0.04);
}

// Error buzz — quick dissonant
export function playError() {
  playTone(200, 0.1, 'square', 0.06);
  setTimeout(() => playTone(190, 0.1, 'square', 0.06), 80);
}

// Opponent action — subtle tick
export function playOpponentAction() {
  playTone(800, 0.04, 'sine', 0.05);
}

// Timer warning — ticking pulse
export function playTimerWarning() {
  playTone(1000, 0.03, 'sine', 0.08);
}
