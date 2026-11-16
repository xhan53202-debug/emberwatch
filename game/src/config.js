export const WORLD = Object.freeze({ width: 960, height: 540 });
export const STEP = 1 / 60;
export const OIL_MAX = 100;
export const HEARTS = 3;
export const RELIGHT_COST = 8;
export const RELIGHT_RANGE = 86;
export const SHARD_OIL = 4;
export const PLAYER_SPEED = 148;
export const PLAYER_RADIUS = 12;
export const SHADOW_RADIUS = 15;
export const INVULNERABILITY = 1.2;
export const LIGHT_RADIUS = 105;
export const BEAM_LENGTH = 250;
export const BEAM_HALF_ANGLE = 0.42;
export const COLORS = Object.freeze({
  void: '#0a0e1a',
  floor: '#111827',
  amber: '#ffc674',
  gold: '#e8a34f',
  cream: '#f4e5c9',
  muted: '#8e96a9',
  red: '#e66e73',
  teal: '#82b5b2'
});

export function nightSettings(night) {
  return {
    braziers: Math.min(5, night + 2),
    startingOil: Math.max(62, 100 - (night - 1) * 7),
    drain: 0.8 + (night - 1) * 0.16,
    shadowSpeed: Math.min(91, 33 + (night - 1) * 7),
    spawnInterval: Math.max(1.15, 4.6 - (night - 1) * 0.45),
    darkness: Math.min(0.94, 0.79 + (night - 1) * 0.025)
  };
}

export const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
