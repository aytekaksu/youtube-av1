'use strict';

function element<T extends HTMLElement>(id: string, constructor: new () => T): T {
  const result = document.getElementById(id);
  if (!(result instanceof constructor)) throw new Error(`Missing popup element: ${id}`);
  return result;
}

const toggle = element('enabled', HTMLInputElement);
const reload = element('apply', HTMLButtonElement);
const message = element('message', HTMLParagraphElement);
let enabled = true;
let appliedEnabled: boolean | null = null;
let changed = false;
let tabId: number | null = null;

function showError(text: string) {
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

async function send(request: SettingsRequest): Promise<Extract<SettingsResponse, { ok: true }>> {
  const response: unknown = await chrome.runtime.sendMessage(request);
  if (typeof response !== 'object' || response === null || !('ok' in response)) {
    throw new Error('Could not connect. Reopen the popup to try again.');
  }
  if (response.ok !== true || !('enabled' in response) || typeof response.enabled !== 'boolean') {
    throw new Error('error' in response && typeof response.error === 'string'
      ? response.error : 'Could not connect. Reopen the popup to try again.');
  }
  return { ok: true, enabled: response.enabled };
}

async function inspectTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let url;
  try { url = new URL(tab?.url || ''); } catch (_) { return; }
  if (url.protocol !== 'https:' ||
      !['www.youtube.com', 'm.youtube.com', 'www.youtube-nocookie.com'].includes(url.hostname) ||
      (url.hostname === 'www.youtube.com' && url.pathname.startsWith('/live_chat'))) return;
  if (typeof tab?.id !== 'number') return;
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
  } catch (error) { showError(error instanceof Error ? error.message : 'Could not save. Please try again.'); }
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
  } catch (error) { showError(error instanceof Error ? error.message : 'Could not load settings. Reopen the popup.'); }
})();
