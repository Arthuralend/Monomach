const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '../app/src/main/assets/os/js');
const source = f => fs.readFileSync(path.join(root, f), 'utf8');
test('Android text clipboard resolves concurrent requests by ID, propagates denial and preserves browser fallback', async () => {
  let receive; const requests = [];
  const navigator = { clipboard: { read: () => 'native-images' } };
  const window = { navigator };
  const FX = { has: () => true, on: (_, callback) => { receive = callback; }, call: (...args) => { requests.push(args); } };
  vm.runInNewContext(source('fx/clipboard.js'), { window, navigator, FX, setTimeout, clearTimeout, DOMException });
  const a = navigator.clipboard.readText(), b = navigator.clipboard.writeText('Привет 🌿');
  receive({ id: requests[1][1] }); receive({ id: requests[0][1], text: 'Android → WindowsFX' });
  assert.equal(await a, 'Android → WindowsFX'); assert.equal(await b, undefined);
  assert.equal(requests[1][3], 'Привет 🌿'); assert.equal(navigator.clipboard.read(), 'native-images');
  const c = navigator.clipboard.readText(); receive({ id: requests[2][1], error: 'No focus' });
  await assert.rejects(c, { name: 'NotAllowedError' });
  FX.has = () => false;
  const browser = { navigator: { clipboard: { readText: () => 'browser' } } };
  window.FXClipboard.install(browser); assert.equal(browser.navigator.clipboard.readText(), 'browser');
});
test('Opaque display leaves offscreen canvas alpha and premultiplication untouched', () => {
  class Canvas { constructor(connected) { this.isConnected = connected; } getContext(type, attrs) { return { type, attrs }; } }
  class GPU { constructor(canvas) { this.canvas = canvas; } configure(c) { return c; } }
  const s = source('fx/craft-frame.js');
  const begin = s.indexOf('  try {\n    var getCtx'); const end = s.indexOf('  document.documentElement.style.background');
  vm.runInNewContext(s.slice(begin,end), { HTMLCanvasElement: Canvas, window: { GPUCanvasContext: GPU }, GPUCanvasContext: GPU });
  const opts = { alpha: true, premultipliedAlpha: true };
  assert.equal(new Canvas(true).getContext('webgl2', opts).attrs.alpha, false);
  assert.equal(new Canvas(true).getContext('webgl2', opts).attrs.premultipliedAlpha, true);
  assert.equal(new Canvas(false).getContext('webgl2', opts).attrs, opts);
  assert.equal(opts.alpha, true);
  assert.equal(new GPU(new Canvas(true)).configure({ alphaMode: 'premultiplied' }).alphaMode, 'opaque');
  assert.equal(new GPU(new Canvas(false)).configure({ alphaMode: 'premultiplied' }).alphaMode, 'premultiplied');
});
