import { WORLD } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RELIGHT = 4;
export const ACTION_MUTE = 8;

export function createInput(canvas) {
  const held = new Set();
  let pending = 0;
  const mouse = {
    x: WORLD.width / 2 + 120,
    y: WORLD.height / 2,
    active: false,
    down: false,
    clicked: false
  };
  const bindings = {
    Enter: ACTION_CONFIRM,
    KeyR: ACTION_CONFIRM,
    Space: ACTION_RELIGHT,
    KeyP: ACTION_PAUSE,
    Escape: ACTION_PAUSE,
    KeyM: ACTION_MUTE
  };
  const movement = [
    'KeyW', 'KeyA', 'KeyS', 'KeyD',
    'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'
  ];

  function locate(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = (event.clientX - rect.left) * WORLD.width / rect.width;
    mouse.y = (event.clientY - rect.top) * WORLD.height / rect.height;
    mouse.active = true;
  }

  window.addEventListener('keydown', event => {
    if (movement.includes(event.code) || bindings[event.code]) event.preventDefault();
    held.add(event.code);
    if (!event.repeat) pending |= bindings[event.code] || 0;
  });
  window.addEventListener('keyup', event => held.delete(event.code));
  window.addEventListener('blur', () => {
    held.clear();
    mouse.down = false;
    pending = 0;
  });
  canvas.addEventListener('pointermove', locate);
  canvas.addEventListener('pointerdown', event => {
    event.preventDefault();
    locate(event);
    canvas.focus();
    mouse.down = true;
    mouse.clicked = true;
    pending |= ACTION_CONFIRM | ACTION_RELIGHT;
    try { canvas.setPointerCapture(event.pointerId); } catch {}
  });
  window.addEventListener('pointerup', () => { mouse.down = false; });
  window.addEventListener('pointercancel', () => { mouse.down = false; });
  canvas.addEventListener('contextmenu', event => event.preventDefault());

  return {
    mouse,
    direction() {
      let x = Number(held.has('KeyD') || held.has('ArrowRight'))
        - Number(held.has('KeyA') || held.has('ArrowLeft'));
      let y = Number(held.has('KeyS') || held.has('ArrowDown'))
        - Number(held.has('KeyW') || held.has('ArrowUp'));
      const length = Math.hypot(x, y);
      if (length) { x /= length; y /= length; }
      return { x, y };
    },
    takeActions() {
      const actions = pending;
      pending = 0;
      mouse.clicked = false;
      return actions;
    },
    releasePointer() { mouse.down = false; }
  };
}
