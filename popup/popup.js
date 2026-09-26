'use strict';

const toggle = document.getElementById('enabled');
const reload = document.getElementById('apply');
const message = document.getElementById('message');
let enabled = true;
let appliedEnabled = null;
let changed = false;
let tabId = null;

function showError(text) {
  message.textContent = text;
  message.hidden = !text;
}

function render() {
  toggle.checked = enabled;
  // Remember unapplied changes across popup opens by reading the page's mode.
  const pending = appliedEnabled === null ? changed : enabled !== appliedEnabled;
  reload.disabled = tabId === null || !pending;
  reload.title = tabId === null ? 'Open a YouTube tab to reload it' : '';
}

async function send(request) {
  const response = await chrome.runtime.sendMessage(request);
  if (!response?.ok) throw new Error(response?.error || 'Could not connect. Reopen the popup to try again.');
  return response;
}

async function inspectTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let url;
  try { url = new URL(tab?.url || ''); } catch (_) { return; }
  if (url.protocol !== 'https:' ||
      !['www.youtube.com', 'm.youtube.com', 'www.youtube-nocookie.com'].includes(url.hostname) ||
      (url.hostname === 'www.youtube.com' && url.pathname.startsWith('/live_chat'))) return;
  tabId = tab.id;
  try {
    const [frame] = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: () => window.__forceYouTubeAv1Installed === true
    });
    if (typeof frame?.result === 'boolean') appliedEnabled = frame.result;
  } catch (_) { /* A saved change can still be applied with a reload. */ }
}

toggle.addEventListener('change', async () => {
  toggle.disabled = true;
  reload.disabled = true;
  showError('');
  try {
    ({ enabled } = await send({ type: 'set-enabled', enabled: toggle.checked }));
    changed = true;
  } catch (error) { showError(error.message); }
  render();
  toggle.disabled = false;
});

reload.addEventListener('click', async () => {
  if (tabId === null || reload.disabled) return;
  toggle.disabled = true;
  reload.disabled = true;
  showError('');
  try {
    await chrome.tabs.reload(tabId);
    appliedEnabled = enabled;
    changed = false;
    render();
    window.close();
  } catch (_) {
    showError('Could not reload this tab. Please try again.');
    render();
  } finally { toggle.disabled = false; }
});

(async () => {
  try {
    const [settings] = await Promise.all([send({ type: 'get-settings' }), inspectTab()]);
    enabled = settings.enabled;
    render();
    toggle.disabled = false;
  } catch (error) { showError(error.message); }
})();
