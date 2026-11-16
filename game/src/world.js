import {
  WORLD, OIL_MAX, HEARTS, RELIGHT_COST, RELIGHT_RANGE, SHARD_OIL,
  PLAYER_SPEED, PLAYER_RADIUS, SHADOW_RADIUS, INVULNERABILITY,
  LIGHT_RADIUS, BEAM_LENGTH, BEAM_HALF_ANGLE, nightSettings, clamp, distance
} from './config.js';
import { range, int } from './random.js';
import { ACTION_RELIGHT } from './input.js';

export const EVENT_HIT = 1;
export const EVENT_OVER = 2;
export const EVENT_NIGHT_CLEAR = 4;
export const EVENT_SHARD = 8;
export const EVENT_BRAZIER = 16;

export function inLantern(state, point) {
  const player = state.player;
  const d = distance(player, point);
  if (d < LIGHT_RADIUS * 0.82) return true;
  const angle = Math.atan2(point.y - player.y, point.x - player.x);
  const difference = Math.atan2(Math.sin(angle - player.angle), Math.cos(angle - player.angle));
  return d < BEAM_LENGTH && Math.abs(difference) < BEAM_HALF_ANGLE;
}

export function createWorld(random) {
  const state = {
    player: { x: 480, y: 300, angle: -0.5, invulnerable: 0 },
    hearts: HEARTS, oil: OIL_MAX, score: 0, collected: 0,
    braziers: [], shards: [], shadows: [], particles: [], texts: [],
    night: 1, phase: 'play', time: 0, clearTime: 0,
    spawnTime: 3, shardTime: 3, shake: 0, flash: 0,
    settings: nightSettings(1)
  };

  function burst(x, y, count, color, force = 45) {
    for (let i = 0; i < count; i++) {
      const angle = range(random, 0, Math.PI * 2);
      const speed = range(random, force * 0.3, force);
      const life = range(random, 0.4, 1.1);
      state.particles.push({
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 12,
        life, maxLife: life, size: range(random, 1, 3), color
      });
    }
  }

  function floating(x, y, text, color = '#ffc674') {
    state.texts.push({ x, y, text, color, life: 1.3 });
  }

  function spawnShard() {
    state.shards.push({
      x: range(random, 75, 885), y: range(random, 125, 455),
      phase: range(random, 0, Math.PI * 2)
    });
  }

  function spawnShadow() {
    const edge = int(random, 0, 3);
    const x = edge === 0 ? 20 : edge === 1 ? 940 : range(random, 35, 925);
    const y = edge === 2 ? 92 : edge === 3 ? 516 : range(random, 110, 510);
    state.shadows.push({
      x, y, phase: range(random, 0, 7),
      speed: range(random, 0.85, 1.12)
    });
  }

  function reset(night = 1) {
    if (night === 1) {
      state.score = 0;
      state.collected = 0;
      state.hearts = HEARTS;
      state.time = 0;
    }
    state.night = night;
    state.settings = nightSettings(night);
    state.oil = state.settings.startingOil;
    Object.assign(state.player, { x: 480, y: 305, angle: -Math.PI / 2, invulnerable: 0 });
    state.phase = 'play';
    state.clearTime = 0;
    state.spawnTime = 2.4;
    state.shardTime = 3;
    state.shake = 0;
    state.flash = 0;
    state.shadows = [];
    state.shards = [];
    state.particles = [];
    state.texts = [];
    const positions = [
      { x: 210, y: 205 }, { x: 750, y: 205 }, { x: 480, y: 425 },
      { x: 190, y: 425 }, { x: 770, y: 425 }
    ];
    state.braziers = positions.slice(0, state.settings.braziers)
      .map(position => ({ ...position, lit: false }));
    for (let i = 0; i < 13; i++) spawnShard();
  }

  function step(dt, input, mouse) {
    let events = 0;
    state.time += dt;
    state.shake = Math.max(0, state.shake - dt * 22);
    state.flash = Math.max(0, state.flash - dt * 2.5);
    state.player.invulnerable = Math.max(0, state.player.invulnerable - dt);
    for (const p of state.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy -= 8 * dt;
    }
    state.particles = state.particles.filter(p => p.life > 0);
    for (const text of state.texts) { text.life -= dt; text.y -= dt * 23; }
    state.texts = state.texts.filter(text => text.life > 0);
    if (state.phase === 'clear') {
      state.clearTime -= dt;
      if (state.clearTime <= 0) reset(state.night + 1);
      return events;
    }
    if (state.phase !== 'play') return events;

    const player = state.player;
    let { x: dx, y: dy } = input.direction;
    // Holding the pointer walks toward it, making the whole game mouse-playable.
    if (!dx && !dy && mouse.down) {
      const d = distance(player, mouse);
      if (d > 12) {
        dx = (mouse.x - player.x) / d;
        dy = (mouse.y - player.y) / d;
        const speed = Math.min(1, (d - 12) / (PLAYER_SPEED * dt));
        dx *= speed;
        dy *= speed;
      }
    }
    if (mouse.active) player.angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    else if (dx || dy) player.angle = Math.atan2(dy, dx);
    player.x = clamp(player.x + dx * PLAYER_SPEED * dt, 40, 920);
    player.y = clamp(player.y + dy * PLAYER_SPEED * dt, 110, 498);
    state.oil = Math.max(0, state.oil - state.settings.drain * dt);

    for (let i = state.shards.length - 1; i >= 0; i--) {
      const shard = state.shards[i];
      if (distance(player, shard) < PLAYER_RADIUS + 10) {
        state.shards.splice(i, 1);
        state.oil = Math.min(OIL_MAX, state.oil + SHARD_OIL);
        state.score += 10;
        state.collected++;
        burst(shard.x, shard.y, 12, '#ffcb78');
        floating(shard.x, shard.y - 12, '+10');
        events |= EVENT_SHARD;
      }
    }
    if (input.actions & ACTION_RELIGHT) {
      const nearest = state.braziers.filter(b => !b.lit)
        .sort((a, b) => distance(a, player) - distance(b, player))[0];
      if (nearest && distance(nearest, player) <= RELIGHT_RANGE) {
        if (state.oil >= RELIGHT_COST) {
          nearest.lit = true;
          state.oil -= RELIGHT_COST;
          burst(nearest.x, nearest.y - 16, 35, '#ffb758', 90);
          floating(nearest.x, nearest.y - 40, 'KINDLED');
          events |= EVENT_BRAZIER;
        } else floating(player.x, player.y - 34, 'NEED 8 OIL', '#e66e73');
      }
    }

    state.spawnTime -= dt;
    if (state.spawnTime <= 0) {
      if (state.shadows.length < 28) spawnShadow();
      state.spawnTime = state.settings.spawnInterval;
    }
    state.shardTime -= dt;
    if (state.shardTime <= 0) {
      if (state.shards.length < 19) spawnShard();
      state.shardTime = 2.8;
    }

    for (const shadow of state.shadows) {
      shadow.phase += dt * 2;
      const d = Math.max(1, distance(shadow, player));
      const lit = inLantern(state, shadow)
        || state.braziers.some(b => b.lit && distance(b, shadow) < 75);
      const speed = state.settings.shadowSpeed * shadow.speed * (lit ? 0.28 : 1);
      shadow.x += ((player.x - shadow.x) / d * speed + Math.sin(shadow.phase) * 5) * dt;
      shadow.y += ((player.y - shadow.y) / d * speed + Math.cos(shadow.phase) * 5) * dt;
      if (distance(shadow, player) < PLAYER_RADIUS + SHADOW_RADIUS && !player.invulnerable) {
        state.hearts--;
        player.invulnerable = INVULNERABILITY;
        const angle = Math.atan2(player.y - shadow.y, player.x - shadow.x);
        player.x = clamp(player.x + Math.cos(angle) * 38, 40, 920);
        player.y = clamp(player.y + Math.sin(angle) * 38, 110, 498);
        shadow.x -= Math.cos(angle) * 35;
        shadow.y -= Math.sin(angle) * 35;
        state.shake = 9;
        state.flash = 0.48;
        burst(player.x, player.y, 20, '#e66e73', 85);
        events |= EVENT_HIT;
      }
    }
    if (state.hearts <= 0 || state.oil <= 0) {
      state.phase = 'over';
      events |= EVENT_OVER;
    } else if (state.braziers.every(b => b.lit)) {
      state.phase = 'clear';
      state.clearTime = 2;
      state.score += 100;
      events |= EVENT_NIGHT_CLEAR;
    }
    return events;
  }

  reset();
  return { state, reset, step };
}
