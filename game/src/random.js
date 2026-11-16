// One generator drives simulation only; rendering never consumes its state.
export function mulberry32(seed) {
  let value = seed >>> 0;
  return function random() {
    value += 0x6D2B79F5;
    let t = Math.imul(value ^ (value >>> 15), value | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const range = (random, min, max) => min + random() * (max - min);
export const int = (random, min, max) => Math.floor(range(random, min, max + 1));
export const pick = (random, items) => items[int(random, 0, items.length - 1)];

export function readSeed(params) {
  const raw = params.get('seed');
  if (raw !== null && Number.isFinite(Number(raw))) return Number(raw) >>> 0;
  if (globalThis.crypto?.getRandomValues) {
    return crypto.getRandomValues(new Uint32Array(1))[0];
  }
  return Date.now() >>> 0;
}
