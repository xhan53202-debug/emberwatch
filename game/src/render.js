import {
  WORLD, COLORS, OIL_MAX, RELIGHT_RANGE, LIGHT_RADIUS,
  BEAM_LENGTH, BEAM_HALF_ANGLE, distance, clamp
} from './config.js';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const darkness = document.createElement('canvas');
  darkness.width = WORLD.width;
  darkness.height = WORLD.height;
  const dark = darkness.getContext('2d');
  const noise = document.createElement('canvas');
  noise.width = 160;
  noise.height = 90;
  const nc = noise.getContext('2d');
  const pixels = nc.createImageData(160, 90);
  // Separate deterministic visual noise keeps the gameplay seed untouched.
  let hash = 731;
  for (let i = 0; i < pixels.data.length; i += 4) {
    hash = (Math.imul(hash, 1664525) + 1013904223) >>> 0;
    const shade = hash >>> 24;
    pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = shade;
    pixels.data[i + 3] = 30;
  }
  nc.putImageData(pixels, 0, 0);
  let scale = 1;

  function resize() {
    const fit = Math.min(window.innerWidth / WORLD.width, window.innerHeight / WORLD.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = `${WORLD.width * fit}px`;
    canvas.style.height = `${WORLD.height * fit}px`;
    canvas.width = Math.round(WORLD.width * dpr);
    canvas.height = Math.round(WORLD.height * dpr);
    scale = canvas.width / WORLD.width;
  }
  window.addEventListener('resize', resize);
  resize();

  function text(value, x, y, size = 14, color = COLORS.cream, align = 'left', serif = false) {
    ctx.fillStyle = color;
    ctx.font = `${serif ? '' : '500 '}${size}px ${serif ? 'Georgia, serif' : 'monospace'}`;
    ctx.textAlign = align;
    ctx.fillText(value, x, y);
  }

  function glow(x, y, radius, color, context = ctx) {
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = gradient;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  function line(x1, y1, x2, y2, color) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function floor(time) {
    ctx.fillStyle = COLORS.void;
    ctx.fillRect(0, 0, 960, 540);
    ctx.fillStyle = '#303c50';
    ctx.fillRect(27, 91, 906, 425);
    for (let row = 0; row < 11; row++) {
      const y = 94 + row * 39;
      line(30, y, 930, y, '#222938');
      for (let col = 0; col < 9; col++) {
        const x = 30 + col * 116 + (row % 2) * 58;
        line(x, y, x, y + 39, '#0d131f');
        line(x + 15, y + 9, x + 67, y + 9, '#192131');
      }
    }
    ctx.strokeStyle = '#38404a';
    ctx.strokeRect(26.5, 90.5, 907, 426);
    ctx.strokeStyle = '#252c39';
    ctx.strokeRect(34.5, 98.5, 891, 410);
    for (const x of [46, 914]) {
      for (const y of [121, 477]) {
        ctx.fillStyle = '#212a38';
        ctx.fillRect(x - 11, y - 19, 22, 38);
        ctx.fillStyle = '#323b48';
        ctx.fillRect(x - 13, y - 22, 26, 6);
      }
    }
    ctx.save();
    ctx.translate(480, 307);
    ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = '#2b3040';
    ctx.strokeRect(-85, -85, 170, 170);
    ctx.strokeRect(-74, -74, 148, 148);
    ctx.restore();
    for (let i = 0; i < 22; i++) {
      const x = (i * 137 + Math.sin(time * 0.2 + i) * 15) % 900 + 30;
      const y = 110 + ((i * 83 - time * 8) % 380 + 380) % 380;
      ctx.fillStyle = `rgba(210,174,121,${0.08 + Math.sin(i + time) * 0.04})`;
      ctx.fillRect(x, y, 1.5, 1.5);
    }
  }

  function flame(x, y, time, size = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size, size);
    const sway = Math.sin(time * 7 + x) * 3;
    ctx.fillStyle = '#ee853b';
    ctx.beginPath();
    ctx.moveTo(-8, 1);
    ctx.bezierCurveTo(-13, -9, sway - 2, -15, sway, -26);
    ctx.bezierCurveTo(5, -17, 15, -7, 8, 1);
    ctx.fill();
    ctx.fillStyle = '#ffe0a0';
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.quadraticCurveTo(-6, -7, sway + 1, -16);
    ctx.quadraticCurveTo(9, -5, 4, 0);
    ctx.fill();
    ctx.restore();
  }

  function brazier(b, state) {
    if (b.lit) glow(b.x, b.y - 14, 105, '#d88a363f');
    ctx.fillStyle = '#080c14';
    ctx.beginPath();
    ctx.ellipse(b.x, b.y + 12, 25, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5d5350';
    ctx.fillRect(b.x - 4, b.y - 4, 8, 19);
    ctx.fillStyle = '#776653';
    ctx.fillRect(b.x - 15, b.y + 12, 30, 5);
    ctx.fillStyle = b.lit ? '#8d6540' : '#424450';
    ctx.beginPath();
    ctx.moveTo(b.x - 19, b.y - 17);
    ctx.lineTo(b.x + 19, b.y - 17);
    ctx.lineTo(b.x + 11, b.y - 2);
    ctx.lineTo(b.x - 11, b.y - 2);
    ctx.closePath();
    ctx.fill();
    line(b.x - 20, b.y - 18, b.x + 20, b.y - 18, b.lit ? '#e7ae66' : '#71717b');
    if (!b.lit) {
      // Unlit braziers must stay findable in the dark: a cold rim-glow and a
      // slow pulsing ember above the bowl mark the goal without lighting it.
      glow(b.x, b.y - 10, 58, '#5d71911f');
      const pulse = 0.45 + Math.sin(state.time * 2.2 + b.x) * 0.3;
      ctx.globalAlpha = pulse;
      ctx.fillStyle = '#e8a34f';
      ctx.beginPath();
      ctx.arc(b.x, b.y - 30, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (b.lit) flame(b.x, b.y - 17, state.time);
    if (!b.lit && distance(b, state.player) < RELIGHT_RANGE && state.phase === 'play') {
      ctx.strokeStyle = '#e8a34f55';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 32, 0, Math.PI * 2);
      ctx.stroke();
      text('SPACE / CLICK · 8 OIL', b.x, b.y + 38, 10, COLORS.amber, 'center');
    }
  }

  function shadow(s, time) {
    ctx.save();
    ctx.translate(s.x, s.y);
    glow(0, 0, 36, '#02040bd9');
    ctx.fillStyle = '#060913';
    ctx.beginPath();
    ctx.moveTo(-15, 12);
    ctx.bezierCurveTo(-29, -4, -13, -28, 2, -23);
    ctx.bezierCurveTo(23, -21, 25, 0, 11, 14);
    ctx.quadraticCurveTo(3, 24 + Math.sin(s.phase + time) * 6, -15, 12);
    ctx.fill();
    for (const x of [-6, 5]) {
      glow(x, -7, 7, '#d344494f');
      ctx.fillStyle = '#d88480';
      ctx.fillRect(x, -8, 3, 2);
    }
    ctx.restore();
  }

  function keeper(player, time) {
    ctx.save();
    ctx.translate(player.x, player.y);
    if (player.invulnerable > 0 && Math.sin(time * 38) > 0) ctx.globalAlpha = 0.45;
    ctx.fillStyle = '#050913aa';
    ctx.beginPath();
    ctx.ellipse(0, 13, 17, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#b29a7b';
    ctx.fillRect(-8, 7, 5, 8);
    ctx.fillRect(3, 7, 5, 8);
    ctx.fillStyle = '#536b79';
    ctx.beginPath();
    ctx.moveTo(-9, -7);
    ctx.lineTo(9, -7);
    ctx.lineTo(13, 10);
    ctx.lineTo(-13, 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#243748';
    ctx.beginPath();
    ctx.arc(0, -9, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c9b391';
    ctx.beginPath();
    ctx.arc(Math.cos(player.angle) * 3, -8 + Math.sin(player.angle) * 2, 5, 0, Math.PI * 2);
    ctx.fill();
    const lx = Math.cos(player.angle) * 19;
    const ly = Math.sin(player.angle) * 15;
    line(5, 0, lx, ly, '#9a8972');
    glow(lx, ly, 32, '#ffbd6366');
    ctx.strokeStyle = '#ba914e';
    ctx.strokeRect(lx - 5, ly - 8, 10, 13);
    ctx.fillStyle = '#ffe3a1';
    ctx.fillRect(lx - 3, ly - 6, 6, 8);
    ctx.restore();
  }

  function lighting(state) {
    const p = state.player;
    dark.clearRect(0, 0, 960, 540);
    dark.globalCompositeOperation = 'source-over';
    dark.fillStyle = `rgba(3,6,15,${state.settings.darkness * 0.88})`;
    dark.fillRect(0, 0, 960, 540);
    dark.globalCompositeOperation = 'destination-out';
    glow(p.x, p.y, LIGHT_RADIUS + 32, 'rgba(0,0,0,0.96)', dark);
    dark.save();
    dark.translate(p.x, p.y);
    dark.rotate(p.angle);
    dark.beginPath();
    dark.moveTo(0, 0);
    dark.arc(0, 0, BEAM_LENGTH, -BEAM_HALF_ANGLE, BEAM_HALF_ANGLE);
    dark.closePath();
    dark.clip();
    glow(0, 0, BEAM_LENGTH, 'rgba(0,0,0,0.88)', dark);
    dark.restore();
    for (const b of state.braziers) {
      if (b.lit) glow(b.x, b.y - 16, 125, 'rgba(0,0,0,0.87)', dark);
    }
    dark.globalCompositeOperation = 'source-over';
    ctx.drawImage(darkness, 0, 0);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    const beam = ctx.createRadialGradient(0, 0, 5, 0, 0, BEAM_LENGTH);
    beam.addColorStop(0, '#ffcd7b0f');
    beam.addColorStop(1, '#ffcd7b00');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, BEAM_LENGTH, -BEAM_HALF_ANGLE, BEAM_HALF_ANGLE);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function heart(x, y, filled) {
    ctx.fillStyle = filled ? '#d88b7e' : '#28303e';
    ctx.beginPath();
    ctx.moveTo(x, y + 5);
    ctx.bezierCurveTo(x - 15, y - 4, x - 8, y - 15, x, y - 7);
    ctx.bezierCurveTo(x + 8, y - 15, x + 15, y - 4, x, y + 5);
    ctx.fill();
  }

  function hud(state, best) {
    ctx.fillStyle = '#0a0e1aee';
    ctx.fillRect(0, 0, 960, 82);
    line(28, 81, 932, 81, '#9c764f55');
    text('EMBERWATCH', 30, 31, 21, COLORS.cream, 'left', true);
    text('守灯人  /  NIGHT KEEPER', 31, 52, 10, COLORS.muted);
    text('LANTERN OIL', 251, 25, 10, COLORS.muted);
    ctx.fillStyle = '#252a36';
    ctx.fillRect(251, 34, 172, 8);
    ctx.fillStyle = state.oil < 25 ? COLORS.red : COLORS.gold;
    ctx.fillRect(251, 34, 172 * clamp(state.oil / OIL_MAX, 0, 1), 8);
    text(`${Math.ceil(state.oil)}%`, 435, 42, 12, COLORS.amber);
    if (state.oil < 25 && state.phase === 'play' && Math.sin(state.time * 6) > 0) {
      // Oil-out is a sudden game over, so a low-oil warning must be impossible
      // to miss while dodging: blink the remedy next to the bar, not just recolour it.
      text('LOW OIL — EMBERS +4', 472, 42, 10, COLORS.red);
    }
    for (let i = 0; i < 3; i++) heart(262 + i * 25, 64, i < state.hearts);
    text(`NIGHT  ${String(state.night).padStart(2, '0')}`, 510, 29, 13, COLORS.amber);
    text(`BRAZIERS  ${state.braziers.filter(b => b.lit).length}/${state.braziers.length}`,
      510, 53, 11, COLORS.muted);
    text(`SHARDS  ${String(state.collected).padStart(2, '0')}`, 660, 53, 11, COLORS.muted);
    text('SCORE', 820, 24, 10, COLORS.muted, 'right');
    text(String(state.score).padStart(5, '0'), 820, 49, 24, COLORS.cream, 'right', true);
    text('BEST', 929, 24, 10, COLORS.muted, 'right');
    text(String(best).padStart(5, '0'), 929, 48, 18, COLORS.gold, 'right', true);
    text('WASD / ARROWS / HOLD POINTER  ·  SPACE / CLICK: KINDLE', 30, 531, 9, COLORS.muted);
    text('P: PAUSE   M: SOUND', 930, 531, 9, COLORS.muted, 'right');
  }

  function panel(eyebrow, title, subtitle, color = COLORS.amber) {
    ctx.fillStyle = '#050914c9';
    ctx.fillRect(0, 82, 960, 435);
    line(285, 176, 675, 176, '#b68b5266');
    text(eyebrow, 480, 163, 11, color, 'center');
    text(title, 480, 245, 51, COLORS.cream, 'center', true);
    text(subtitle, 480, 282, 13, COLORS.muted, 'center');
    line(350, 307, 610, 307, '#b68b5244');
  }

  function title(state) {
    ctx.fillStyle = '#070b16c2';
    ctx.fillRect(0, 0, 960, 540);
    glow(480, 260, 280, '#b5742924');
    text('守 灯 人     /     NIGHT KEEPER', 480, 115, 12, COLORS.gold, 'center');
    text('EMBERWATCH', 480, 199, 73, COLORS.cream, 'center', true);
    line(320, 224, 640, 224, '#ac824b88');
    text('The building sleeps. Something in the dark does not.', 480, 253, 16, COLORS.muted, 'center', true);
    text('Kindle every brazier. Gather embers. Keep your lantern alive.', 480, 285, 13, COLORS.amber, 'center');
    text('MOVE  WASD / ARROWS / HOLD POINTER', 480, 340, 11, COLORS.cream, 'center');
    text('AIM  MOUSE    ·    KINDLE  SPACE / CLICK', 480, 363, 11, COLORS.cream, 'center');
    text('PAUSE  P / ESC    ·    SOUND  M', 480, 386, 11, COLORS.muted, 'center');
    ctx.fillStyle = '#d89a4420';
    ctx.fillRect(318, 421, 324, 43);
    ctx.strokeStyle = '#c99a5266';
    ctx.strokeRect(318.5, 421.5, 323, 42);
    text('PRESS ENTER / CLICK TO START', 480, 448, 13, COLORS.amber, 'center');
    text('A SMALL LIGHT AGAINST A VERY OLD DARKNESS', 480, 505, 9, COLORS.muted, 'center');
  }

  function draw(state, screen, best) {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, 960, 540);
    ctx.save();
    ctx.translate(Math.sin(state.time * 91) * state.shake, Math.cos(state.time * 73) * state.shake * 0.6);
    floor(state.time);
    for (const shard of state.shards) {
      const bob = Math.sin(state.time * 3 + shard.phase) * 3;
      glow(shard.x, shard.y + bob, 24, '#f4a94b35');
      ctx.save();
      ctx.translate(shard.x, shard.y + bob);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#ffd68e';
      ctx.fillRect(-3, -3, 6, 6);
      ctx.restore();
    }
    for (const b of state.braziers) brazier(b, state);
    for (const s of state.shadows) shadow(s, state.time);
    keeper(state.player, state.time);
    lighting(state);
    for (const p of state.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    for (const t of state.texts) {
      ctx.globalAlpha = Math.min(1, t.life);
      text(t.text, t.x, t.y, 12, t.color, 'center');
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    const vignette = ctx.createRadialGradient(480, 280, 170, 480, 280, 560);
    vignette.addColorStop(0, '#00000000');
    vignette.addColorStop(1, '#01030bc9');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, 960, 540);
    hud(state, best);
    if (screen === 'title') title(state);
    if (screen === 'paused') {
      panel('THE DARK CAN WAIT', 'PAUSED', 'Your lantern is safe while you rest.');
      text('PRESS P / ESC OR CLICK TO RESUME', 480, 355, 13, COLORS.amber, 'center');
    }
    if (screen === 'over') {
      panel('THE LAST EMBER HAS FALLEN', 'LIGHTS OUT',
        state.hearts <= 0 ? 'The shadows found their keeper.' : 'Even the warmest flame must fade.', COLORS.red);
      text(`SCORE  ${state.score}     /     BEST  ${best}`, 480, 349, 20, COLORS.amber, 'center', true);
      text(`NIGHT ${state.night}  ·  ${state.collected} EMBER SHARDS RECOVERED`, 480, 382, 11, COLORS.muted, 'center');
      text('PRESS R / ENTER OR CLICK TO PLAY AGAIN', 480, 438, 12, COLORS.cream, 'center');
    }
    if (state.phase === 'clear' && screen === 'play') {
      ctx.fillStyle = '#090e1be8';
      ctx.fillRect(0, 203, 960, 126);
      line(250, 204, 710, 204, '#ca9b5866');
      text('NIGHT CLEARED', 480, 256, 37, COLORS.cream, 'center', true);
      text('+100  ·  THE FLAMES HOLD. ANOTHER NIGHT APPROACHES.', 480, 293, 11, COLORS.amber, 'center');
    }
    if (state.flash > 0) {
      ctx.fillStyle = `rgba(166,31,45,${state.flash})`;
      ctx.fillRect(0, 0, 960, 540);
    }
    ctx.globalAlpha = 0.3;
    ctx.drawImage(noise, 0, 0, 960, 540);
    ctx.globalAlpha = 1;
  }

  return { draw, resize };
}
