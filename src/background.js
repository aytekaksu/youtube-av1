'use strict';

const SCRIPT_ID = 'youtube-av1-mode';

async function registerMode(enabled) {
  const script = {
    id: SCRIPT_ID,
    matches: chrome.runtime.getManifest().host_permissions,
    excludeMatches: [
      'https://www.youtube.com/live_chat*',
      'https://www.youtube.com/live_chat_replay*'
    ],
    js: [enabled ? 'src/force-av1.js' : 'src/reset-av1.js'],
    runAt: 'document_start',
    allFrames: true,
    world: 'MAIN',
    persistAcrossSessions: true
  };
  const registered = await chrome.scripting.getRegisteredContentScripts({ ids: [SCRIPT_ID] });
  if (registered.length) {
    await chrome.scripting.updateContentScripts([script]);
  } else {
    await chrome.scripting.registerContentScripts([script]);
  }
}

async function getEnabled() {
  const { enabled = true } = await chrome.storage.local.get('enabled');
  return enabled !== false;
}

// Serialize startup and popup writes so rapid changes cannot race registration.
let pending = Promise.resolve();
function enqueue(operation) {
  const result = pending.then(operation);
  pending = result.catch(() => {});
  return result;
}

function initialize() {
  return enqueue(async () => registerMode(await getEnabled()));
}

chrome.runtime.onInstalled.addListener(() => { initialize().catch(console.error); });
chrome.runtime.onStartup.addListener(() => { initialize().catch(console.error); });

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  // Settings messages are accepted only from this extension's own pages.
  if (sender.id !== chrome.runtime.id || sender.tab ||
      !sender.url?.startsWith(chrome.runtime.getURL(''))) return;
  if (message?.type !== 'get-settings' && message?.type !== 'set-enabled') return;

  enqueue(async () => {
    const previous = await getEnabled();
    if (message.type === 'get-settings') {
      await registerMode(previous);
      return { enabled: previous };
    }
    if (typeof message.enabled !== 'boolean') throw new Error('Invalid setting.');
    await registerMode(message.enabled);
    try {
      await chrome.storage.local.set({ enabled: message.enabled });
    } catch (error) {
      await registerMode(previous);
      throw error;
    }
    return { enabled: message.enabled };
  }).then(
    value => respond({ ok: true, ...value }),
    () => respond({ ok: false, error: 'Could not save the AV1 preference. Please try again.' })
  );
  return true;
});
