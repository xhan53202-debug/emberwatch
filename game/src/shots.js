// Staging is explicit and static: no simulation or timers run in screenshot mode.
export function stageShot(name, world) {
  const scene = ['start', 'play', 'end'].includes(name) ? name : 'start';
  world.reset(scene === 'start' ? 1 : 2);
  const s = world.state;
  s.time = 12.75;
  s.player.x = 476;
  s.player.y = 316;
  s.player.angle = -0.56;
  s.shards = [
    { x: 354, y: 277, phase: 1 }, { x: 563, y: 246, phase: 2 },
    { x: 631, y: 357, phase: 3 }, { x: 398, y: 412, phase: 4 },
    { x: 293, y: 380, phase: 0 }, { x: 815, y: 322, phase: 2 },
    { x: 662, y: 174, phase: 1 }, { x: 137, y: 295, phase: 3 }
  ];
  s.shadows = [
    { x: 679, y: 286, phase: 2, speed: 1 },
    { x: 328, y: 336, phase: 4, speed: 1 },
    { x: 791, y: 463, phase: 1, speed: 1 },
    { x: 560, y: 144, phase: 3, speed: 1 }
  ];
  s.particles = Array.from({ length: 32 }, (_, i) => ({
    x: 210 + Math.sin(i * 2.1) * 24,
    y: 183 - (i * 11) % 73,
    vx: 0, vy: 0, life: 0.6 + (i % 3) * 0.1, maxLife: 1,
    size: i % 3 === 0 ? 2 : 1, color: '#ffbb65'
  }));
  if (scene === 'start') {
    s.player.x = 480;
    s.player.y = 320;
    s.oil = 100;
    s.score = 0;
    s.collected = 0;
    s.hearts = 3;
    s.braziers.forEach(brazier => { brazier.lit = false; });
    s.shadows = [];
    s.night = 1;
    return { screen: 'title', best: 420 };
  }
  if (scene === 'end') {
    s.braziers[0].lit = true;
    s.braziers[1].lit = true;
    s.oil = 63;
    s.phase = 'over';
    s.hearts = 0;
    s.score = 480;
    s.collected = 28;
    s.night = 3;
    return { screen: 'over', best: 620 };
  }
  s.braziers[0].lit = true;
  s.braziers[1].lit = true;
  s.oil = 63;
  s.score = 270;
  s.collected = 17;
  s.hearts = 2;
  s.night = 2;
  return { screen: 'play', best: 420 };
}
