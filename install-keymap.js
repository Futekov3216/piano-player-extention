// Runs at document_start, before the site reads its settings, so the 88-key Custom keybind map
// is already in place when the piano initializes — no reload needed.
// Must match the mapping in chopin-generator.js.
(() => {
  const CODES = ['Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7','Digit8','Digit9','Digit0',
    'KeyQ','KeyW','KeyE','KeyR','KeyT','KeyY','KeyU','KeyI','KeyO','KeyP','BracketLeft','BracketRight',
    'KeyA','KeyS','KeyD','KeyF','KeyG','KeyH','KeyJ','KeyK','KeyL','Semicolon','Quote',
    'KeyZ','KeyX','KeyC','KeyV','KeyB','KeyN','KeyM','Comma','Period','Slash','Equal'];
  const LOW = 21, SPLIT = 65, SETTINGS = 'vp-settings';
  const map = {};
  CODES.forEach((c, i) => { map[LOW + i] = { code: c }; map[SPLIT + i] = { code: c, shift: true }; });
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS) || '{}');
    localStorage.setItem(SETTINGS, JSON.stringify({ ...s, keyboardMarks: 'custom', customKeyMap: map, zoomed: false }));
  } catch (e) { console.warn('Piano Player: could not install keymap', e); }
})();
