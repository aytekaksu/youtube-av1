// Exercise the compiled popup without opening or controlling a browser.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = process.env.AV1_EXTENSION_ROOT ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(path.join(root, 'popup/popup.js'), 'utf8');
type State = {
  enabled: boolean; applied: boolean; fail: boolean; reloadFail: boolean;
  malformed: boolean; inspectFail: boolean; reloaded: number[]; closed: boolean;
  tab: { id?: number; url?: string } | null;
};

async function popup(options: Partial<State> = {}) {
  class Element {
    disabled = true;
    hidden = true;
    checked = false;
    textContent = '';
    title = '';
    events: Partial<Record<'change' | 'click', () => Promise<void>>> = {};
    addEventListener(name: 'change' | 'click', callback: () => Promise<void>): void {
      this.events[name] = callback;
    }
  }
  class Input extends Element {}
  class Button extends Element {}
  class Paragraph extends Element {}
  const elements = { enabled: new Input(), apply: new Button(), message: new Paragraph() };
  const state: State = {
    enabled: true, applied: true, fail: false, reloadFail: false,
    malformed: false, inspectFail: false, reloaded: [], closed: false,
    tab: { id: 42, url: 'https://www.youtube.com/watch?v=test' }, ...options
  };
  const context = vm.createContext({
    URL, console, HTMLInputElement: Input, HTMLButtonElement: Button, HTMLParagraphElement: Paragraph,
    document: { getElementById: (id: string) => elements[id as keyof typeof elements] },
    window: { close: () => { state.closed = true; } },
    chrome: {
      runtime: { sendMessage: async (request: { type: string; enabled?: boolean }) => {
        if (state.malformed) return { ok: true, enabled: 'false' };
        if (state.fail) return { ok: false, error: 'Could not save.' };
        if (request.type === 'set-enabled' && typeof request.enabled === 'boolean') state.enabled = request.enabled;
        return { ok: true, enabled: state.enabled };
      } },
      tabs: {
        query: async () => state.tab ? [state.tab] : [],
        reload: async (id: number) => {
          if (state.reloadFail) throw new Error('Reload failed');
          state.reloaded.push(id);
        }
      },
      scripting: { executeScript: async () => {
        if (state.inspectFail) throw new Error('Frame unavailable');
        return [{ result: state.applied }];
      } }
    }
  });
  vm.runInContext(source, context, { filename: 'popup.js' });
  // The popup initializes through promises; drain them without timers or browser UI.
  await new Promise<void>(resolve => setImmediate(resolve));
  return {
    state, ...elements,
    async toggle(value: boolean): Promise<void> {
      elements.enabled.checked = value;
      const change = elements.enabled.events.change;
      assert.ok(change);
      await change();
    },
    async reload(): Promise<void> {
      const click = elements.apply.events.click;
      assert.ok(click);
      await click();
    }
  };
}

const p = await popup();
assert.equal(p.enabled.disabled, false);
assert.equal(p.enabled.checked, true);
assert.equal(p.apply.disabled, true);
await p.toggle(false);
assert.equal(p.state.enabled, false);
assert.equal(p.apply.disabled, false);
const reopened = await popup({ enabled: false });
assert.equal(reopened.apply.disabled, false, 'pending changes survive closing the popup');
await p.toggle(true);
assert.equal(p.apply.disabled, true, 'reverting the switch removes the pending change');
p.state.fail = true;
await p.toggle(false);
assert.equal(p.enabled.checked, true, 'failed saves restore the switch');
assert.equal(p.message.hidden, false);
assert.equal(p.apply.disabled, true);
p.state.fail = false;
await p.toggle(false);
p.state.reloadFail = true;
await p.reload();
assert.equal(p.apply.disabled, false, 'a failed reload can be retried');
assert.equal(p.state.closed, false);
p.state.reloadFail = false;
await p.reload();
assert.deepEqual(p.state.reloaded, [42]);
assert.equal(p.apply.disabled, true);
assert.equal(p.state.closed, true);
for (const tab of [null, { url: 'https://www.youtube.com/watch?v=test' },
  { id: 7, url: 'https://example.com/' }, { id: 8, url: 'https://www.youtube.com/live_chat?v=test' }]) {
  const other = await popup({ tab });
  await other.toggle(false);
  assert.equal(other.apply.disabled, true);
  await other.reload();
  assert.deepEqual(other.state.reloaded, []);
}
const uninspected = await popup({ inspectFail: true });
await uninspected.toggle(false);
assert.equal(uninspected.apply.disabled, false);
const invalid = await popup({ malformed: true });
assert.equal(invalid.enabled.disabled, true);
assert.equal(invalid.message.hidden, false);
assert.equal(invalid.apply.disabled, true);
console.log('PASS: compiled popup settings, pending/reverted changes, save/reload failures, tab restrictions, malformed replies. Node fixtures; no browser opened.');
