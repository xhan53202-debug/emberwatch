export function createAudio() {
  let context = null;
  let muted = false;

  function start() {
    try {
      const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Audio) return;
      if (!context) context = new Audio();
      if (context.state === 'suspended') context.resume().catch(() => {});
    } catch {
      context = null;
    }
  }

  function tone(frequency, duration, volume, type = 'sine', delay = 0, end = frequency) {
    if (muted || !context || context.state !== 'running') return;
    try {
      const time = context.currentTime + delay;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, time);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, end), time + duration);
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(volume, time + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(time);
      oscillator.stop(time + duration + 0.03);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    } catch {
      // Audio failure never interrupts the simulation.
    }
  }

  return {
    start,
    get muted() { return muted; },
    toggle() { muted = !muted; return muted; },
    shard() {
      tone(880, 0.28, 0.045);
      tone(1320, 0.36, 0.025, 'sine', 0.07);
    },
    hit() {
      tone(110, 0.22, 0.13, 'triangle', 0, 32);
      tone(55, 0.25, 0.1);
    },
    brazier() {
      [220, 277.18, 329.63, 440].forEach((f, i) => tone(f, 0.8, 0.035, 'sine', i * 0.035));
    },
    clear() {
      [392, 493.88, 587.33, 783.99].forEach((f, i) => tone(f, 0.55, 0.055, 'triangle', i * 0.13));
      tone(196, 1.1, 0.05);
    },
    over() {
      [220, 174.61, 130.81].forEach((f, i) => tone(f, 0.8, 0.05, 'sine', i * 0.2));
    }
  };
}
