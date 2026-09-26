import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = process.env.AV1_EXTENSION_ROOT ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file: string): string => readFileSync(path.join(root, file), 'utf8');
type StorageMock = { data: Map<string, string>; getItem(key: string): string | null; setItem(key: string, value: string): void };
type WindowMock = {
  localStorage: StorageMock; sessionStorage: StorageMock;
  HTMLMediaElement: new () => { canPlayType(type: string): string };
  MediaSource: { isTypeSupported(type: string): boolean };
  navigator: { mediaCapabilities: { decodingInfo(config: object): Promise<{ supported: boolean; original?: boolean }> } };
};

function sandbox(pref: string | null): { context: vm.Context; window: WindowMock } {
  const context = vm.createContext({ console });
  vm.runInContext(`
    class Storage { constructor(){this.data=new Map()} getItem(k){return this.data.get(k)??null} setItem(k,v){this.data.set(k,String(v))} removeItem(k){this.data.delete(k)} }
    class HTMLMediaElement {canPlayType(t){return t.includes('avc1')?'probably':''}}
    const MediaSource={isTypeSupported:t=>t.includes('avc1')};
    const navigator={mediaCapabilities:{decodingInfo:async config=>({supported:false,smooth:false,powerEfficient:false,original:true})}};
    const window={Storage,HTMLMediaElement,MediaSource,navigator,localStorage:new Storage(),sessionStorage:new Storage()};
    globalThis.window=window;
  `, context);
  const window = context.window as WindowMock;
  if (pref !== null) window.localStorage.setItem('yt-player-av1-pref', pref);
  return { context, window };
}

type Reply = { ok: boolean; enabled?: boolean; error?: string };
type MessageHandler = (message: unknown, sender: { id: string; url: string; tab?: object }, reply: (response: Reply) => void) => boolean | void;

async function main(): Promise<void> {
  const { context, window } = sandbox('8192');
  vm.runInContext(read('src/force-av1.js'), context);
  for (const mime of ['video/mp4; codecs="av01.0.08M.08"', 'video/webm; codecs=av1', 'video/mp4; codecs=av01.0.08M.08']) {
    assert.equal(window.MediaSource.isTypeSupported(mime), true);
    assert.equal(new window.HTMLMediaElement().canPlayType(mime), 'probably');
    assert.equal((await window.navigator.mediaCapabilities.decodingInfo({ video: { contentType: mime } })).supported, true);
  }
  assert.equal(window.MediaSource.isTypeSupported('audio/mp4; codecs=av01'), false);
  assert.equal(window.MediaSource.isTypeSupported('video/mp4; codecs=avc1'), true);
  assert.equal((await window.navigator.mediaCapabilities.decodingInfo({ video: { contentType: 'video/mp4; codecs=avc1' } })).original, true);
  assert.equal(window.localStorage.getItem('yt-player-av1-pref'), '8192');
  assert.equal(window.localStorage.data.has('yt-player-av1-pref'), false, 'forced preference must not persist');
  window.localStorage.setItem('other', 'value');
  assert.equal(window.localStorage.getItem('other'), 'value');
  window.sessionStorage.setItem('yt-player-av1-pref', 'original');
  assert.equal(window.sessionStorage.getItem('yt-player-av1-pref'), 'original');
  vm.runInContext(read('src/force-av1.js'), context);
  for (const [initial, want] of [['8192', null], ['custom', 'custom'], [null, null]] as const) {
    const off = sandbox(initial);
    vm.runInContext(read('src/reset-av1.js'), off.context);
    assert.equal(off.window.localStorage.getItem('yt-player-av1-pref'), want);
    assert.equal(off.window.MediaSource.isTypeSupported('video/mp4; codecs=av01'), false);
  }

  let handler: MessageHandler | undefined;
  let registered: { js: string[] }[] = [];
  let settings: { enabled?: boolean } = {};
  let failure = false;
  const background = vm.createContext({ console, chrome: {
    runtime: {
      id: 'test', getURL: (p: string) => 'chrome-extension://test/' + p,
      getManifest: () => ({ host_permissions: ['https://www.youtube.com/*'] }),
      onInstalled: { addListener() {} }, onStartup: { addListener() {} },
      onMessage: { addListener: (f: MessageHandler) => { handler = f; } }
    },
    storage: { local: {
      get: async () => ({ ...settings }),
      set: async (value: { enabled: boolean }) => {
        if (failure) throw Error('storage failure');
        settings = { ...settings, ...value };
      }
    } },
    scripting: {
      getRegisteredContentScripts: async () => registered,
      registerContentScripts: async (scripts: { js: string[] }[]) => { registered = scripts; },
      updateContentScripts: async (scripts: { js: string[] }[]) => { registered = scripts; }
    }
  } });
  vm.runInContext(read('src/background.js'), background);
  assert.ok(handler, 'background message listener registered');
  const messageHandler: MessageHandler = handler;
  const send = (message: unknown): Promise<Reply> => new Promise(resolve =>
    messageHandler(message, { id: 'test', url: 'chrome-extension://test/popup/popup.html' }, resolve));
  assert.equal((await send({ type: 'get-settings' })).enabled, true);
  assert.equal(registered[0]?.js[0], 'src/force-av1.js');
  assert.equal((await send({ type: 'set-enabled', enabled: false })).enabled, false);
  assert.equal(registered[0]?.js[0], 'src/reset-av1.js');
  failure = true;
  assert.equal((await send({ type: 'set-enabled', enabled: true })).ok, false);
  assert.equal(registered[0]?.js[0], 'src/reset-av1.js');
  failure = false;
  await Promise.all([send({ type: 'set-enabled', enabled: true }), send({ type: 'set-enabled', enabled: false }), send({ type: 'set-enabled', enabled: true })]);
  assert.equal(settings.enabled, true);
  assert.equal(registered[0]?.js[0], 'src/force-av1.js');
  assert.equal(messageHandler({ type: 'set-enabled', enabled: false }, { id: 'test', url: 'https://www.youtube.com/', tab: {} }, () => {}), undefined);
  assert.equal(messageHandler(null, { id: 'test', url: 'chrome-extension://test/popup/popup.html' }, () => {}), undefined);
  assert.equal((await send({ type: 'set-enabled', enabled: 'false' })).ok, false);
  assert.equal(settings.enabled, true, 'invalid messages must not change the setting');
  console.log('PASS: AV1 codecs, storage cleanup, idempotency, registration, failed saves, rapid toggles, sender restrictions. VM fixtures.');
}
await main();
