import { STEP } from './config.js';
import { mulberry32, readSeed } from './random.js';
import {
  createInput, ACTION_CONFIRM, ACTION_PAUSE, ACTION_MUTE
} from './input.js';
import {
  createWorld, EVENT_HIT, EVENT_OVER, EVENT_NIGHT_CLEAR, EVENT_SHARD, EVENT_BRAZIER
} from './world.js';
import { createRenderer } from './render.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.querySelector('#game');
const status = document.querySelector('#status');
const params = new URLSearchParams(location.search);
const world = createWorld(mulberry32(readSeed(params)));
const renderer = createRenderer(canvas);
const audio = createAudio();
let screen = 'title';
let best = 0;
let accumulator = 0;
let previous = 0;
let lastNight = 1;

try {
  best = Math.max(0, Number(localStorage.getItem('emberwatch_best')) || 0);
} catch {
  // Private browsing may deny persistence.
}

function announce(message) {
  status.textContent = message;
}

function saveBest() {
  best = Math.max(best, world.state.score);
  try { localStorage.setItem('emberwatch_best', String(best)); } catch {}
}

function begin(input) {
  world.reset(1);
  lastNight = 1;
  screen = 'play';
  accumulator = 0;
  input.releasePointer();
  announce('Night one. Light all three braziers. Your lantern is full.');
}

function handleEvents(events) {
  if (events & EVENT_SHARD) audio.shard();
  if (events & EVENT_BRAZIER) {
    audio.brazier();
    const count = world.state.braziers.filter(b => b.lit).length;
    announce(`Brazier kindled. ${count} of ${world.state.braziers.length} lit.`);
  }
  if (events & EVENT_HIT) {
    audio.hit();
    announce(`A shadow struck you. ${world.state.hearts} hearts remain.`);
  }
  if (events & EVENT_NIGHT_CLEAR) {
    audio.clear();
    saveBest();
    announce(`Night ${world.state.night} cleared. One hundred bonus points.`);
  }
  if (events & EVENT_OVER) {
    screen = 'over';
    audio.over();
    saveBest();
    announce(`Game over. Score ${world.state.score}. Best ${best}. Press R, Enter, or click to restart.`);
  }
}

// Screenshot mode intentionally creates no input listeners or game loop.
if (params.has('shot')) {
  const staged = stageShot(params.get('shot'), world);
  const paint = () => renderer.draw(world.state, staged.screen, staged.best);
  window.__shotReady = false;
  requestAnimationFrame(() => {
    paint();
    requestAnimationFrame(() => {
      paint();
      window.__shotReady = true;
    });
  });
  window.addEventListener('resize', paint);
  announce(`Emberwatch staged ${params.get('shot')} scene.`);
} else {
  const input = createInput(canvas);
  // Resume audio directly inside a user gesture, before any frame callback.
  window.addEventListener('keydown', () => audio.start());
  canvas.addEventListener('pointerdown', () => audio.start());
  window.addEventListener('blur', () => {
    if (screen === 'play') {
      screen = 'paused';
      accumulator = 0;
      announce('Paused. Press P, Escape, or click to resume.');
    }
  });

  function frame(timestamp) {
    const elapsed = previous ? Math.min((timestamp - previous) / 1000, 0.15) : 0;
    previous = timestamp;
    const actions = input.takeActions();
    let changedScreen = false;
    if (actions & ACTION_MUTE) {
      const muted = audio.toggle();
      announce(muted ? 'Sound muted.' : 'Sound enabled.');
    }
    if ((screen === 'title' || screen === 'over') && (actions & ACTION_CONFIRM)) {
      begin(input);
      changedScreen = true;
    } else if (screen === 'play' && (actions & ACTION_PAUSE)) {
      screen = 'paused';
      accumulator = 0;
      changedScreen = true;
      input.releasePointer();
      announce('Paused. Press P, Escape, or click to resume.');
    } else if (screen === 'paused' && (actions & (ACTION_PAUSE | ACTION_CONFIRM))) {
      screen = 'play';
      accumulator = 0;
      changedScreen = true;
      input.releasePointer();
      announce('Resumed. Keep the lantern burning.');
    }

    if (screen === 'play' && !changedScreen) {
      accumulator += elapsed;
      let stepActions = actions;
      const direction = input.direction();
      while (accumulator >= STEP && screen === 'play') {
        const events = world.step(STEP, { direction, actions: stepActions }, input.mouse);
        stepActions = 0;
        accumulator -= STEP;
        handleEvents(events);
        if (world.state.night !== lastNight) {
          lastNight = world.state.night;
          announce(`Night ${lastNight}. Light all ${world.state.braziers.length} braziers.`);
        }
      }
      // Preserve edge actions on high-refresh displays until a simulation tick.
      if (accumulator < STEP && stepActions) {
        queuedActions |= stepActions;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
    requestAnimationFrame(tick);
  }

  let queuedActions = 0;
  // A tiny adapter keeps one-frame presses alive between fixed simulation ticks.
  const takeActions = input.takeActions.bind(input);
  input.takeActions = () => {
    const actions = takeActions() | queuedActions;
    queuedActions = 0;
    return actions;
  };
  function tick(timestamp) {
    frame(timestamp);
  }
  requestAnimationFrame(tick);
}
