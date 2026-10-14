const $ = id => document.getElementById(id);
const PIANO_URL = 'https://www.onlinepianist.com/virtual-piano';
const seedInput = $('seed'), status = $('status'), reloadBtn = $('reload');

const show = (text, isError = false) => { status.textContent = text; status.classList.toggle('error', isError); };

// Random seed from Math.random mixed with the current time
const randomSeed = () => (Math.floor(Math.random() * 1e9) ^ Date.now()) >>> 0;

// tab.url is only visible on sites the extension has host permission for, so it's empty elsewhere
const isPianoSite = tab => !!tab && /^https:\/\/(www\.)?onlinepianist\.com\//.test(tab.url || '');

// The player runs in its own window, so "the current page" is the active tab of the last-focused browser window
async function browserTab() {
  const win = await chrome.windows.getLastFocused({ windowTypes: ['normal'], populate: true });
  return win.tabs.find(t => t.active);
}

async function pianoTab() {
  const tab = await browserTab();
  if (!isPianoSite(tab)) {
    throw new Error('Not on the piano page. Click "Go to virtual piano" first.');
  }
  return tab;
}

// Runs fn(...args) in the page's own JS context; injects the generator if the tab predates the extension
async function runInPage(fn, args = []) {
  const tab = await pianoTab();
  const target = { tabId: tab.id };
  const [{ result: loaded }] = await chrome.scripting.executeScript({ target, world: 'MAIN', func: () => typeof window.chopin === 'function' });
  if (!loaded) await chrome.scripting.executeScript({ target, world: 'MAIN', files: ['chopin-generator.js'] });
  const [{ result }] = await chrome.scripting.executeScript({ target, world: 'MAIN', func: fn, args });
  return result;
}

// A seed typed by the user plays once; otherwise every Play generates a fresh random seed
let typedSeed = false;
seedInput.addEventListener('input', () => { typedSeed = seedInput.value.trim() !== ''; });

$('play').addEventListener('click', async () => {
  const seed = typedSeed ? seedInput.value.trim() : String(randomSeed());
  typedSeed = false;
  seedInput.value = seed;                       // show the seed so it can be noted/replayed
  reloadBtn.hidden = true;
  try {
    const info = await runInPage(s => window.chopin(s), [seed]);
    if (typeof info === 'string') {             // first run: keybind map saved, page needs a reload
      show(info);
      reloadBtn.hidden = false;
      return;
    }
    show(`Seed: ${info.seed}\n${info.style}, ${info.key}\n${info.tempo}\nLength: ${info.length}, ${info.notes} notes\nEnding: ${info.ending}`);
    addToHistory(info);
  } catch (e) {
    show(e.message, true);
  }
});

$('stop').addEventListener('click', async () => {
  try { await runInPage(() => window.stop()); show('Stopped.'); }
  catch (e) { show(e.message, true); }
});

reloadBtn.addEventListener('click', async () => {
  try { const tab = await pianoTab(); await chrome.tabs.reload(tab.id); reloadBtn.hidden = true; show('Page reloaded. Click a piano key, then press Play.'); }
  catch (e) { show(e.message, true); }
});

$('open').addEventListener('click', async () => {
  const tab = await browserTab();
  await chrome.tabs.update(tab.id, { url: PIANO_URL });
});

$('close').addEventListener('click', () => window.close());

seedInput.addEventListener('keydown', e => { if (e.key === 'Enter') $('play').click(); });

// ---------- played-seed history (newest first, kept in the popup's localStorage) ----------
const HISTORY_KEY = 'played-seeds', HISTORY_MAX = 100;

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch { return []; }
}
function saveHistory(list) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list)); } catch {}
}

function addToHistory(info) {
  const list = loadHistory();
  if (list.some(h => h.seed === info.seed)) return;               // already saved: leave the list as it is
  list.unshift({ seed: info.seed, style: info.style, key: info.key, length: info.length, at: Date.now() });
  saveHistory(list.slice(0, HISTORY_MAX));
  renderHistory();
}

function renderHistory() {
  const list = loadHistory(), ul = $('history');
  $('history-count').textContent = list.length;
  $('clear-history').hidden = !list.length;
  ul.replaceChildren();
  if (!list.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'No seeds played yet.';
    ul.append(li);
    return;
  }
  for (const h of list) {
    const li = document.createElement('li'), seed = document.createElement('span'), meta = document.createElement('span');
    seed.className = 'seed'; seed.textContent = h.seed;
    meta.className = 'meta'; meta.textContent = `${h.style}, ${h.key} · ${h.length}`;
    li.title = `Played ${new Date(h.at).toLocaleString()}. Click to play again.`;
    const del = document.createElement('button');
    del.className = 'delete'; del.textContent = '×'; del.title = 'Remove from history';
    del.addEventListener('click', e => {
      e.stopPropagation();                                        // don't also play the seed
      saveHistory(loadHistory().filter(x => x.seed !== h.seed));
      renderHistory();
    });
    li.append(seed, meta, del);
    li.addEventListener('click', () => { seedInput.value = h.seed; typedSeed = true; $('play').click(); });
    ul.append(li);
  }
}

$('clear-history').addEventListener('click', () => { saveHistory([]); renderHistory(); });
renderHistory();

// On the piano site only the playing controls work; anywhere else only "Go to virtual piano" does.
// Re-checked whenever the user switches tab or window, or a tab navigates.
const OFF_SITE_MSG = 'Open the virtual piano to play.';
async function refreshSite() {
  let onSite = false;
  try { onSite = isPianoSite(await browserTab()); } catch {}
  document.body.classList.toggle('off-site', !onSite);
  $('play').disabled = $('stop').disabled = reloadBtn.disabled = !onSite;
  $('open').disabled = onSite;
  if (!onSite) show(OFF_SITE_MSG);
  else if (status.textContent === OFF_SITE_MSG) show('');
}
chrome.tabs.onActivated.addListener(refreshSite);
chrome.tabs.onUpdated.addListener((id, change) => { if (change.url || change.status) refreshSite(); });
chrome.windows.onFocusChanged.addListener(refreshSite);
refreshSite();
