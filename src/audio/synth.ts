let audioCtx: AudioContext | null = null;

function getContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.15,
  detune: number = 0
): void {
  try {
    const ctx = getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.value = frequency;
    osc.detune.value = detune;

    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Audio not available
  }
}

export function playLaunch(): void {
  playTone(220, 0.3, 'sine', 0.12);
  playTone(330, 0.2, 'triangle', 0.08);
}

export function playPlace(): void {
  playTone(600, 0.1, 'sine', 0.08);
}

export function playToggle(): void {
  playTone(400, 0.1, 'square', 0.05);
  setTimeout(() => playTone(500, 0.1, 'square', 0.05), 50);
}

export function playVictory(): void {
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.4, 'sine', 0.1), i * 120);
  });
}

export function playFail(): void {
  playTone(200, 0.4, 'sawtooth', 0.08);
  setTimeout(() => playTone(150, 0.5, 'sawtooth', 0.06), 150);
}

export function playClick(): void {
  playTone(800, 0.06, 'sine', 0.06);
}

export function playStar(): void {
  playTone(880, 0.2, 'sine', 0.1);
  setTimeout(() => playTone(1100, 0.15, 'sine', 0.08), 100);
}

export function playRemove(): void {
  playTone(300, 0.1, 'triangle', 0.06);
}
